"use client";

import { useEffect, useMemo, useState } from "react";

export type DepthParallax = {
  x: number;
  y: number;
  depth: number;
  skyTransform: string;
  orbTransform: string;
  bodyTransform: string;
  groundTransform: string;
  navTransform: string;
};

const STILL: DepthParallax = {
  x: 0,
  y: 0,
  depth: 0,
  skyTransform: "translate3d(0px, 0px, 0px)",
  orbTransform: "translate3d(0px, 0px, 0px)",
  bodyTransform: "translate3d(0px, 0px, 0px)",
  groundTransform: "translate3d(0px, 0px, 0px)",
  navTransform: "translate3d(0px, 0px, 0px)",
};

function clamp(value: number, min = -1, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function toTransform(x: number, y: number, depth: number, amount: number) {
  return `translate3d(${(x * amount).toFixed(2)}px, ${(y * amount).toFixed(2)}px, ${(depth * amount).toFixed(2)}px)`;
}

function getReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useDepthParallax(options: { enabled?: boolean; deviceOrientation?: boolean } = {}): DepthParallax {
  const { enabled = true, deviceOrientation = true } = options;
  const [reducedMotion, setReducedMotion] = useState(true);
  const [vector, setVector] = useState({ x: 0, y: 0, depth: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled || reducedMotion || typeof window === "undefined") return;

    let raf = 0;
    let next = { x: 0, y: 0, depth: 0 };

    const commit = () => {
      raf = 0;
      setVector((current) => ({
        x: current.x + (next.x - current.x) * 0.22,
        y: current.y + (next.y - current.y) * 0.22,
        depth: current.depth + (next.depth - current.depth) * 0.18,
      }));
    };

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(commit);
    };

    const onPointerMove = (event: PointerEvent) => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const x = clamp((event.clientX / width - 0.5) * 2);
      const y = clamp((event.clientY / height - 0.5) * 2);
      next = { x, y, depth: clamp(Math.hypot(x, y) / Math.SQRT2, 0, 1) };
      schedule();
    };

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (!deviceOrientation) return;
      const gamma = typeof event.gamma === "number" ? event.gamma : 0;
      const beta = typeof event.beta === "number" ? event.beta : 0;
      const x = clamp(gamma / 35);
      const y = clamp((beta - 35) / 45);
      next = { x, y, depth: clamp(Math.hypot(x, y) / Math.SQRT2, 0, 1) };
      schedule();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("deviceorientation", onOrientation, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("deviceorientation", onOrientation);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [deviceOrientation, enabled, reducedMotion]);

  return useMemo(() => {
    if (!enabled || reducedMotion) return STILL;
    const x = clamp(vector.x);
    const y = clamp(vector.y);
    const depth = clamp(vector.depth, 0, 1);
    return {
      x,
      y,
      depth,
      skyTransform: toTransform(-x, -y, depth, 10),
      orbTransform: toTransform(x, y, depth, 6),
      bodyTransform: toTransform(x, y, depth, 4),
      groundTransform: toTransform(-x, -y, depth, 3),
      navTransform: toTransform(x, y, depth, 2),
    };
  }, [enabled, reducedMotion, vector]);
}

export function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(getReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return reducedMotion;
}
