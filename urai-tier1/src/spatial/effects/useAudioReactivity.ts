"use client";

import { useCallback, useRef, useState } from "react";

export default function useAudioReactivity() {
  const [enabled, setEnabled] = useState(false);
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    setEnabled(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    try {
      if (rafRef.current !== null) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();

      analyser.fftSize = 256;
      src.connect(analyser);

      streamRef.current = stream;
      analyserRef.current = analyser;
      setEnabled(true);

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        const activeAnalyser = analyserRef.current;
        if (!activeAnalyser) {
          rafRef.current = null;
          return;
        }

        activeAnalyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const nextLevel = avg / 255;

        setLevel((prev) => (Math.abs(prev - nextLevel) > 0.025 ? nextLevel : prev));
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      stop();
    }
  }, [stop]);

  return { enabled, level, start, stop };
}
