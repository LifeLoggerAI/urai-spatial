"use client";

import { useEffect, useRef } from "react";

type SpatialCue = {
  event?: string;
  position?: [number, number, number];
  tone?: string | null;
  symbolicWeight?: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function panFromPosition(position?: [number, number, number]) {
  if (!position) return 0;
  return clamp(position[0] / 80, -1, 1);
}

function gainForCue(cue: SpatialCue) {
  const weight = cue.symbolicWeight ?? "light";
  if (weight === "threshold") return 0.09;
  if (weight === "heavy") return 0.075;
  return 0.052;
}

function frequencyForCue(cue: SpatialCue) {
  const tone = cue.tone ?? "neutral";
  if (tone === "grief") return 118;
  if (tone === "tension" || tone === "charged") return 168;
  if (tone === "hope" || tone === "recovery") return 220;
  if (tone === "awe") return 196;
  return 144;
}

export default function SpatialAudioNarratorBridge() {
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ensureAudio = () => {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return null;

      if (!audioRef.current) audioRef.current = new AudioContextCtor();
      if (audioRef.current.state === "suspended") void audioRef.current.resume();
      return audioRef.current;
    };

    const playSpatialBreath = (cue: SpatialCue) => {
      const ctx = ensureAudio();
      if (!ctx) return;

      const pan = panFromPosition(cue.position);
      const gainAmount = gainForCue(cue);
      const frequency = frequencyForCue(cue);
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      const filter = ctx.createBiquadFilter();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + 1.6);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(520, now);
      filter.frequency.exponentialRampToValueAtTime(240, now + 1.6);

      panner.pan.setValueAtTime(pan, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainAmount, now + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.85);

      oscillator.connect(filter);
      filter.connect(panner);
      panner.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 1.9);
    };

    const handleNarrator = (event: Event) => {
      const detail = (event as CustomEvent<SpatialCue>).detail;
      if (!detail?.event) return;

      if (
        detail.event === "lifemap.star.select" ||
        detail.event === "narrator.focus.arrive" ||
        detail.event === "narrator.replay.begin"
      ) {
        playSpatialBreath(detail);
      }
    };

    // A narrator-silence event is a governed hold, not an audio cue.
    // MotionOrchestrator renders the visual silence state; this bridge intentionally
    // performs no AudioContext work so refusal/withdrawal/silence stay truly silent.
    const handleSilence = () => undefined;

    window.addEventListener("urai:narrator", handleNarrator);
    window.addEventListener("urai:narrator-silence", handleSilence);

    return () => {
      window.removeEventListener("urai:narrator", handleNarrator);
      window.removeEventListener("urai:narrator-silence", handleSilence);
      audioRef.current?.close();
      audioRef.current = null;
    };
  }, []);

  return null;
}
