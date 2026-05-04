"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Phase = "home" | "lifemap" | "focus" | "replay";

type Node = {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  color: string;
  replayTitle: string;
};

const NODES: Node[] = [
  { id: "pattern", title: "Pattern", subtitle: "Rhythm returning after static", x: 52, y: 38, color: "#7dd3fc", replayTitle: "Pattern Replay" },
  { id: "recovery", title: "Recovery", subtitle: "A soft return after overload", x: 28, y: 68, color: "#86efac", replayTitle: "Recovery Replay" },
  { id: "threshold", title: "Threshold", subtitle: "The door before the climb", x: 76, y: 58, color: "#c4b5fd", replayTitle: "Threshold Replay" },
  { id: "signal", title: "Signal", subtitle: "A first pulse under the surface", x: 18, y: 34, color: "#f0abfc", replayTitle: "Signal Replay" },
  { id: "return", title: "Return", subtitle: "The body came back before the mind named it", x: 45, y: 82, color: "#fde68a", replayTitle: "Return Replay" },
];

function phaseFromLocation(queryPhase: string | null, pathname: string | null): Phase {
  const source = `${queryPhase ?? ""} ${pathname ?? ""}`.toLowerCase();
  if (source.includes("replay")) return "replay";
  if (source.includes("focus")) return "focus";
  if (source.includes("life-map") || source.includes("lifemap")) return "lifemap";
  return "home";
}

function star(index: number) {
  return {
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 17) % 100,
    size: 1 + ((index * 7) % 5) * 0.6,
    opacity: 0.28 + (((index * 13) % 65) / 100),
  };
}

