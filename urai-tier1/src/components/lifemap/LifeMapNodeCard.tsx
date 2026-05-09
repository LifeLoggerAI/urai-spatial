"use client";

import type { LifeMapNode } from "./lifeMapData";
import { lifeMapTypeLabels } from "./lifeMapData";

type LifeMapNodeCardProps = {
  node: LifeMapNode | null;
  onReplay: () => void;
  onClose: () => void;
};

export function LifeMapNodeCard({ node, onReplay, onClose }: LifeMapNodeCardProps) {
  if (!node) return null;

  const canReplay = node.replayAvailable && !node.locked;

  return (
    <aside className="pointer-events-auto absolute bottom-24 right-4 z-30 w-[min(25rem,calc(100vw-2rem))] rounded-[2rem] border border-cyan-100/15 bg-slate-950/60 p-5 text-white shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl sm:bottom-28 sm:right-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-cyan-100/60">
            {lifeMapTypeLabels[node.type]} / {node.dateLabel}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-cyan-50">
            {node.title}
          </h2>
          <p className="mt-1 text-sm text-violet-100/70">{node.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Close node focus"
        >
          Esc
        </button>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-100/78">{node.summary}</p>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.24em] text-white/45">
          <span>Intensity</span>
          <span>{Math.round(node.intensity * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-100 shadow-[0_0_22px_rgba(125,220,255,0.72)]"
            style={{ width: `${Math.round(node.intensity * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span
          className="rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ borderColor: `${node.aura}66`, color: node.aura }}
        >
          {node.locked ? "Locked" : "Signal Open"}
        </span>
        <button
          type="button"
          disabled={!canReplay}
          onClick={onReplay}
          className="rounded-full border border-cyan-100/30 bg-cyan-100/15 px-5 py-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-50 shadow-xl shadow-cyan-500/10 transition hover:border-cyan-100/60 hover:bg-cyan-100/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35 disabled:shadow-none"
        >
          {node.locked ? "Replay Locked" : node.replayAvailable ? "Begin Replay" : "No Replay"}
        </button>
      </div>
    </aside>
  );
}
