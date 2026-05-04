"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Phase = "home" | "lifemap" | "focus" | "replay";

type MemoryStar = {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  title: string;
};

const FEATURED_STAR: MemoryStar = {
  id: "signal",
  x: 50,
  y: 46,
  size: 18,
  opacity: 1,
  title: "Signal",
};

function normalizePhase(value: string | null): Phase {
  if (value === "life-map" || value === "lifemap") return "lifemap";
  if (value === "focus") return "focus";
  if (value === "replay") return "replay";
  return "home";
}

function fract(n: number) {
  return n - Math.floor(n);
}

function makeStars(): MemoryStar[] {
  return Array.from({ length: 148 }, (_, index) => {
    const randA = fract(Math.sin((index + 1) * 12.9898) * 43758.5453);
    const randB = fract(Math.sin((index + 7) * 78.233) * 24634.6345);
    const randC = fract(Math.sin((index + 17) * 37.719) * 19187.123);

    return {
      id: `star-${index}`,
      x: 3 + randA * 94,
      y: 7 + randB * 78,
      size: 6 + randC * 8,
      opacity: 0.38 + randC * 0.58,
      title: index % 9 === 0 ? "Memory" : "Echo",
    };
  });
}

export default function SpatialScene() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phase = normalizePhase(searchParams.get("phase"));
  const stars = useMemo(() => makeStars(), []);

  const goto = (next: Phase) => {
    const path = next === "lifemap" ? "/life-map" : `/${next}`;
    router.push(path);
  };

  const isMap = phase === "lifemap" || phase === "focus" || phase === "replay";
  const card = phase === "focus"
    ? { eyebrow: "LIFEMAP FOCUS", title: "Signal", copy: "A first pulse under the surface." }
    : phase === "replay"
      ? { eyebrow: "REPLAY STREAM", title: "Recovery", copy: "The place where the body returns." }
      : null;

  return (
    <main className={`urai-spatial-shell phase-${phase}`}>
      <div className="cosmic-bg" />
      <div className="sky-glow" />
      <div className="constellation-lines" />

      <button className="quiet-orb" aria-label="URAI spatial status" />

      {isMap ? (
        <section className="lifemap-layer" aria-label="URAI LifeMap starfield">
          {[...stars, FEATURED_STAR].map((star) => (
            <button
              key={star.id}
              type="button"
              className={`memory-star ${star.id === FEATURED_STAR.id ? "featured" : ""}`}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
              }}
              aria-label={`Open ${star.title}`}
              title={`Open ${star.title}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goto("focus");
              }}
            />
          ))}
        </section>
      ) : (
        <section className="home-layer" aria-label="URAI home world">
          <button className="sky-hit" type="button" onClick={() => goto("lifemap")} aria-label="Enter the sky">
            ENTER THE SKY
          </button>
          <div className="home-orb-wrap">
            <div className="home-orb" />
            <div className="body-shadow" />
          </div>
          <div className="ground ground-back" />
          <div className="ground ground-mid" />
          <div className="ground ground-front" />
        </section>
      )}

      {card ? (
        <section className="focus-card" aria-label={card.title}>
          <p>{card.eyebrow}</p>
          <h1>{card.title}</h1>
          <span>{card.copy}</span>
          <div>
            <button type="button" onClick={() => goto("replay")}>Replay</button>
            <button type="button" onClick={() => goto("lifemap")}>Unwind</button>
          </div>
        </section>
      ) : null}

      <nav className="bottom-dock" aria-label="Spatial actions">
        <button type="button" onClick={() => goto("lifemap")}>✦ LifeMap</button>
        <button type="button" onClick={() => goto("replay")}>⟳ Replay</button>
        <button type="button" onClick={() => goto("home")}>↺ Unwind</button>
      </nav>

      <style jsx>{`
        .urai-spatial-shell {
          position: relative;
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          color: white;
          background: #040813;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .cosmic-bg,
        .sky-glow,
        .constellation-lines,
        .lifemap-layer,
        .home-layer {
          position: absolute;
          inset: 0;
        }

        .cosmic-bg {
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 22%, rgba(126, 181, 219, 0.52), transparent 31%),
            linear-gradient(180deg, #050813 0%, #122f4f 56%, #06101e 100%);
        }

        .sky-glow {
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 38%, rgba(115, 182, 239, 0.2), transparent 20%),
            radial-gradient(circle at 18% 10%, rgba(100, 144, 208, 0.16), transparent 22%),
            radial-gradient(circle at 82% 16%, rgba(91, 142, 191, 0.12), transparent 28%);
        }

        .constellation-lines {
          pointer-events: none;
          opacity: 0.24;
          background:
            linear-gradient(31deg, transparent 0 18%, rgba(190, 225, 255, 0.28) 18.2%, transparent 18.5% 100%),
            linear-gradient(140deg, transparent 0 26%, rgba(190, 225, 255, 0.18) 26.2%, transparent 26.5% 100%),
            linear-gradient(71deg, transparent 0 51%, rgba(190, 225, 255, 0.16) 51.2%, transparent 51.5% 100%);
          filter: blur(0.2px);
          transform: translateY(-4vh) scale(1.08);
        }

        .quiet-orb {
          position: absolute;
          left: 18px;
          top: 18px;
          z-index: 30;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid rgba(191, 225, 255, 0.22);
          background: radial-gradient(circle, rgba(155, 211, 255, 0.85) 0 24%, rgba(46, 79, 107, 0.55) 26% 45%, rgba(5, 10, 22, 0.35) 47%);
          box-shadow: 0 0 18px rgba(120, 184, 255, 0.16);
        }

        .home-layer {
          z-index: 4;
          display: grid;
          place-items: center;
        }

        .sky-hit {
          position: absolute;
          top: 41%;
          left: 50%;
          z-index: 8;
          transform: translate(-50%, -165px);
          border: 0;
          border-radius: 999px;
          padding: 8px 14px;
          color: rgba(231, 244, 255, 0.62);
          background: rgba(10, 18, 33, 0.34);
          box-shadow: inset 0 0 0 1px rgba(203, 230, 255, 0.08);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          cursor: pointer;
        }

        .home-orb-wrap {
          position: relative;
          z-index: 6;
          width: 180px;
          height: 310px;
          transform: translateY(40px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .home-orb {
          width: 70px;
          height: 70px;
          border-radius: 999px;
          background: radial-gradient(circle at 34% 24%, #f6fbff 0 13%, #9bd6ff 20%, #316fb8 58%, #0d2f62 100%);
          box-shadow: 0 0 18px rgba(179, 226, 255, 0.98), 0 0 55px rgba(83, 175, 255, 0.5), 0 0 120px rgba(94, 171, 255, 0.24);
        }

        .home-orb::before,
        .home-orb::after {
          content: "";
          position: absolute;
          left: 50%;
          width: 2px;
          transform: translateX(-50%);
          background: linear-gradient(180deg, transparent, rgba(180, 222, 255, 0.5), transparent);
        }

        .home-orb::before { top: -120px; height: 120px; }
        .home-orb::after { top: 70px; height: 230px; opacity: 0.5; }

        .body-shadow {
          position: absolute;
          top: 88px;
          width: 80px;
          height: 120px;
          border-radius: 48% 48% 42% 42%;
          background: linear-gradient(180deg, rgba(13, 33, 58, 0.96), rgba(3, 13, 26, 0.92));
          box-shadow: inset 16px 0 28px rgba(88, 152, 220, 0.1);
        }

        .ground {
          position: absolute;
          left: 50%;
          width: 120vw;
          border-radius: 50% 50% 0 0;
          transform: translateX(-50%);
          background: rgba(22, 49, 83, 0.78);
        }

        .ground-back { bottom: 35%; height: 24vh; opacity: 0.44; }
        .ground-mid { bottom: 21%; height: 22vh; opacity: 0.66; }
        .ground-front { bottom: -2%; height: 34vh; opacity: 0.9; }

        .lifemap-layer {
          z-index: 12;
          pointer-events: auto;
          transition: opacity 260ms ease, transform 420ms ease;
        }

        .memory-star {
          position: absolute;
          display: block;
          border: 0;
          border-radius: 999px;
          padding: 0;
          transform: translate(-50%, -50%);
          background: #edf7ff;
          box-shadow: 0 0 9px rgba(221, 244, 255, 0.85), 0 0 22px rgba(142, 195, 255, 0.28);
          cursor: pointer;
          pointer-events: auto;
          touch-action: manipulation;
        }

        .memory-star::after {
          content: "";
          position: absolute;
          inset: -14px;
          border-radius: 999px;
        }

        .memory-star:hover,
        .memory-star:focus-visible {
          opacity: 1 !important;
          outline: none;
          box-shadow: 0 0 14px rgba(255, 255, 255, 0.98), 0 0 42px rgba(142, 195, 255, 0.65);
        }

        .memory-star.featured {
          background: #ffffff;
          box-shadow: 0 0 18px rgba(255, 255, 255, 0.95), 0 0 50px rgba(142, 195, 255, 0.55);
        }

        .phase-lifemap .home-layer,
        .phase-focus .home-layer,
        .phase-replay .home-layer { opacity: 0; pointer-events: none; }

        .phase-focus .lifemap-layer,
        .phase-replay .lifemap-layer {
          opacity: 0.48;
          filter: blur(0.1px);
          pointer-events: none;
        }

        .focus-card {
          position: absolute;
          z-index: 22;
          left: 50%;
          top: 56%;
          width: min(345px, calc(100vw - 44px));
          transform: translate(-50%, -50%);
          padding: 22px 22px 18px;
          border-radius: 22px;
          border: 1px solid rgba(185, 218, 255, 0.24);
          background: linear-gradient(135deg, rgba(23, 45, 72, 0.78), rgba(6, 13, 29, 0.72));
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.38), inset 0 0 30px rgba(171, 219, 255, 0.05);
          backdrop-filter: blur(18px);
        }

        .focus-card p {
          margin: 0 0 4px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.24em;
          color: rgba(201, 227, 255, 0.64);
        }

        .focus-card h1 {
          margin: 0;
          font-size: 31px;
          line-height: 1.1;
        }

        .focus-card span {
          display: block;
          margin-top: 10px;
          font-size: 12px;
          color: rgba(238, 247, 255, 0.76);
        }

        .focus-card div {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }

        .focus-card button,
        .bottom-dock button {
          border: 1px solid rgba(193, 224, 255, 0.28);
          border-radius: 999px;
          background: rgba(85, 129, 169, 0.32);
          color: #eef7ff;
          font-weight: 750;
          cursor: pointer;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .focus-card button { padding: 9px 14px; }

        .bottom-dock {
          position: absolute;
          z-index: 24;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          padding: 7px;
          border-radius: 999px;
          border: 1px solid rgba(175, 209, 255, 0.16);
          background: rgba(3, 10, 23, 0.5);
          backdrop-filter: blur(14px);
        }

        .bottom-dock button {
          min-width: 76px;
          padding: 8px 12px;
          font-size: 11px;
        }

        .phase-lifemap .bottom-dock,
        .phase-focus .bottom-dock,
        .phase-replay .bottom-dock { opacity: 0.72; }

        @media (max-width: 720px) {
          .bottom-dock { bottom: 16px; }
          .bottom-dock button { min-width: auto; padding: 8px 10px; }
          .focus-card { top: 54%; }
        }
      `}</style>
    </main>
  );
}