export default function SpatialScene() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const phase = phaseFromLocation(searchParams.get("phase"), pathname);
  const stars = useMemo(() => Array.from({ length: 220 }, (_, index) => star(index)), []);
  const activeNode = NODES[phase === "replay" ? 1 : 0];

  const goto = (next: Phase) => router.push(next === "lifemap" ? "/life-map" : `/${next}`);

  return (
    <main className="stage" data-mode={phase} data-testid="urai-spatial-stage">
      {phase === "home" ? (
        <section className="home" data-testid="urai-home-scene">
          <div className="home-sky" />
          <div className="home-hill hill-a" />
          <div className="home-hill hill-b" />
          <div className="home-hill hill-c" />
          <button type="button" className="enter-label" onClick={() => goto("lifemap")}>ENTER THE SKY</button>
          <button type="button" className="orb" data-testid="urai-orb-button" aria-label="Enter LifeMap" onClick={() => goto("lifemap")} />
          <div className="body" data-testid="urai-home-body" />
        </section>
      ) : (
        <section className="lifemap" data-testid="urai-lifemap-scene" onClick={() => phase === "lifemap" && goto("focus")}>
          <div className="map-bg" />
          <div className="map-stars" data-testid="lifemap-starfield">
            {stars.map((s, index) => (
              <i key={index} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.opacity }} />
            ))}
          </div>
          <svg className="lines" aria-hidden="true">
            <line x1="52%" y1="38%" x2="28%" y2="68%" />
            <line x1="28%" y1="68%" x2="45%" y2="82%" />
            <line x1="52%" y1="38%" x2="76%" y2="58%" />
            <line x1="18%" y1="34%" x2="52%" y2="38%" />
          </svg>
          {NODES.map((node) => (
            <button
              key={node.id}
              type="button"
              className="node"
              data-testid={`lifemap-node-${node.id}-01`}
              aria-label={`${node.title} node`}
              style={{ left: `${node.x}%`, top: `${node.y}%`, ["--aura" as string]: node.color }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goto("focus");
              }}
            >
              <span />
            </button>
          ))}
          {phase === "lifemap" ? <p className="map-hint">Tap any star to focus</p> : null}
        </section>
      )}

      {phase === "focus" ? (
        <section className="card" data-testid="urai-focus-card">
          <p>PATTERN NODE</p>
          <h1>{activeNode.title}</h1>
          <span>{activeNode.subtitle}.</span>
          <div>
            <button type="button" onClick={() => goto("replay")}>Replay</button>
            <button type="button" onClick={() => goto("lifemap")}>Unwind</button>
          </div>
        </section>
      ) : null}

      {phase === "replay" ? (
        <section className="card replay" data-testid="urai-replay-overlay">
          <p>REPLAY STREAM</p>
          <h1>{activeNode.title}</h1>
          <span>The place where the body returns.</span>
          <div>
            <button type="button" onClick={() => goto("replay")}>Replay</button>
            <button type="button" onClick={() => goto("lifemap")}>Unwind</button>
          </div>
        </section>
      ) : null}

      <nav className="dock" data-testid="urai-command-ribbon" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => goto("lifemap")}>✦ LifeMap</button>
        <button type="button" onClick={() => goto("replay")}>⟳ Replay</button>
        <button type="button" onClick={() => goto("home")}>↺ Unwind</button>
      </nav>

      <style jsx>{`
        .stage {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #020612;
          color: white;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button { font: inherit; }

        .home,
        .lifemap,
        .home-sky,
        .map-bg,
        .map-stars,
        .lines {
          position: absolute;
          inset: 0;
        }

        .home-sky {
          background:
            radial-gradient(circle at 50% 28%, rgba(139, 203, 255, 0.36), transparent 28%),
            linear-gradient(180deg, #050813 0%, #142e4b 52%, #06111f 100%);
        }

        .home-hill {
          position: absolute;
          left: 50%;
          width: 120vw;
          transform: translateX(-50%);
          border-radius: 50% 50% 0 0;
          background: rgba(21, 48, 82, 0.78);
        }
        .hill-a { bottom: 34vh; height: 24vh; opacity: 0.42; }
        .hill-b { bottom: 20vh; height: 23vh; opacity: 0.62; }
        .hill-c { bottom: -4vh; height: 35vh; opacity: 0.88; }

        .enter-label {
          position: absolute;
          left: 50%;
          top: 43%;
          transform: translate(-50%, -160px);
          z-index: 4;
          border: 0;
          border-radius: 999px;
          padding: 8px 14px;
          background: rgba(7, 14, 28, 0.38);
          color: rgba(235, 247, 255, 0.62);
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .orb {
          position: absolute;
          left: 50%;
          top: 43%;
          z-index: 5;
          width: 70px;
          height: 70px;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(230, 248, 255, 0.5);
          border-radius: 999px;
          cursor: pointer;
          background: radial-gradient(circle at 34% 24%, #f8fcff 0 14%, #9ddcff 22%, #3175bd 58%, #102d60 100%);
          box-shadow: 0 0 18px rgba(179, 226, 255, 0.95), 0 0 58px rgba(83, 175, 255, 0.54);
        }

        .body {
          position: absolute;
          left: 50%;
          top: calc(43% + 42px);
          width: 80px;
          height: 118px;
          transform: translateX(-50%);
          border-radius: 48% 48% 42% 42%;
          background: linear-gradient(180deg, rgba(12, 32, 58, 0.96), rgba(3, 13, 26, 0.92));
        }

        .lifemap {
          cursor: crosshair;
          background: #020612;
        }

        .map-bg {
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 36%, rgba(123, 195, 255, 0.34), transparent 30%),
            radial-gradient(circle at 18% 82%, rgba(244, 114, 182, 0.13), transparent 28%),
            radial-gradient(circle at 82% 78%, rgba(134, 239, 172, 0.1), transparent 26%),
            linear-gradient(180deg, #030715 0%, #0d2746 48%, #030817 100%);
        }

        .map-stars {
          pointer-events: none;
          overflow: hidden;
        }

        .map-stars i {
          position: absolute;
          display: block;
          border-radius: 999px;
          background: white;
          box-shadow: 0 0 10px rgba(255,255,255,.82), 0 0 24px rgba(151,202,255,.32);
        }

        .lines {
          pointer-events: none;
          width: 100%;
          height: 100%;
        }

        .lines line {
          stroke: rgba(232, 247, 255, 0.26);
          stroke-width: 1;
          stroke-dasharray: 5 9;
        }

        .node {
          position: absolute;
          z-index: 8;
          width: 52px;
          height: 52px;
          transform: translate(-50%, -50%);
          border: 0;
          border-radius: 999px;
          background: color-mix(in srgb, var(--aura), transparent 72%);
          box-shadow: 0 0 38px var(--aura), 0 0 88px color-mix(in srgb, var(--aura), transparent 70%);
          cursor: pointer;
        }

        .node span {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 14px;
          height: 14px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: white;
          box-shadow: 0 0 20px var(--aura);
        }

        .node:hover,
        .node:focus-visible {
          outline: 3px solid rgba(255,255,255,.7);
          outline-offset: 8px;
        }

        .map-hint {
          position: absolute;
          left: 50%;
          bottom: 90px;
          z-index: 9;
          transform: translateX(-50%);
          margin: 0;
          border-radius: 999px;
          padding: 7px 12px;
          background: rgba(3, 10, 24, 0.48);
          color: rgba(232, 246, 255, 0.58);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          pointer-events: none;
        }

        .card {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 20;
          width: min(440px, calc(100vw - 32px));
          transform: translate(-50%, -50%);
          border: 1px solid rgba(219, 241, 255, 0.2);
          border-radius: 28px;
          padding: 24px;
          background: rgba(4, 13, 29, 0.72);
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.55), inset 0 0 44px rgba(158, 218, 255, 0.08);
          backdrop-filter: blur(20px);
        }

        .card p {
          margin: 0;
          color: rgba(210, 236, 255, 0.65);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.28em;
        }

        .card h1 {
          margin: 10px 0 0;
          font-size: 34px;
          line-height: 1.05;
        }

        .card span {
          display: block;
          margin-top: 12px;
          color: rgba(238, 248, 255, 0.74);
          font-size: 14px;
        }

        .card div {
          display: flex;
          gap: 10px;
          margin-top: 22px;
        }

        .card button,
        .dock button {
          border: 1px solid rgba(214, 238, 255, 0.24);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          font-weight: 750;
        }

        .card button { padding: 10px 16px; }

        .dock {
          position: absolute;
          left: 50%;
          bottom: 22px;
          z-index: 30;
          display: flex;
          gap: 8px;
          transform: translateX(-50%);
          border: 1px solid rgba(210, 235, 255, 0.16);
          border-radius: 999px;
          padding: 7px;
          background: rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(16px);
        }

        .dock button {
          min-width: 80px;
          padding: 9px 12px;
          font-size: 12px;
        }
      `}</style>
    </main>
  );
}
