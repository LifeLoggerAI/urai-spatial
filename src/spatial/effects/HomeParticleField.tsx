"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePrefersReducedMotion } from "./useDepthParallax";

export type HomeParticleFieldProps = {
  phase: string;
  intensity?: number;
  parallax?: { x: number; y: number; depth: number };
  audioLevel?: number;
};

export default function HomeParticleField({
  phase,
  intensity = 1,
  parallax,
  audioLevel = 0,
}: HomeParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: 140 }, (_, index) => ({
        id: index,
        orbit: 30 + ((index * 37) % 240),
        angle: ((index * 29) % 360) * (Math.PI / 180),
        size: 0.8 + ((index * 13) % 7),
        speed: 0.0006 + (((index * 17) % 9) * 0.00018),
        depth: 0.2 + (((index * 19) % 10) / 10),
      })),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let tick = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const render = () => {
      tick += reducedMotion ? 0 : 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2 + (parallax?.x ?? 0) * 20;
      const cy = canvas.height / 2 + (parallax?.y ?? 0) * 10;
      const ascent = phase === "ASCENT";

      particles.forEach((particle) => {
        const motion = tick * particle.speed;
        const angle = particle.angle + motion;
        const radius = particle.orbit * (1 + audioLevel * 0.3);

        let x = cx + Math.cos(angle) * radius * particle.depth;
        let y = cy + Math.sin(angle) * radius * particle.depth;

        if (ascent) {
          y -= tick * 0.18 * particle.depth * intensity;
          x += Math.cos(angle) * tick * 0.015;
        }

        const alpha = Math.min(1, 0.18 + particle.depth * 0.45 + audioLevel * 0.35);

        ctx.fillStyle = `rgba(103,196,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * (0.5 + intensity * 0.5), 0, Math.PI * 2);
        ctx.fill();
      });

      if (!reducedMotion) raf = requestAnimationFrame(render);
    };

    resize();
    render();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [audioLevel, intensity, parallax, particles, phase, reducedMotion]);

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
        zIndex: 1,
      }}
    />
  );
}
