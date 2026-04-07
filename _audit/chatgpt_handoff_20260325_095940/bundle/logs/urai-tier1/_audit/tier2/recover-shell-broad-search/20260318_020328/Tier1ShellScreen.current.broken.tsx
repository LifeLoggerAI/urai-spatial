"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import HomeShellOverlay from "./overlays/HomeShellOverlay";
import SkyShellOverlay from "./overlays/SkyShellOverlay";
import LifeMapShellOverlay from "./overlays/LifeMapShellOverlay";
import FocusShellOverlay from "./overlays/FocusShellOverlay";
import ReplayShellOverlay from "./overlays/ReplayShellOverlay";

type Mode = "home" | "sky" | "lifemap" | "focus" | "replay";

type MemoryNode = {
  id: string;
  title: string;
  chapter: string;
  domain: string;
  summary: string;
  tags: [string, string, string];
  x: number;
  y: number;
  size: number;
};

const MEMORY_NODES: MemoryNode[] = [
  {
    id: "return-signal",
    title: "Return Signal",
    chapter: "Return",
    domain: "Atmosic",
    summary: "Second orbit node for focus continuity and selected-state validation.",
    tags: ["Signal", "Return", "Orbit"],
    x: 22,
    y: 58,
    size: 10,
  },
  {
    id: "threshold-one",
    title: "Threshold One",
    chapter: "Winter",
    domain: "Threshold",
    summary: "Canonical memory seed used to verify replay identity and focus continuity.",
    tags: ["Origin", "Winter", "Threshold"],
    x: 54,
    y: 46,
    size: 12,
  },
  {
    id: "echo-lattice",
    title: "Echo Lattice",
    chapter: "Signal",
    domain: "Pattern",
    summary: "Pattern memory used to test alternate node selection without routing drift.",
    tags: ["Echo", "Lattice", "Pattern"],
    x: 73,
    y: 33,
    size: 9,
  },
  {
    id: "north-vector",
    title: "North Vector",
    chapter: "Guide",
    domain: "Compass",
    summary: "Reference waypoint for map readability and deterministic object persistence.",
    tags: ["North", "Vector", "Guide"],
    x: 66,
    y: 68,
    size: 9,
  },
];

function seededDust(count: number) {
  let seed = 1337;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, (_, index) => ({
    id: `dust-${index}`,
    x: Math.round(next() * 1000) / 10,
    y: Math.round(next() * 1000) / 10,
    o: 0.15 + next() * 0.6,
    s: 1 + next() * 2.4,
  }));
}

const SKY_TRANSIT_MS = 950;
const MAP_TO_FOCUS_MS = 300;
const FOCUS_TO_REPLAY_MS = 220;
const REPLAY_TO_FOCUS_MS = 220;
const FOCUS_TO_MAP_MS = 220;

function pillLabel(mode: Mode) {
  return mode.toUpperCase();
}

