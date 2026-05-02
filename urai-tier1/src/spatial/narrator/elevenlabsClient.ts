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
