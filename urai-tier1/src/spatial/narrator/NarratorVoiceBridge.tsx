"use client";

import { useEffect, useRef } from "react";

type NarratorVoiceDetail = {
  event?: string;
  script?: string;
  voice?: {
    mode?: "whisper" | "reflective" | "cinematic" | string;
    pace?: "slow" | "measured" | string;
    intensity?: "low" | "medium" | string;
  };
  timing?: {
    delayMs?: number;
    durationMs?: number;
    beat?: string;
  };
};

function voiceSettings(detail: NarratorVoiceDetail) {
  const mode = detail.voice?.mode ?? "reflective";
  const pace = detail.voice?.pace ?? "measured";
  const intensity = detail.voice?.intensity ?? "low";

  return {
    rate: pace === "slow" ? 0.82 : 0.92,
    pitch: mode === "whisper" ? 0.82 : mode === "cinematic" ? 0.92 : 1,
    volume: intensity === "medium" ? 0.88 : 0.68,
  };
}

function shouldSpeak(detail: NarratorVoiceDetail) {
  return Boolean(
    detail.script &&
      (detail.event === "narrator.focus.arrive" ||
        detail.event === "narrator.replay.begin" ||
        detail.event === "narrator.replay.pulse"),
  );
}

function wordIndexFromCharIndex(text: string, charIndex: number) {
  const before = text.slice(0, Math.max(0, charIndex));
  const trimmed = before.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export default function NarratorVoiceBridge() {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const handleNarrator = (event: Event) => {
      const detail = (event as CustomEvent<NarratorVoiceDetail>).detail;
      if (!shouldSpeak(detail)) return;

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      window.speechSynthesis.cancel();

      const delayMs = Math.max(0, detail.timing?.delayMs ?? 0);

      timeoutRef.current = window.setTimeout(() => {
        const script = detail.script ?? "";
        const utterance = new SpeechSynthesisUtterance(script);
        const settings = voiceSettings(detail);

        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;
        utterance.lang = "en-US";

        utterance.onboundary = (boundaryEvent) => {
          if (boundaryEvent.name && boundaryEvent.name !== "word") return;

          window.dispatchEvent(
            new CustomEvent("urai:narrator-boundary", {
              detail: {
                sourceEvent: detail.event,
                charIndex: boundaryEvent.charIndex,
                elapsedTime: boundaryEvent.elapsedTime,
                wordIndex: wordIndexFromCharIndex(script, boundaryEvent.charIndex),
                script,
              },
            }),
          );
        };

        utterance.onend = () => {
          window.dispatchEvent(
            new CustomEvent("urai:narrator-boundary", {
              detail: {
                sourceEvent: detail.event,
                completed: true,
                script,
              },
            }),
          );
        };

        window.speechSynthesis.speak(utterance);
      }, delayMs);
    };

    window.addEventListener("urai:narrator", handleNarrator);

    return () => {
      window.removeEventListener("urai:narrator", handleNarrator);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  return null;
}
