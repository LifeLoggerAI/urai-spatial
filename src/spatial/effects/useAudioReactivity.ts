"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AudioReactivity = {
  audioLevel: number;
  bassLevel: number;
  trebleLevel: number;
  enabled: boolean;
  listening: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

const ZERO = { audioLevel: 0, bassLevel: 0, trebleLevel: 0 };

type AudioRefs = {
  context?: AudioContext;
  analyser?: AnalyserNode;
  stream?: MediaStream;
  source?: MediaStreamAudioSourceNode;
  frame?: number;
};

export function useAudioReactivity(): AudioReactivity {
  const refs = useRef<AudioRefs>({});
  const [levels, setLevels] = useState(ZERO);
  const [enabled, setEnabled] = useState(false);
  const [listening, setListening] = useState(false);

  const stop = useCallback(() => {
    const current = refs.current;
    if (current.frame) cancelAnimationFrame(current.frame);
    current.stream?.getTracks().forEach((track) => track.stop());
    current.source?.disconnect();
    current.analyser?.disconnect();
    if (current.context && current.context.state !== "closed") {
      void current.context.close().catch(() => undefined);
    }
    refs.current = {};
    setListening(false);
    setLevels(ZERO);
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined" || listening) return;
    const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor || !navigator.mediaDevices?.getUserMedia) {
      setEnabled(false);
      setListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const context = new AudioCtor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      refs.current = { context, analyser, stream, source };
      setEnabled(true);
      setListening(true);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let total = 0;
        let bass = 0;
        let treble = 0;
        const bassBins = Math.max(1, Math.floor(data.length * 0.18));
        const trebleStart = Math.floor(data.length * 0.62);

        for (let i = 0; i < data.length; i += 1) {
          const value = data[i] / 255;
          total += value;
          if (i < bassBins) bass += value;
          if (i >= trebleStart) treble += value;
        }

        setLevels({
          audioLevel: Math.min(1, total / data.length),
          bassLevel: Math.min(1, bass / bassBins),
          trebleLevel: Math.min(1, treble / Math.max(1, data.length - trebleStart)),
        });

        refs.current.frame = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      stop();
      setEnabled(false);
      setListening(false);
    }
  }, [listening, stop]);

  useEffect(() => stop, [stop]);

  return { ...levels, enabled, listening, start, stop };
}
