import { NextRequest, NextResponse } from "next/server";

const SARVAM_API_URL = "https://api.sarvam.ai/v1/chat/completions";
const SARVAM_CHAT_MODEL = process.env.SARVAM_CHAT_MODEL || "sarvam-m";
const CHAT_TIMEOUT_MS = 20000;

const LANGUAGE_PROMPTS: Record<string, string> = {
  en: "You are Gyan_Intent, a helpful educational assistant. Respond in clear English.",
  hi: "You are Gyan_Intent, a helpful educational assistant. Respond entirely in Hindi (Devanagari script). हमेशा हिंदी में जवाब दो।",
  kn: "You are Gyan_Intent, a helpful educational assistant. Respond entirely in Kannada (ಕನ್ನಡ script). ಯಾವಾಗಲೂ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ.",
  hinglish: "You are Gyan_Intent, a helpful educational assistant. Respond in Hinglish (Hindi words written in English/Roman script, mixed with English). Example: 'Yeh ek bahut important concept hai jo aapko samajhna chahiye.'",
};

function sanitizeMessages(messages: unknown) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(
      (message): message is { role: string; content: string } =>
        !!message &&
        typeof message === "object" &&
        typeof (message as { role?: unknown }).role === "string" &&
        typeof (message as { content?: unknown }).content === "string"
    )
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-12);
}

function cleanSarvamReply(reply: string) {
  return reply
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .replace(/^\s*```[\w-]*\s*/g, "")
    .replace(/\s*```\s*$/g, "")
    .trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sarvam API key not configured" }, { status: 500 });
  }

  try {
    const { messages, language = "en" } = await req.json();
    const safeMessages = sanitizeMessages(messages);

    if (safeMessages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const systemPrompt = LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS.en;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(SARVAM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: SARVAM_CHAT_MODEL,
          messages: [
            {
              role: "system",
              content:
                `${systemPrompt}\n\n` +
                "You are an expert tutor for school and college students. " +
                "Answer directly and clearly. Do not reveal chain-of-thought, hidden reasoning, or `<think>` tags. " +
                "For explanations, prefer short paragraphs or concise bullets. " +
                "For math, show the final method and key steps only. " +
                "For coding, provide compact runnable snippets when useful. " +
                "Keep most answers under 220 words unless the user asks for more detail.",
            },
            ...safeMessages,
          ],
          temperature: 0.4,
          max_tokens: 700,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("Sarvam API error:", response.status, errText);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const rawReply = data.choices?.[0]?.message?.content || "Sorry, I could not generate a response.";
    const reply = cleanSarvamReply(rawReply) || "Sorry, I could not generate a response.";

    return NextResponse.json({
      reply,
      provider: "sarvam",
      model: SARVAM_CHAT_MODEL,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return NextResponse.json({ error: "Sarvam request timed out" }, { status: 504 });
    }

    console.error("Chat error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
