"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FocusChamber from "./FocusChamber";
import { lifeMapEdges, lifeMapNodes } from "./lifeMapModel";
import { buildFocusChamberNode } from "./focusTier5Model";

function backgroundStar(index: number) {
  return {
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 17) % 100,
    size: 1 + ((index * 7) % 5) * 0.6,
    opacity: 0.22 + (((index * 13) % 65) / 100),
    delay: ((index * 17) % 9) / 10,
  };
}

function resolveNode(nodeId: string | null) {
  return lifeMapNodes.find((node) => node.id === nodeId) ?? lifeMapNodes[0];
}

export default function FocusRouteStage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const node = resolveNode(searchParams.get("node"));
  const [showReplay, setShowReplay] = useState(false);
  const stars = useMemo(() => Array.from({ length: 220 }, (_, index) => backgroundStar(index)), []);
  const chamber = useMemo(() => buildFocusChamberNode(node), [node]);

  return (
    <main className="focus-route-stage" data-testid="urai-spatial-stage" data-mode={showReplay ? "replay" : "focus"}>
      <div className="focus-route-stage__bg" />
      <div className="focus-route-stage__stars" data-testid="lifemap-starfield">
        {stars.map((star, index) => (
          <i
            key={index}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      <svg className="focus-route-stage__lines" aria-hidden="true">
        {lifeMapEdges.map((edge) => {
          const from = lifeMapNodes.find((item) => item.id === edge.from);
          const to = lifeMapNodes.find((item) => item.id === edge.to);
          if (!from || !to) return null;
          const active = from.id === node.id || to.id === node.id;
          return (
            <line
              key={edge.id}
              x1={`${from.x}%`}
              y1={`${from.y}%`}
              x2={`${to.x}%`}
              y2={`${to.y}%`}
              data-active={active ? "true" : "false"}
            />
          );
        })}
      </svg>

      <div className="focus-route-stage__nodes" aria-hidden="true">
        {lifeMapNodes.map((item) => (
          <span
            key={item.id}
            data-selected={item.id === node.id ? "true" : "false"}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              background: item.id === node.id ? "white" : item.auraColor,
              boxShadow: `0 0 ${item.id === node.id ? 72 : 28}px ${item.auraColor}`,
            }}
          />
        ))}
      </div>

      {showReplay ? (
        <section className="focus-route-stage__replay" data-testid="urai-replay-overlay" role="dialog" aria-label={`${node.title} replay`}>
          <p>REPLAY STREAM</p>
          <h1>{chamber.replay.title}</h1>
          <ol>
            {chamber.replay.phases.map((phase) => (
              <li key={phase.id}>
                <b>{phase.label}</b>
                <span>{phase.text}</span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setShowReplay(false)}>Collapse Replay / Unwind</button>
        </section>
      ) : (
        <FocusChamber
          node={node}
          nodes={lifeMapNodes}
          edges={lifeMapEdges}
          onReplay={() => setShowReplay(true)}
          onUnwind={() => router.push("/life-map", { scroll: false })}
          onModeJump={(nextMode) => router.push(nextMode === "mirror" ? "/mirror" : `/life-map?mode=${nextMode}`, { scroll: false })}
        />
      )}

      <nav className="focus-route-stage__ribbon" data-testid="urai-command-ribbon" aria-label="Focus controls">
        <button type="button" onClick={() => router.push("/life-map", { scroll: false })}>LifeMap</button>
        <button type="button" onClick={() => setShowReplay(true)}>Replay</button>
        <button type="button" onClick={() => router.push("/life-map", { scroll: false })}>Unwind</button>
      </nav>

      <style jsx>{`
        .focus-route-stage {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          background: #020612;
          color: white;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .focus-route-stage__bg,
        .focus-route-stage__stars,
        .focus-route-stage__lines,
        .focus-route-stage__nodes {
          position: absolute;
          inset: 0;
        }

        .focus-route-stage__bg {
          background:
            radial-gradient(circle at ${node.x}% ${node.y}%, ${node.auraColor}40, transparent 28%),
            radial-gradient(circle at 18% 82%, rgba(244, 114, 182, 0.14), transparent 28%),
            linear-gradient(180deg, #020617 0%, #07162e 56%, #020612 100%);
          filter: saturate(1.18);
        }

        .focus-route-stage__stars i {
          position: absolute;
          display: block;
          border-radius: 999px;
          background: white;
          box-shadow: 0 0 12px rgba(255,255,255,0.84), 0 0 26px rgba(151,202,255,0.32);
          animation: focus-route-star-pulse 2.8s ease-in-out infinite alternate;
        }

        .focus-route-stage__lines {
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .focus-route-stage__lines line {
          stroke: rgba(255,255,255,0.14);
          stroke-width: 1;
          stroke-dasharray: 4 8;
        }

        .focus-route-stage__lines line[data-active="true"] {
          stroke: ${node.auraColor};
          stroke-width: 1.7;
          opacity: 0.9;
        }

        .focus-route-stage__nodes span {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          transform: translate(-50%, -50%);
          opacity: 0.45;
        }

        .focus-route-stage__nodes span[data-selected="true"] {
          width: 16px;
          height: 16px;
          opacity: 1;
        }

        .focus-route-stage__ribbon {
          position: absolute;
          bottom: max(16px, env(safe-area-inset-bottom));
          left: 50%;
          z-index: 60;
          display: flex;
          gap: 8px;
          transform: translateX(-50%);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 999px;
          background: rgba(0,0,0,0.42);
          padding: 8px;
          backdrop-filter: blur(18px);
        }

        .focus-route-stage__ribbon button,
        .focus-route-stage__replay button {
          min-height: 38px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          padding: 0 14px;
        }

        .focus-route-stage__replay {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 50;
          width: min(620px, calc(100vw - 32px));
          transform: translate(-50%, -50%);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 30px;
          background: rgba(2,6,23,0.76);
          box-shadow: 0 0 120px ${node.auraColor}55;
          padding: 24px;
          backdrop-filter: blur(24px);
        }

        .focus-route-stage__replay p {
          margin: 0 0 8px;
          color: rgba(226, 241, 255, 0.58);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.28em;
        }

        .focus-route-stage__replay h1 {
          margin: 0;
          font-size: clamp(30px, 5vw, 52px);
        }

        .focus-route-stage__replay ol {
          display: grid;
          gap: 10px;
          margin: 18px 0;
          padding: 0;
          list-style: none;
        }

        .focus-route-stage__replay li {
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 18px;
          background: rgba(255,255,255,0.07);
          padding: 12px;
        }

        .focus-route-stage__replay b {
          display: block;
          color: ${node.auraColor};
          font-size: 11px;
          text-transform: uppercase;
        }

        .focus-route-stage__replay span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.78);
        }

        @keyframes focus-route-star-pulse {
          from { opacity: 0.38; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1.12); }
        }
      `}</style>
    </main>
  );
}
