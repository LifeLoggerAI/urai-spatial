"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Phase = "home" | "ascent" | "lifemap" | "focus" | "replay";
type StablePhase = Exclude<Phase, "ascent">;

type Node = {
  id: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  body: string;
  x: number;
  y: number;
  color: string;
  replayTitle: string;
  replayLine: string;
};

type Snapshot = {
  phase: StablePhase;
  nodeId: string;
  replayPaused: boolean;
};

const NODES: Node[] = [
  {
    id: "pattern",
    title: "Pattern",
    eyebrow: "PATTERN NODE",
    subtitle: "Rhythm returning after static",
    body: "A repeating constellation stabilizes across attention, movement, and evening drift.",
    x: 52,
    y: 38,
    color: "#7dd3fc",
    replayTitle: "Pattern Replay",
    replayLine: "The pattern forms, softens, and returns as a usable signal.",
  },
  {
    id: "recovery",
    title: "Recovery",
    eyebrow: "RECOVERY NODE",
    subtitle: "A soft return after overload",
    body: "The LifeMap marks the rebound point where pressure released and the body came back online.",
    x: 28,
    y: 68,
    color: "#86efac",
    replayTitle: "Recovery Replay",
    replayLine: "The replay follows the descent, the stillness, and the first clean breath back.",
  },
  {
    id: "threshold",
    title: "Threshold",
    eyebrow: "THRESHOLD NODE",
    subtitle: "The door before the climb",
    body: "A transition marker where old weather closes and the next spatial chapter begins.",
    x: 76,
    y: 58,
    color: "#c4b5fd",
    replayTitle: "Threshold Replay",
    replayLine: "The portal narrows into one decision, one breath, one clean passage forward.",
  },
  {
    id: "signal",
    title: "Signal",
    eyebrow: "SIGNAL NODE",
    subtitle: "A first pulse under the surface",
    body: "A faint internal signal becomes bright enough to name without forcing interpretation.",
    x: 18,
    y: 34,
    color: "#f0abfc",
    replayTitle: "Signal Replay",
    replayLine: "A small pulse becomes a visible star, then a line in the larger map.",
  },
  {
    id: "return",
    title: "Return",
    eyebrow: "RETURN NODE",
    subtitle: "The body came back before the mind named it",
    body: "A grounded return point that closes the chain and restores the user to the home sky.",
    x: 45,
    y: 82,
    color: "#fde68a",
    replayTitle: "Return Replay",
    replayLine: "The chain completes with a grounded return instead of a hard cut.",
  },
];

const DEFAULT_NODE_ID = NODES[0].id;
const PHASE_ROUTES: Record<StablePhase, string> = {
  home: "/home",
  lifemap: "/life-map",
  focus: "/focus",
  replay: "/replay",
};

function stablePhaseFromLocation(queryPhase: string | null, pathname: string | null): StablePhase {
  const source = `${queryPhase ?? ""} ${pathname ?? ""}`.toLowerCase();
  if (source.includes("replay")) return "replay";
  if (source.includes("focus")) return "focus";
  if (source.includes("life-map") || source.includes("lifemap")) return "lifemap";
  return "home";
}

