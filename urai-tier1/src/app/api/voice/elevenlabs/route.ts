import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseUser } from "@/lib/server/firebase-user";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16_384;
const MAX_TEXT_CHARS = 2_000;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 6;
const PROVIDER_TIMEOUT_MS = 15_000;

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
        { error: "Voice request limit reached" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }

    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const externalProcessingConsent = body?.externalProcessingConsent === true;

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    if (text.length > MAX_TEXT_CHARS) {
      return NextResponse.json({ error: "Text exceeds maximum length" }, { status: 413 });
    }

    if (!externalProcessingConsent) {
      return NextResponse.json(
        { error: "External voice-processing consent is required" },
        { status: 403 },
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId =
      process.env.ELEVENLABS_VOICE_ID ||
      process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID;

    if (!apiKey || !voiceId) {
      return NextResponse.json(
        { error: "ElevenLabs not configured" },
        { status: 503 },
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.58,
            similarity_boost: 0.76,
            style: 0.22,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      },
    );

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: "ElevenLabs request failed" },
        { status: 502 },
      );
    }

    const audio = await response.arrayBuffer();

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return NextResponse.json({ error: "Voice provider timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: "Voice route failed" }, { status: 500 });
  }
}
