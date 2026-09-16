import { getAuth } from "firebase/auth";
import { app, firebasePublicEnvReady } from "@/lib/firebase/client";

export type FounderPerformanceMode =
  | "natural"
  | "neutral"
  | "warm"
  | "reflective"
  | "serious"
  | "curious"
  | "excited"
  | "quiet"
  | "reassuring"
  | "authoritative";

const MAX_MEMORY_CACHE_ENTRIES = 8;
const memoryCache = new Map<string, Blob>();

function cacheKey(text: string, mode: FounderPerformanceMode) {
  const raw = `${mode}:${text}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `urai-founder-voice-${Math.abs(hash).toString(36)}`;
}

function remember(key: string, blob: Blob) {
  memoryCache.delete(key);
  memoryCache.set(key, blob);
  while (memoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value as string | undefined;
    if (!oldest) break;
    memoryCache.delete(oldest);
  }
}

export async function requestFounderVoiceAudio(
  text: string,
  founderPerformanceMode: FounderPerformanceMode = "natural",
  signal?: AbortSignal,
  externalProcessingConsent = false,
): Promise<Blob | null> {
  const normalized = text.trim();
  if (!normalized || !externalProcessingConsent || !firebasePublicEnvReady || signal?.aborted) return null;

  const user = getAuth(app).currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  if (!token || signal?.aborted) return null;

  const key = cacheKey(normalized, founderPerformanceMode);
  const cached = memoryCache.get(key);
  if (cached) {
    memoryCache.delete(key);
    memoryCache.set(key, cached);
    return cached;
  }

  try {
    const response = await fetch("/api/urai/founder-voice/elevenlabs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal,
      body: JSON.stringify({
        text: normalized,
        founderPerformanceMode,
        externalProcessingConsent: true,
      }),
    });
    if (!response.ok || signal?.aborted) return null;
    const blob = await response.blob();
    if (!blob.size || signal?.aborted) return null;
    remember(key, blob);
    return blob;
  } catch {
    return null;
  }
}
