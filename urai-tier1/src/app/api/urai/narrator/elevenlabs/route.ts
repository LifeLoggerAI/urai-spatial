import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseUser } from "@/lib/server/firebase-user";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16_384;
const MAX_TEXT_CHARS = 2_000;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 6;
const PROVIDER_TIMEOUT_MS = 15_000;

type Body = {
  text?: string;
  voiceId?: string;
  tone?: string;
  externalProcessingConsent?: boolean;
};

type RateWindow = { count: number; resetAt: number };
const rateWindows = new Map<string, RateWindow>();

function consumeRateLimit(userId: string, now = Date.now()): number | null {
  const current = rateWindows.get(userId);
  if (!current || current.resetAt <= now) {
    rateWindows.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return null;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return Math.max(1, Math.ceil((current.resetAt - now) / 1_000));
  }
  current.count += 1;
  if (rateWindows.size > 5_000) {
    for (const [key, value] of rateWindows) {
      if (value.resetAt <= now) rateWindows.delete(key);
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await verifyFirebaseUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const retryAfter = consumeRateLimit(userId);
    if (retryAfter !== null) {
      return NextResponse.json(
        { error: "Narrator request limit reached" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const body = (await req.json()) as Body;
    const text = String(body.text || "").trim();
    const voiceId = String(body.voiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID || "").trim();

    if (!text || !voiceId) {
      return NextResponse.json({ error: "Missing text or voiceId" }, { status: 400 });
    }
    if (text.length > MAX_TEXT_CHARS) {
      return NextResponse.json({ error: "Text exceeds maximum length" }, { status: 413 });
    }
    if (body.externalProcessingConsent !== true) {
      return NextResponse.json(
        { error: "External voice-processing consent is required" },
        { status: 403 },
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 503 });
    }

    const tone = body.tone || "calm";
    const stability = tone === "tension" ? 0.42 : tone === "grief" ? 0.58 : 0.66;
    const style = tone === "awe" ? 0.35 : tone === "recovery" ? 0.28 : 0.18;

    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
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
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "ElevenLabs request failed" }, { status: upstream.status || 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json({ error: "Narrator provider timed out" }, { status: 504 });
    }
    console.error("[NARRATOR] ElevenLabs route failure", error);
    return NextResponse.json({ error: "Narrator route failure" }, { status: 500 });
  }
}
