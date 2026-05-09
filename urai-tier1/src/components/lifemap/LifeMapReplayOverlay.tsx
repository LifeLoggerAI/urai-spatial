"use client";

import { useEffect, useState } from "react";
import type { LifeMapNode } from "./lifeMapData";

const replayPhases = [
  "Gathering signal",
  "Threading memory",
  "Rendering emotional weather",
  "Opening replay",
];

type LifeMapReplayOverlayProps = {
  node: LifeMapNode | null;
  active: boolean;
  onClose: () => void;
};

export function LifeMapReplayOverlay({ node, active, onClose }: LifeMapReplayOverlayProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    if (!active) {
      setPhaseIndex(0);
      setProgress(12);
      return;
    }

    const phaseTimer = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1) % replayPhases.length);
    }, 1500);

    const progressTimer = window.setInterval(() => {
      setProgress((current) => (current >= 96 ? 18 : current + 7));
    }, 420);

    return () => {
      window.clearInterval(phaseTimer);
      window.clearInterval(progressTimer);
    };
  }, [active]);

  if (!active || !node) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-6 text-white backdrop-blur-md">
      <div className="relative w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-[2rem] border border-cyan-100/20 bg-slate-950/75 p-7 shadow-2xl shadow-cyan-950/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(125,220,255,0.2),transparent_34%),radial-gradient(circle_at_75%_60%,rgba(255,123,214,0.14),transparent_38%)]" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.46em] text-cyan-100/70">
            Replay Stream
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-cyan-50">
            {node.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-100/70">
            URAI is opening a demo-safe replay shell for this memory node. Raw private media is not rendered here; only the symbolic replay stream is staged.
          </p>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.22em] text-white/55">
              <span>{replayPhases[phaseIndex]}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-100 shadow-[0_0_30px_rgba(125,220,255,0.8)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-7 rounded-full border border-violet-100/25 bg-violet-100/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.24em] text-violet-50 transition hover:border-violet-100/50 hover:bg-violet-100/20"
          >
            Back to Focus
          </button>
        </div>
      </div>
    </div>
  );
}