function normalizeNodeId(value: string | null): string {
  return NODES.some((node) => node.id === value) ? String(value) : DEFAULT_NODE_ID;
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
  const routePhase = stablePhaseFromLocation(searchParams.get("phase"), pathname);
  const routeNodeId = normalizeNodeId(searchParams.get("node"));

  const [phase, setPhase] = useState<Phase>(routePhase);
  const [activeNodeId, setActiveNodeId] = useState(routeNodeId);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [replayPaused, setReplayPaused] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timers = useRef<number[]>([]);

  const stars = useMemo(() => Array.from({ length: 220 }, (_, index) => star(index)), []);
  const activeNode = NODES.find((node) => node.id === activeNodeId) ?? NODES[0];

  const clearTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  const queueTimer = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timers.current.push(id);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const next = stablePhaseFromLocation(searchParams.get("phase"), pathname);
    const nextNode = normalizeNodeId(searchParams.get("node"));
    if (!isTransitioning && phase !== "ascent") {
      setPhase(next);
      setActiveNodeId(nextNode);
      if (next !== "replay") setReplayPaused(false);
    }
  }, [isTransitioning, pathname, phase, searchParams]);

  useEffect(() => {
    if (phase !== "replay" || replayPaused) return;
    const id = window.setInterval(() => {
      setReplayProgress((current) => (current >= 100 ? 100 : Math.min(100, current + 1.8)));
    }, 120);
    return () => window.clearInterval(id);
  }, [phase, replayPaused]);

  const writeUrl = useCallback((next: StablePhase, nodeId = activeNodeId, replace = false) => {
    const query = next === "home" ? "" : `?node=${encodeURIComponent(nodeId)}`;
    const url = `${PHASE_ROUTES[next]}${query}`;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }, [activeNodeId, router]);

  const pushSnapshot = useCallback(() => {
    if (phase === "ascent") return;
    setHistory((current) => [...current, { phase, nodeId: activeNodeId, replayPaused }]);
  }, [activeNodeId, phase, replayPaused]);

  const goHome = useCallback(() => {
    clearTimers();
    setHistory([]);
    setReplayPaused(false);
    setReplayProgress(0);
    setIsTransitioning(false);
    setPhase("home");
    writeUrl("home", activeNodeId);
  }, [activeNodeId, clearTimers, writeUrl]);

  const enterLifeMap = useCallback(() => {
    if (isTransitioning || phase !== "home") return;
    clearTimers();
    pushSnapshot();
    setIsTransitioning(true);
    setPhase("ascent");
    queueTimer(() => {
      setPhase("lifemap");
      setIsTransitioning(false);
      writeUrl("lifemap", activeNodeId);
    }, 720);
  }, [activeNodeId, clearTimers, isTransitioning, phase, pushSnapshot, queueTimer, writeUrl]);

  const focusNode = useCallback((nodeId: string) => {
    if (isTransitioning || phase !== "lifemap") return;
    pushSnapshot();
    setActiveNodeId(nodeId);
    setPhase("focus");
    writeUrl("focus", nodeId);
  }, [isTransitioning, phase, pushSnapshot, writeUrl]);

  const startReplay = useCallback(() => {
    if (isTransitioning || phase !== "focus") return;
    pushSnapshot();
    setReplayPaused(false);
    setReplayProgress(0);
    setPhase("replay");
    writeUrl("replay", activeNodeId);
  }, [activeNodeId, isTransitioning, phase, pushSnapshot, writeUrl]);

  const unwind = useCallback(() => {
    if (isTransitioning) return;
    const previous = history[history.length - 1];
    if (!previous) {
      if (phase !== "home") goHome();
      return;
    }
    setHistory((current) => current.slice(0, -1));
    setActiveNodeId(previous.nodeId);
    setReplayPaused(previous.replayPaused);
    if (previous.phase !== "replay") setReplayProgress(0);
    setPhase(previous.phase);
    writeUrl(previous.phase, previous.nodeId);
  }, [goHome, history, isTransitioning, phase, writeUrl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      unwind();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unwind]);

  const showHome = phase === "home" || phase === "ascent";
  const showLifeMap = phase === "ascent" || phase === "lifemap" || phase === "focus" || phase === "replay";

  return (
    <main className="stage" data-mode={phase} data-testid="urai-spatial-stage" aria-live="polite">
      {showHome ? (
        <section className={`home ${phase === "ascent" ? "home-exiting" : ""}`} data-testid="urai-home-scene" aria-label="URAI home sky entry">
          <div className="home-sky" />
          <div className="home-hill hill-a" />
          <div className="home-hill hill-b" />
          <div className="home-hill hill-c" />
          <button type="button" className="enter-label" onClick={enterLifeMap} disabled={isTransitioning}>ENTER THE SKY</button>
          <button type="button" className="orb" data-testid="urai-orb-button" aria-label="Enter LifeMap" onClick={enterLifeMap} disabled={isTransitioning} />
          <div className="body" data-testid="urai-home-body" />
        </section>
      ) : null}

      {showLifeMap ? (
        <section className={`lifemap ${phase === "ascent" ? "lifemap-entering" : ""}`} data-testid="urai-lifemap-scene" aria-label="URAI LifeMap starfield">
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
              className={`node ${activeNodeId === node.id ? "node-active" : ""}`}
              data-testid={`lifemap-node-${node.id}-01`}
              aria-label={`${node.title} node`}
              aria-pressed={activeNodeId === node.id && phase !== "lifemap"}
              style={{ left: `${node.x}%`, top: `${node.y}%`, ["--aura" as string]: node.color }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                focusNode(node.id);
              }}
            >
              <span />
            </button>
          ))}
          {phase === "lifemap" || phase === "ascent" ? <p className="map-hint">Tap any star to focus</p> : null}
        </section>
      ) : null}

      {phase === "ascent" ? <div className="ascent-cover" data-testid="urai-ascent-cover"><span>ASCENDING INTO LIFEMAP</span></div> : null}

      {phase === "focus" ? (
        <section className="card focus-card" data-testid="urai-focus-card" role="dialog" aria-label={`${activeNode.title} focus`}>
          <p>{activeNode.eyebrow}</p>
          <h1>{activeNode.title}</h1>
          <span>{activeNode.subtitle}.</span>
          <small>{activeNode.body}</small>
          <div>
            <button type="button" onClick={startReplay}>Replay</button>
            <button type="button" onClick={unwind}>Unwind</button>
          </div>
        </section>
      ) : null}

      {phase === "replay" ? (
        <section className="card replay" data-testid="urai-replay-overlay" role="dialog" aria-label={`${activeNode.title} replay`}>
          <p>REPLAY STREAM</p>
          <h1>{activeNode.replayTitle}</h1>
          <span>{activeNode.replayLine}</span>
          <div className="meter" aria-label="Replay progress"><b style={{ width: `${replayProgress}%` }} /></div>
          <div>
            <button type="button" onClick={() => setReplayPaused((value) => !value)}>{replayPaused ? "Resume" : "Pause"}</button>
            <button type="button" onClick={unwind}>Collapse Replay</button>
          </div>
        </section>
      ) : null}

      <nav className="dock" data-testid="urai-command-ribbon" aria-label="Spatial controls">
        {phase === "home" ? <button type="button" onClick={enterLifeMap}>✦ LifeMap</button> : null}
        {phase === "lifemap" ? <button type="button" onClick={goHome}>↺ Home</button> : null}
        {phase === "focus" ? <button type="button" onClick={startReplay}>⟳ Replay</button> : null}
        {phase === "focus" || phase === "replay" || phase === "lifemap" ? <button type="button" onClick={unwind}>Esc Unwind</button> : null}
      </nav>

      <style jsx>{`
        .stage {
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

        .home {
          z-index: 3;
          transition: opacity 720ms cubic-bezier(.16, 1, .3, 1), transform 720ms cubic-bezier(.16, 1, .3, 1), filter 720ms cubic-bezier(.16, 1, .3, 1);
        }

        .home-exiting {
          opacity: 0;
          transform: translateY(20vh) scale(1.08);
          filter: blur(20px);
          pointer-events: none;
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
          color: rgba(235, 247, 255, 0.72);
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .orb {
          position: absolute;
          left: 50%;
          top: 43%;
          z-index: 5;
          width: clamp(76px, 14vw, 150px);
          height: clamp(76px, 14vw, 150px);
          transform: translate(-50%, -50%);
          border: 1px solid rgba(230, 248, 255, 0.5);
          border-radius: 999px;
          cursor: pointer;
          background: radial-gradient(circle at 34% 24%, #f8fcff 0 14%, #9ddcff 22%, #3175bd 58%, #102d60 100%);
          box-shadow: 0 0 18px rgba(179, 226, 255, 0.95), 0 0 58px rgba(83, 175, 255, 0.54);
          animation: breathe 5s ease-in-out infinite;
        }

        .body {
          position: absolute;
          left: 50%;
          top: calc(43% + 42px);
          width: clamp(74px, 10vw, 112px);
          height: clamp(116px, 18vw, 190px);
          transform: translateX(-50%);
          border-radius: 48% 48% 42% 42%;
          background: linear-gradient(180deg, rgba(12, 32, 58, 0.96), rgba(3, 13, 26, 0.92));
        }

        .lifemap {
          z-index: 1;
          background: #020612;
          opacity: 1;
          transition: opacity 720ms cubic-bezier(.16, 1, .3, 1), transform 720ms cubic-bezier(.16, 1, .3, 1);
        }

        .lifemap-entering {
          opacity: 0.72;
          transform: scale(1.06);
        }

        .map-bg {
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 36%, rgba(123, 195, 255, 0.34), transparent 30%),
            radial-gradient(circle at 18% 82%, rgba(244, 114, 182, 0.13), transparent 28%),
            radial-gradient(circle at 82% 78%, rgba(134, 239, 172, 0.1), transparent 26%),
            linear-gradient(180deg, #030715 0%, #0d2746 48%, #030817 100%);
        }

        .map-stars { pointer-events: none; overflow: hidden; }
        .map-stars i {
          position: absolute;
          display: block;
          border-radius: 999px;
          background: white;
          box-shadow: 0 0 10px rgba(255,255,255,.82), 0 0 24px rgba(151,202,255,.32);
        }

        .lines { pointer-events: none; width: 100%; height: 100%; }
        .lines line { stroke: rgba(232, 247, 255, 0.26); stroke-width: 1; stroke-dasharray: 5 9; }

        .node {
          position: absolute;
          z-index: 8;
          width: clamp(44px, 7vw, 56px);
          height: clamp(44px, 7vw, 56px);
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
        .node-active { outline: 2px solid rgba(255,255,255,.52); outline-offset: 10px; }
        .node:hover,
        .node:focus-visible { outline: 3px solid rgba(255,255,255,.7); outline-offset: 8px; }

        .map-hint {
          position: absolute;
          left: 50%;
          bottom: calc(88px + env(safe-area-inset-bottom));
          z-index: 9;
          transform: translateX(-50%);
          margin: 0;
          border-radius: 999px;
          padding: 7px 12px;
          background: rgba(3, 10, 24, 0.48);
          color: rgba(232, 246, 255, 0.64);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          pointer-events: none;
          white-space: nowrap;
        }

        .ascent-cover {
          position: absolute;
          inset: 0;
          z-index: 18;
          display: grid;
          place-items: center;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 20%, rgba(125,211,252,.38), transparent 32%),
            linear-gradient(180deg, rgba(2,6,18,.08), rgba(2,6,18,.76));
          animation: ascent 720ms cubic-bezier(.16, 1, .3, 1) both;
        }
        .ascent-cover span {
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          padding: 10px 14px;
          background: rgba(0,0,0,.22);
          color: rgba(235,247,255,.68);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .18em;
        }

        .card {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 20;
          width: min(460px, calc(100vw - 32px));
          transform: translate(-50%, -50%);
          border: 1px solid rgba(219, 241, 255, 0.2);
          border-radius: 28px;
          padding: 24px;
          background: rgba(4, 13, 29, 0.72);
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.55), inset 0 0 44px rgba(158, 218, 255, 0.08);
          backdrop-filter: blur(20px);
          animation: cardIn 320ms cubic-bezier(.16, 1, .3, 1) both;
        }
        .replay { box-shadow: 0 24px 90px rgba(0,0,0,.55), 0 0 120px color-mix(in srgb, ${activeNode.color}, transparent 70%); }
        .card p { margin: 0; color: rgba(210, 236, 255, 0.65); font-size: 11px; font-weight: 800; letter-spacing: 0.28em; }
        .card h1 { margin: 10px 0 0; font-size: clamp(30px, 6vw, 42px); line-height: 1.05; }
        .card span, .card small { display: block; margin-top: 12px; color: rgba(238, 248, 255, 0.74); font-size: 14px; line-height: 1.6; }
        .card div { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
        .card button,
        .dock button { border: 1px solid rgba(214, 238, 255, 0.24); border-radius: 999px; background: rgba(255,255,255,.1); color: white; cursor: pointer; font-weight: 750; }
        .card button { min-height: 42px; padding: 10px 16px; }
        .meter { height: 7px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.1); }
        .meter b { display: block; height: 100%; border-radius: inherit; background: ${activeNode.color}; transition: width 120ms linear; }

        .dock {
          position: absolute;
          left: 50%;
          bottom: max(18px, env(safe-area-inset-bottom));
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
        .dock button { min-width: 88px; min-height: 40px; padding: 9px 12px; font-size: 12px; }

        @keyframes breathe { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.045); } }
        @keyframes ascent { 0% { opacity: 0; transform: scale(.98); } 55% { opacity: 1; } 100% { opacity: 0; transform: scale(1.06); } }
        @keyframes cardIn { from { opacity: 0; transform: translate(-50%, calc(-50% + 18px)) scale(.97); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }

        @media (max-width: 520px) {
          .enter-label { top: 39%; transform: translate(-50%, -132px); }
          .orb { top: 39%; }
          .body { top: calc(39% + 42px); }
          .dock { width: calc(100vw - 24px); justify-content: center; }
          .dock button { min-width: 0; flex: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; scroll-behavior: auto !important; }
        }
      `}</style>
    </main>
  );
}
