#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d_%H%M%S)"
AUDIT="_audit/${TS}_final_narrator_audio_cache_hook"
mkdir -p "$AUDIT"

CLIENT="src/spatial/narrator/elevenlabsClient.ts"
PLAYBACK="src/spatial/narrator/narratorPlayback.ts"

[ -f "$CLIENT" ] || { echo "[FAIL] Missing $CLIENT"; exit 1; }
[ -f "$PLAYBACK" ] || { echo "[FAIL] Missing $PLAYBACK"; exit 1; }

cp "$CLIENT" "$AUDIT/elevenlabsClient.ts.bak"
cp "$PLAYBACK" "$AUDIT/narratorPlayback.ts.bak"

cat > "$CLIENT" <<'TS'
import type { NarratorLine } from "./narratorTypes";

const memoryCache = new Map<string, Blob>();

function hashLine(line: NarratorLine): string {
  const raw = `${line.voiceId}|${line.tone}|${line.text}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `urai_narrator_${Math.abs(hash)}`;
}

async function blobFromCache(key: string): Promise<Blob | null> {
  if (typeof caches === "undefined") return null;
  const cache = await caches.open("urai-narrator-audio-v1");
  const match = await cache.match(key);
  return match ? await match.blob() : null;
}

async function saveBlobToCache(key: string, blob: Blob): Promise<void> {
  if (typeof caches === "undefined") return;
  const cache = await caches.open("urai-narrator-audio-v1");
  await cache.put(key, new Response(blob, { headers: { "Content-Type": "audio/mpeg" } }));
}

export async function requestNarratorAudio(line: NarratorLine, signal?: AbortSignal): Promise<Blob | null> {
  const key = hashLine(line);

  const mem = memoryCache.get(key);
  if (mem) return mem;

  const cached = await blobFromCache(key);
  if (cached) {
    memoryCache.set(key, cached);
    console.info("[NARRATOR] audio cache hit:", key);
    return cached;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch("/api/urai/narrator/elevenlabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          text: line.text,
          voiceId: line.voiceId,
          tone: line.tone,
        }),
      });

      if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}`);

      const blob = await res.blob();
      memoryCache.set(key, blob);
      await saveBlobToCache(key, blob);

      console.info("[NARRATOR] audio cached:", key);
      return blob;
    } catch (err) {
      if (signal?.aborted) return null;
      if (attempt === 2) {
        console.warn("[NARRATOR] ElevenLabs failed; fallback enabled", err);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }

  return null;
}
TS

node <<'NODE'
const fs = require("fs");
const file = "src/spatial/narrator/narratorPlayback.ts";
let s = fs.readFileSync(file, "utf8");

if (!s.includes("private activeObjectUrl")) {
  s = s.replace(
    "private audio: HTMLAudioElement | null = null;",
    "private audio: HTMLAudioElement | null = null;\n  private activeObjectUrl: string | null = null;"
  );
}

if (!s.includes("URL.revokeObjectURL(this.activeObjectUrl)")) {
  s = s.replace(
`if (this.audio) {
      console.info("[NARRATOR] interrupt:", reason);
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = "";
      this.audio = null;
    }`,
`if (this.audio) {
      console.info("[NARRATOR] interrupt:", reason);
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = "";
      this.audio = null;
    }

    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }`
  );
}

s = s.replace(
`const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.audio = audio;`,
`const url = URL.createObjectURL(blob);
      this.activeObjectUrl = url;
      const audio = new Audio(url);
      this.audio = audio;`
);

s = s.replace(
`audio.onended = () => {
        URL.revokeObjectURL(url);
        this.emit(null, false);
      };`,
`audio.onended = () => {
        if (this.activeObjectUrl) {
          URL.revokeObjectURL(this.activeObjectUrl);
          this.activeObjectUrl = null;
        }
        this.audio = null;
        this.emit(null, false);
      };`
);

s = s.replace(
`audio.onerror = () => {
        URL.revokeObjectURL(url);
        this.fallbackSpeech(line);
      };`,
`audio.onerror = () => {
        if (this.activeObjectUrl) {
          URL.revokeObjectURL(this.activeObjectUrl);
          this.activeObjectUrl = null;
        }
        this.audio = null;
        this.fallbackSpeech(line);
      };`
);

fs.writeFileSync(file, s);
NODE

pnpm typecheck
pnpm build

echo "[PASS] FINAL NARRATOR AUDIO CACHING + PLAYBACK HOOK LOCKED"
echo "[AUDIT] $AUDIT"
