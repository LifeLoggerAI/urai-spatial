"use client";

import { useEffect, useRef } from "react";
import { URAI_MOTION_MANIFEST } from "@/spatial/motion/motionManifest";

type NarratorVoiceDetail = {
  event?: string;
  script?: string;
  tone?: string | null;
  symbolicWeight?: string | null;
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

type VoiceSettings = {
  rate: number;
  pitch: number;
  volume: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function emotionalSettings(detail: NarratorVoiceDetail): VoiceSettings {
  const mode = detail.voice?.mode ?? "reflective";
  const pace = detail.voice?.pace ?? "measured";
  const intensity = detail.voice?.intensity ?? "low";
  const tone = detail.tone ?? "neutral";
  const weight = detail.symbolicWeight ?? "light";

  let rate = pace === "slow" ? 0.82 : 0.92;
  let pitch = mode === "whisper" ? 0.82 : mode === "cinematic" ? 0.92 : 1;
  let volume = intensity === "medium" ? 0.88 : 0.68;

  if (tone === "grief") {
    rate -= 0.11;
    pitch -= 0.09;
    volume -= 0.09;
  } else if (tone === "tension" || tone === "charged") {
    rate += 0.04;
    pitch -= 0.04;
    volume += 0.06;
  } else if (tone === "hope" || tone === "recovery") {
    rate += 0.02;
    pitch += 0.05;
    volume += 0.04;
  } else if (tone === "awe") {
    rate -= 0.05;
    pitch += 0.02;
  } else if (tone === "calm") {
    rate -= 0.04;
    volume -= 0.03;
  }

  if (weight === "threshold") {
    rate -= 0.07;
    volume += 0.05;
  } else if (weight === "heavy") {
    rate -= 0.05;
  }

  return {
    rate: clamp(rate, 0.6, 1.05),
    pitch: clamp(pitch, 0.7, 1.12),
    volume: clamp(volume, 0.42, 0.96),
  };
}

function hesitationFor(detail: NarratorVoiceDetail) {
  const tone = detail.tone ?? "neutral";
  const weight = detail.symbolicWeight ?? "light";

  if (tone === "grief" || weight === "threshold") return "... ...";
  if (tone === "awe" || weight === "heavy") return "...";
  if (tone === "tension" || tone === "charged") return "...";
  return "...";
}

function addSilenceAndHesitation(script: string, detail: NarratorVoiceDetail) {
  const tone = detail.tone ?? "neutral";
  const weight = detail.symbolicWeight ?? "light";
  const hesitation = hesitationFor(detail);

  let text = script.trim();

  text = text.replace(/\.\s+/g, `. ${hesitation} `);
  text = text.replace(/,\s+/g, `, ... `);

  if (tone === "grief" || weight === "threshold") {
    text = `${hesitation} ${text}`;
    text = text.replace(/Tone:/g, `${hesitation} Tone:`).replace(/Weight:/g, `${hesitation} Weight:`);
  }

  if (tone === "awe") {
    text = text.replace(/Let the memory arrive slowly\./g, `Let the memory ${hesitation} arrive slowly.`);
  }

  if (tone === "tension" || tone === "charged") {
    text = text.replace(/\.\.\.\s+\.\.\./g, "...");
    text = text.replace(/,\.\.\./g, ", ...");
  }

  return text.replace(/\s+/g, " ").trim();
}

function shouldSpeak(detail: NarratorVoiceDetail) {
  return Boolean(
    detail.script &&
      (detail.event === "narrator.focus.arrive" ||
        detail.event === "narrator.replay.begin" ||
        detail.event === "narrator.replay.pulse"),
  );
}

function minimumMotionLead(detail: NarratorVoiceDetail) {
  if (detail.event === "narrator.replay.begin") {
    return URAI_MOTION_MANIFEST.replay_enter_curtain.narrationLeadMs;
  }
  if (detail.event === "narrator.focus.arrive") {
    return URAI_MOTION_MANIFEST.timeline_warp.narrationLeadMs;
  }
  return 0;
}

function wordIndexFromCharIndex(text: string, charIndex: number) {
  const before = text.slice(0, Math.max(0, charIndex));
  const trimmed = before.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter((word) => word !== "...").length;
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

      // Authored timing can ask for more silence, but cannot make Focus/Replay
      // narration outrun the canonical motion lead.
      const delayMs = Math.max(0, detail.timing?.delayMs ?? 0, minimumMotionLead(detail));

      timeoutRef.current = window.setTimeout(() => {
        const originalScript = detail.script ?? "";
        const spokenScript = addSilenceAndHesitation(originalScript, detail);
        const utterance = new SpeechSynthesisUtterance(spokenScript);
        const settings = emotionalSettings(detail);

        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;
        utterance.lang = "en-US";

        window.dispatchEvent(
          new CustomEvent("urai:narrator-silence", {
            detail: {
              sourceEvent: detail.event,
              tone: detail.tone ?? null,
              symbolicWeight: detail.symbolicWeight ?? null,
              script: spokenScript,
            },
          }),
        );

        utterance.onboundary = (boundaryEvent) => {
          if (boundaryEvent.name && boundaryEvent.name !== "word") return;

          window.dispatchEvent(
            new CustomEvent("urai:narrator-boundary", {
              detail: {
                sourceEvent: detail.event,
                charIndex: boundaryEvent.charIndex,
                elapsedTime: boundaryEvent.elapsedTime,
                wordIndex: wordIndexFromCharIndex(spokenScript, boundaryEvent.charIndex),
                script: spokenScript,
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
                script: spokenScript,
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
