"use client";

import { useRef, useState } from "react";

export default function useAudioReactivity() {
  const [enabled, setEnabled] = useState(false);
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();

      analyser.fftSize = 256;
      src.connect(analyser);

      analyserRef.current = analyser;
      setEnabled(true);

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setLevel(avg / 255);
        requestAnimationFrame(tick);
      };

      tick();
    } catch {
      setEnabled(false);
    }
  };

  const stop = () => {
    setEnabled(false);
    analyserRef.current = null;
    setLevel(0);
  };

  return { enabled, level, start, stop };
}