export default function Page() {
  const [mode, setMode] = useState<Mode>("home");
  const [selectedId, setSelectedId] = useState<string>("threshold-one");
  const [transitioning, setTransitioning] = useState(false);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dust = useMemo(() => seededDust(72), []);
  const selected = useMemo(
    () => MEMORY_NODES.find((node) => node.id === selectedId) ?? MEMORY_NODES[0],
    [selectedId]
  );

  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", onContextMenu);
    document.body.style.margin = "0";
    document.body.style.background = "#030610";
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const lock = (ms: number, next: () => void) => {
    if (transitioning) return;
    setTransitioning(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      next();
      setTransitioning(false);
    }, ms);
  };

  const enterLifeMap = () => {
    if (transitioning) return;
    setMode("sky");
    lock(SKY_TRANSIT_MS, () => setMode("lifemap"));
  };

  const returnHome = () => {
    if (transitioning) return;
    setMode("home");
  };

  const selectMemory = (id: string) => {
    if (transitioning) return;
    setSelectedId(id);
    setPulseId(id);
    lock(MAP_TO_FOCUS_MS, () => {
      setPulseId(null);
      setMode("focus");
    });
  };

  const clearFocus = () => {
    if (transitioning) return;
    lock(FOCUS_TO_MAP_MS, () => setMode("lifemap"));
  };

  const enterReplay = () => {
    if (transitioning) return;
    lock(FOCUS_TO_REPLAY_MS, () => setMode("replay"));
  };

  const exitReplay = () => {
    if (transitioning) return;
    lock(REPLAY_TO_FOCUS_MS, () => setMode("focus"));
  };

  const uiLocked = transitioning || mode === "sky";
  const showMapWorld = mode === "lifemap" || mode === "focus" || mode === "replay";

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100vw",
        position: "relative",
        overflow: "hidden",
        color: "#f4f7ff",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background:
          "radial-gradient(circle at 50% 0%, rgba(34,66,120,0.20), transparent 28%), linear-gradient(180deg, #040814 0%, #030611 52%, #03050d 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 20%, rgba(88,120,208,0.09), transparent 32%), radial-gradient(circle at 50% 85%, rgba(38,72,144,0.16), transparent 30%)",
        }}
      />

      {dust.map((dot) => (
        <div
          key={dot.id}
          style={{
            position: "absolute",
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.s,
            height: dot.s,
            opacity: dot.o,
            borderRadius: 999,
            background: "rgba(226,236,255,0.95)",
            boxShadow: "0 0 10px rgba(226,236,255,0.16)",
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(3,6,16,0.00) 0%, rgba(3,6,16,0.10) 40%, rgba(3,6,16,0.40) 100%)",
        }}
      />

      <header
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          right: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 20,
        }}
      >
        <div
          style={{
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(6,10,22,0.74)",
            padding: "7px 10px",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(236,242,255,0.92)",
            backdropFilter: "blur(12px)",
          }}
        >
          URAI SPATIAL
        </div>

        <div
          style={{
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(6,10,22,0.74)",
            padding: "7px 10px",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(236,242,255,0.92)",
            backdropFilter: "blur(12px)",
          }}
        >
          {pillLabel(mode)}
        </div>
      </header>

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: showMapWorld ? 1 : 0.82,
          transition: "opacity 240ms ease",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "6%",
            top: "50%",
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "rgba(233,243,255,0.92)",
            boxShadow: "0 0 18px rgba(233,243,255,0.55)",
            opacity: 0.94,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "6%",
            top: "50%",
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "rgba(233,243,255,0.92)",
            boxShadow: "0 0 18px rgba(233,243,255,0.55)",
            opacity: 0.94,
          }}
        />
      </div>

      {(showMapWorld || pulseId) &&
        MEMORY_NODES.map((node) => {
          const selectedNode = node.id === selectedId;
          const pulsingNode = node.id === pulseId;
          return (
            <button
              key={node.id}
              type="button"
              disabled={!showMapWorld || uiLocked}
              onClick={() => selectMemory(node.id)}
              style={{
                position: "absolute",
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: "translate(-50%, -50%)",
                width: selectedNode ? node.size + 10 : node.size,
                height: selectedNode ? node.size + 10 : node.size,
                borderRadius: 999,
                border: selectedNode
                  ? "1px solid rgba(255,255,255,0.48)"
                  : "1px solid rgba(255,255,255,0.14)",
                background: selectedNode
                  ? "radial-gradient(circle, rgba(214,226,255,0.92) 0%, rgba(140,160,214,0.38) 55%, rgba(26,36,66,0.18) 100%)"
                  : "radial-gradient(circle, rgba(226,236,255,0.94) 0%, rgba(124,146,206,0.22) 100%)",
                boxShadow: selectedNode
                  ? "0 0 34px rgba(180,200,255,0.42)"
                  : "0 0 12px rgba(190,210,255,0.18)",
                opacity: mode === "home" || mode === "sky" ? 0.16 : 1,
                cursor: showMapWorld && !uiLocked ? "pointer" : "default",
                transition:
                  "transform 220ms ease, width 220ms ease, height 220ms ease, opacity 220ms ease, box-shadow 220ms ease",
                pointerEvents: showMapWorld && !uiLocked ? "auto" : "none",
                animation: pulsingNode ? "node-pulse 280ms ease-out 1" : undefined,
              }}
              aria-label={node.title}
            >
              {selectedNode && (
                <span
                  style={{
                    position: "absolute",
                    inset: -14,
                    borderRadius: 999,
                    border: "1px solid rgba(206,222,255,0.20)",
                    boxShadow: "0 0 26px rgba(154,186,255,0.14)",
                  }}
                />
              )}
            </button>
          );
        })}

      {(mode === "focus" || mode === "replay") && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: mode === "replay" ? "48%" : "50%",
            transform: "translate(-50%, -50%)",
            width: mode === "replay" ? 146 : 118,
            height: mode === "replay" ? 146 : 118,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(220,230,255,0.20) 0%, rgba(116,136,196,0.20) 45%, rgba(46,60,102,0.14) 68%, rgba(18,26,48,0.00) 100%)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow:
              "0 0 42px rgba(150,176,255,0.14), inset 0 0 22px rgba(230,238,255,0.08)",
            transition: "all 240ms ease",
            animation: "breathe 4.2s ease-in-out infinite",
            zIndex: 10,
          }}
        />
      )}

      <HomeShellOverlay
        mode={mode}
        uiLocked={uiLocked}
        showMapWorld={showMapWorld}
        selectedId={selectedId}
        transitioning={transitioning}
        selected={selected}
        enterLifeMap={enterLifeMap}
        returnHome={returnHome}
        enterReplay={enterReplay}
        clearFocus={clearFocus}
        exitReplay={exitReplay}
        pillLabel={pillLabel}
      />
      <SkyShellOverlay
        mode={mode}
        uiLocked={uiLocked}
        showMapWorld={showMapWorld}
        selectedId={selectedId}
        transitioning={transitioning}
        selected={selected}
        enterLifeMap={enterLifeMap}
        returnHome={returnHome}
        enterReplay={enterReplay}
        clearFocus={clearFocus}
        exitReplay={exitReplay}
        pillLabel={pillLabel}
      />
      <LifeMapShellOverlay
        mode={mode}
        uiLocked={uiLocked}
        showMapWorld={showMapWorld}
        selectedId={selectedId}
        transitioning={transitioning}
        selected={selected}
        enterLifeMap={enterLifeMap}
        returnHome={returnHome}
        enterReplay={enterReplay}
        clearFocus={clearFocus}
        exitReplay={exitReplay}
        pillLabel={pillLabel}
      />
      <FocusShellOverlay
        mode={mode}
        uiLocked={uiLocked}
        showMapWorld={showMapWorld}
        selectedId={selectedId}
        transitioning={transitioning}
        selected={selected}
        enterLifeMap={enterLifeMap}
        returnHome={returnHome}
        enterReplay={enterReplay}
        clearFocus={clearFocus}
        exitReplay={exitReplay}
        pillLabel={pillLabel}
      />
      <ReplayShellOverlay
        mode={mode}
        uiLocked={uiLocked}
        showMapWorld={showMapWorld}
        selectedId={selectedId}
        transitioning={transitioning}
        selected={selected}
        enterLifeMap={enterLifeMap}
        returnHome={returnHome}
        enterReplay={enterReplay}
        clearFocus={clearFocus}
        exitReplay={exitReplay}
        pillLabel={pillLabel}
      />
