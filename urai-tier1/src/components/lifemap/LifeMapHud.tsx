"use client";

import type { LifeMapNodeType } from "./lifeMapData";
import { lifeMapFilters, lifeMapTypeLabels } from "./lifeMapData";

export type LifeMapMode = "lifemap" | "focus" | "replay";

type LifeMapHudProps = {
  mode: LifeMapMode;
  activeFilters: LifeMapNodeType[];
  onToggleFilter: (type: LifeMapNodeType) => void;
  onRecenter: () => void;
  onReturnHome: () => void;
};

const modeLabels: Record<LifeMapMode, string> = {
  lifemap: "Overview",
  focus: "Focus",
  replay: "Replay",
};

export function LifeMapHud({
  mode,
  activeFilters,
  onToggleFilter,
  onRecenter,
  onReturnHome,
}: LifeMapHudProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 text-white sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <section className="pointer-events-auto rounded-3xl border border-cyan-200/15 bg-slate-950/45 px-5 py-4 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-100/70">
            URAI Spatial
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-cyan-50 sm:text-3xl">
            Life Map
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.28em] text-violet-100/70">
            {modeLabels[mode]}
          </p>
        </section>

        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={onRecenter}
            className="rounded-full border border-cyan-200/20 bg-slate-950/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-50 shadow-xl shadow-cyan-950/30 backdrop-blur-xl transition hover:border-cyan-200/45 hover:bg-cyan-200/10"
          >
            Recenter
          </button>
          <button
            type="button"
            onClick={onReturnHome}
            className="rounded-full border border-violet-200/20 bg-slate-950/45 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-violet-50 shadow-xl shadow-violet-950/30 backdrop-blur-xl transition hover:border-violet-200/45 hover:bg-violet-200/10"
          >
            Return Home
          </button>
        </div>
      </div>

      <section className="pointer-events-auto mx-auto flex max-w-5xl flex-wrap justify-center gap-2 rounded-3xl border border-white/10 bg-slate-950/35 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
        {lifeMapFilters.map((type) => {
          const active = activeFilters.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggleFilter(type)}
              className={`rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition ${
                active
                  ? "border-cyan-200/50 bg-cyan-200/15 text-cyan-50 shadow-lg shadow-cyan-500/10"
                  : "border-white/10 bg-white/5 text-white/45 hover:border-white/25 hover:text-white/75"
              }`}
              aria-pressed={active}
            >
              {lifeMapTypeLabels[type]}
            </button>
          );
        })}
      </section>
    </div>
  );
}
