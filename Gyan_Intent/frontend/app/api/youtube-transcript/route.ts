import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace("www.", "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }

    if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      const vParam = url.searchParams.get("v");
      if (vParam && /^[A-Za-z0-9_-]{11}$/.test(vParam)) return vParam;

      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["shorts", "embed", "live"].includes(parts[0])) {
        if (/^[A-Za-z0-9_-]{11}$/.test(parts[1])) return parts[1];
      }
    }
  } catch {
    /* not a URL */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fetch transcript via FastAPI backend (works on Vercel / serverless)
// ---------------------------------------------------------------------------

type Segment = { text: string; start: number; duration: number };

async function fetchTranscriptViaBackend(
  videoId: string,
  languages: string[],
  preserveFormatting: boolean,
): Promise<{ segments: Segment[]; language: string; transcript: string; title: string }> {
  const res = await fetch(`${BACKEND_URL}/api/v1/transcript`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_url_or_id: videoId,
      languages: languages.length ? languages : undefined,
      preserve_formatting: preserveFormatting,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Backend error" }));
    throw new Error(err.detail || err.error || `Backend returned ${res.status}`);
  }

  const data = await res.json();

  // Fetch the video title from YouTube oembed
  let title = videoId;
  try {
    const metaRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      title = meta.title || videoId;
    }
  } catch {
    /* title is optional */
  }

  return {
    segments: data.segments || [],
    language: data.language || "en",
    transcript: data.transcript || "",
    title,
  };
}

// ---------------------------------------------------------------------------
// Generate AI summary using OpenAI
// ---------------------------------------------------------------------------

async function generateSummary(
  transcript: string,
  title: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";

  try {
    const truncated = transcript.slice(0, 12000);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful educational assistant. Summarize the following YouTube video transcript clearly and concisely. Include key points, main topics covered, and any important takeaways. Use bullet points where appropriate. Keep it under 300 words.",
          },
          {
            role: "user",
            content: `Video Title: ${title}\n\nTranscript:\n${truncated}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!res.ok) return "";

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { video_url_or_id, languages } = body as {
      video_url_or_id?: string;
      languages?: string[];
      preserve_formatting?: boolean;
    };

    if (!video_url_or_id || !video_url_or_id.trim()) {
      return NextResponse.json(
        { error: "video_url_or_id is required" },
        { status: 400 },
      );
    }

    const videoId = extractVideoId(video_url_or_id);
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL or video ID." },
        { status: 422 },
      );
    }

    const preferredLangs = languages?.length ? languages : ["en"];
    const preserveFormatting = body.preserve_formatting ?? false;

    const { segments, language, transcript, title } = await fetchTranscriptViaBackend(
      videoId,
      preferredLangs,
      preserveFormatting,
    );

    if (segments.length === 0) {
      return NextResponse.json(
        { error: "No transcript segments found for this video." },
        { status: 404 },
      );
    }

    // Generate AI summary
    const summary = await generateSummary(transcript, title);

    return NextResponse.json({
      video_id: videoId,
      title,
      language,
      transcript,
      summary,
      segments,
    });
  } catch (err: any) {
    console.error("YouTube transcript error:", err);
    const msg = err?.message || "Failed to fetch transcript";

    if (msg.includes("NoTranscriptFound") || msg.includes("No transcripts")) {
      return NextResponse.json(
        { error: "No transcript found for this video in the requested languages." },
        { status: 404 },
      );
    }
    if (msg.includes("TranscriptsDisabled")) {
      return NextResponse.json(
        { error: "Transcripts are disabled for this video." },
        { status: 404 },
      );
    }
    if (msg.includes("VideoUnavailable")) {
      return NextResponse.json(
        { error: "This video is unavailable." },
        { status: 404 },
      );
    }

    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
