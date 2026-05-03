import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  text?: string;
  voiceId?: string;
  tone?: string;
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 503 });
    }

    const body = (await req.json()) as Body;
    const text = String(body.text || "").trim();
    const voiceId = String(body.voiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID || "").trim();

    if (!text || !voiceId) {
      return NextResponse.json({ error: "Missing text or voiceId" }, { status: 400 });
    }

    const tone = body.tone || "calm";
    const stability = tone === "tension" ? 0.42 : tone === "grief" ? 0.58 : 0.66;
    const style = tone === "awe" ? 0.35 : tone === "recovery" ? 0.28 : 0.18;

    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
        voice_settings: {
          stability,
          similarity_boost: 0.78,
          style,
          use_speaker_boost: true,
        },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "ElevenLabs request failed" }, { status: upstream.status || 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[NARRATOR] ElevenLabs route failure", err);
    return NextResponse.json({ error: "Narrator route failure" }, { status: 500 });
  }
}
