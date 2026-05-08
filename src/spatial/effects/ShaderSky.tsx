"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./useDepthParallax";

export type ShaderSkyProps = {
  phase: string;
  mood?: string;
  parallax?: { x: number; y: number; depth: number };
  intensity?: number;
};

export default function ShaderSky({
  phase,
  mood = "calm",
  parallax,
  intensity = 1,
}: ShaderSkyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const render = () => {
      frame += reducedMotion ? 0 : 0.0035;

      const width = canvas.width;
      const height = canvas.height;
      const driftX = (parallax?.x ?? 0) * 18;
      const driftY = (parallax?.y ?? 0) * 12;

      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, mood === "intense" ? "#02040a" : "#06111f");
      gradient.addColorStop(1, "#14091f");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 4; i += 1) {
        const radius = width * (0.15 + i * 0.08);
        const x = width * (0.25 + i * 0.16) + Math.sin(frame + i) * 50 + driftX;
        const y = height * (0.22 + i * 0.12) + Math.cos(frame + i * 0.4) * 30 + driftY;

        const nebula = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
        nebula.addColorStop(0, `rgba(103,196,255,${0.12 * intensity})`);
        nebula.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = nebula;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const starRush = phase === "ASCENT" ? 2.4 : 1;

      for (let i = 0; i < 180; i += 1) {
        const seed = i * 9973;
        const sx = ((Math.sin(seed) + 1) / 2) * width;
        const sy = ((Math.cos(seed * 0.37 + frame * starRush) + 1) / 2) * height;
        const size = 0.6 + (((seed % 17) / 17) * 1.8);

        ctx.fillStyle = `rgba(255,255,255,${0.18 + ((seed % 11) / 11) * 0.7})`;

        if (phase === "ASCENT") {
          ctx.fillRect(sx + driftX, sy + driftY, size * 0.7, size * 8);
        } else {
          ctx.beginPath();
          ctx.arc(sx + driftX, sy + driftY, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reducedMotion) raf = requestAnimationFrame(render);
    };

    resize();
    render();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [intensity, mood, parallax, phase, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
