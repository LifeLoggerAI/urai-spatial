"use client";

import { useEffect, useState } from "react";

export type DepthParallax = {
  x: number;
  y: number;
  gyroX: number;
  gyroY: number;
  reducedMotion: boolean;
};

export default function useDepthParallax(): DepthParallax {
  const [state, setState] = useState<DepthParallax>({
    x: 0,
    y: 0,
    gyroX: 0,
    gyroY: 0,
    reducedMotion: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => {
      setState((current) => ({ ...current, reducedMotion: media.matches }));
    };

    const handlePointer = (event: PointerEvent) => {
      if (media.matches) return;
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setState((current) => ({ ...current, x, y }));
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (media.matches) return;
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;
      setState((current) => ({
        ...current,
        gyroX: Math.max(-1, Math.min(1, gamma / 35)),
        gyroY: Math.max(-1, Math.min(1, beta / 45)),
      }));
    };

    applyMotion();
    media.addEventListener("change", applyMotion);
    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("deviceorientation", handleOrientation, { passive: true });

    return () => {
      media.removeEventListener("change", applyMotion);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  if (state.reducedMotion) {
    return { ...state, x: 0, y: 0, gyroX: 0, gyroY: 0 };
  }

  return state;
}
