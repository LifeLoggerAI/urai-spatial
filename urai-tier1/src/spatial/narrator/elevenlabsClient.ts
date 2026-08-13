import { getAuth } from "firebase/auth";
import { app, firebasePublicEnvReady } from "@/lib/firebase/client";
import type { NarratorLine } from "./narratorTypes";

export type ExternalVoiceRequest = Pick<NarratorLine, "text" | "voiceId" | "tone">;

const MAX_MEMORY_CACHE_ENTRIES = 12;
const memoryCache = new Map<string, Blob>();

function hashLine(line: ExternalVoiceRequest): string {
  const raw = JSON.stringify({ text: line.text ?? "", voiceId: line.voiceId ?? "", tone: line.tone ?? "" });
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `urai-narrator-${Math.abs(hash).toString(36)}`;
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

export async function requestExternalVoiceAudio(
  line: ExternalVoiceRequest,
  signal?: AbortSignal,
  externalProcessingConsent = false,
): Promise<Blob | null> {
  if (!externalProcessingConsent || !firebasePublicEnvReady || signal?.aborted) return null;

  const user = getAuth(app).currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  if (!token || signal?.aborted) return null;

  const key = hashLine(line);
  const cached = memoryCache.get(key);
  if (cached) {
    memoryCache.delete(key);
    memoryCache.set(key, cached);
    return cached;
  }

  try {
    const res = await fetch("/api/urai/narrator/elevenlabs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal,
      body: JSON.stringify({
        text: line.text,
        voiceId: line.voiceId,
        tone: line.tone,
        externalProcessingConsent: true,
      }),
    });
    if (!res.ok || signal?.aborted) return null;
    const blob = await res.blob();
    if (!blob.size || signal?.aborted) return null;
    remember(key, blob);
    return blob;
  } catch {
    return null;
  }
}

export async function requestNarratorAudio(
  line: NarratorLine,
  signal?: AbortSignal,
  externalProcessingConsent = false,
): Promise<Blob | null> {
  return requestExternalVoiceAudio(line, signal, externalProcessingConsent);
}
