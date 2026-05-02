"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useAudioController } from "../audio/useAudioController";
import { narratorPlayback } from "../narrator/narratorPlayback";

type OverlayLine = {
  id?: string;
  moment?: string;
  text: string;
  tone?: string;
  priority?: number;
  delayMs?: number;
  durationMs?: number;
  voiceId?: string;
  interruptible?: boolean;
};

type Props = {
  phase?: string;
  line?: OverlayLine | null;
};

export function NarratorOverlay({ phase = "HOME", line: externalLine = null }: Props) {
  const uraiNarratorAudio = useAudioController();

  React.useEffect(() => {
    const anyProps = arguments?.[0] as any;
    const line = anyProps?.line ?? anyProps?.activeLine ?? anyProps?.narratorLine;
    if (!line?.id || !line?.text) return;

    uraiNarratorAudio.speak({
      id: line.id,
      text: line.text,
      phase: anyProps?.phase,
      tone: line.tone,
      voiceHint: line.voiceHint,
    });
  }, [uraiNarratorAudio]);

  const [line, setLine] = useState<OverlayLine | null>(externalLine);
  const [visible, setVisible] = useState(Boolean(externalLine));

  useEffect(() => {
    setLine(externalLine);
    setVisible(Boolean(externalLine));
  }, [externalLine]);

  useEffect(() => {
    const unsubscribe = narratorPlayback.subscribe((nextLine, nextVisible) => {
      if (externalLine) return;
      setLine(nextLine);
      setVisible(nextVisible);
    });

    return () => {
      unsubscribe();
    };
  }, [externalLine]);

  if (!line?.text) return null;

  const placement =
    phase === "HOME"
      ? "bottom-8 left-1/2 -translate-x-1/2 text-center"
      : phase === "LIFEMAP"
        ? "bottom-10 left-1/2 -translate-x-1/2 text-center"
        : phase === "FOCUS"
          ? "bottom-14 right-8 max-w-md text-right"
          : phase === "REPLAY"
            ? "bottom-12 left-1/2 -translate-x-1/2 text-center"
            : "bottom-8 left-1/2 -translate-x-1/2 text-center";

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none absolute z-50 ${placement} transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      <div className="rounded-2xl border border-white/15 bg-black/35 px-5 py-3 text-sm tracking-wide text-white/90 shadow-2xl backdrop-blur-md">
        {line.text}
      </div>
    </div>
  );
}
