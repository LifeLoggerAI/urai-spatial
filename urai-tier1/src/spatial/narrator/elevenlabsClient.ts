import { getAuth } from "firebase/auth";
import { app, firebasePublicEnvReady } from "@/lib/firebase/client";
import type { NarratorLine } from "./narratorTypes";

const memoryCache = new Map<string, Blob>();

function hashLine(line: NarratorLine): string {
  const raw = JSON.stringify({ text: line.text ?? "", voiceId: line.voiceId ?? "", tone: line.tone ?? "" });
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `urai-narrator-${Math.abs(hash).toString(36)}`;
}

export async function requestNarratorAudio(
  line: NarratorLine,
  signal?: AbortSignal,
  externalProcessingConsent = false,
): Promise<Blob | null> {
  // Provider narration remains disabled until the current user explicitly opts
  // into sending this text to the configured external voice processor.
  if (!externalProcessingConsent || !firebasePublicEnvReady) return null;

  const user = getAuth(app).currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  if (!token) return null;

  const key = hashLine(line);
  const mem = memoryCache.get(key);
  if (mem) return mem;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch("/api/urai/narrator/elevenlabs", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
          text: line.text,
          voiceId: line.voiceId,
          tone: line.tone,
          externalProcessingConsent: true,
        }),
      });
      if (!res.ok) throw new Error(`Narrator audio request failed: ${res.status}`);
      const blob = await res.blob();
      memoryCache.set(key, blob);
      return blob;
    } catch (err) {
      if (signal?.aborted) return null;
      if (attempt === 2) {
        console.warn("[NARRATOR] ElevenLabs fallback", err);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }

  return null;
}
