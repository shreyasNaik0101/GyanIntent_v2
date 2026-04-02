import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sarvam API key not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const languageHint = (formData.get("language") as string) || "";
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Re-create file with clean MIME type (browser sends "audio/webm;codecs=opus" which Sarvam rejects)
    const arrayBuffer = await audioFile.arrayBuffer();
    const cleanFile = new File([arrayBuffer], "recording.webm", { type: "audio/webm" });

    // Map language codes
    const LANG_MAP: Record<string, string> = { en: "en-IN", hi: "hi-IN", kn: "kn-IN", hinglish: "hi-IN" };

    // Forward to Sarvam STT API
    const sarvamForm = new FormData();
    sarvamForm.append("file", cleanFile);
    sarvamForm.append("model", "saarika:v2.5");
    if (languageHint && LANG_MAP[languageHint]) {
      sarvamForm.append("language_code", LANG_MAP[languageHint]);
    }

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: sarvamForm,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Sarvam STT error:", response.status, errText);
      return NextResponse.json({ error: "Speech recognition failed" }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({
      transcript: data.transcript || "",
      language: data.language_code || "unknown",
    });
  } catch (e: any) {
    console.error("STT error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
