"use client";

import { useEffect, useRef } from "react";

type NarratorCue = {
  event?: string;
  script?: string;
  tone?: string | null;
  symbolicWeight?: string | null;
  timing?: {
    delayMs?: number;
    durationMs?: number;
  };
};

function shouldWhisper(cue: NarratorCue) {
  return Boolean(
    cue.script &&
      (cue.event === "narrator.focus.arrive" ||
        cue.event === "narrator.replay.begin" ||
        cue.event === "narrator.replay.pulse"),
  );
}

function innerScript(cue: NarratorCue) {
  const tone = cue.tone ?? "quiet";
  const weight = cue.symbolicWeight ?? "subtle";

  if (cue.event === "narrator.replay.begin") {
    return `beneath it... ${tone}. ${weight}. stay close.`;
  }

  return `notice the pull... ${tone}. ${weight}.`;
}

function voiceParams(cue: NarratorCue) {
  const tone = cue.tone ?? "neutral";
  const weight = cue.symbolicWeight ?? "light";

  let rate = 0.68;
  let pitch = 0.72;
  let volume = 0.24;

  if (tone === "grief") {
    rate = 0.58;
    pitch = 0.66;
    volume = 0.2;
  } else if (tone === "hope" || tone === "recovery") {
    rate = 0.72;
    pitch = 0.82;
    volume = 0.22;
  } else if (tone === "tension" || tone === "charged") {
    rate = 0.76;
    pitch = 0.7;
    volume = 0.26;
  }

  if (weight === "threshold" || weight === "heavy") {
    volume += 0.04;
    rate -= 0.04;
  }

  return { rate, pitch, volume };
}

export default function DualLayerNarratorBridge() {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const handleNarrator = (event: Event) => {
      const cue = (event as CustomEvent<NarratorCue>).detail;
      if (!shouldWhisper(cue)) return;

      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);

      const delay = Math.max(0, (cue.timing?.delayMs ?? 0) + 720);

      timeoutRef.current = window.setTimeout(() => {
        const whisper = new SpeechSynthesisUtterance(innerScript(cue));
        const params = voiceParams(cue);

        whisper.rate = params.rate;
        whisper.pitch = params.pitch;
        whisper.volume = params.volume;
        whisper.lang = "en-US";

        window.speechSynthesis.speak(whisper);

        window.dispatchEvent(
          new CustomEvent("urai:narrator-inner-voice", {
            detail: {
              sourceEvent: cue.event,
              tone: cue.tone ?? null,
              symbolicWeight: cue.symbolicWeight ?? null,
              script: innerScript(cue),
            },
          }),
        );
      }, delay);
    };

    window.addEventListener("urai:narrator", handleNarrator);

    return () => {
      window.removeEventListener("urai:narrator", handleNarrator);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return null;
}
