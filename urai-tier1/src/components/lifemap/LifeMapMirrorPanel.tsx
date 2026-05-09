"use client";

import type { MirrorOfBecoming } from "./lifeMapData";

type LifeMapMirrorPanelProps = {
  mirror: MirrorOfBecoming;
  active: boolean;
  onClose: () => void;
};

export function LifeMapMirrorPanel({ mirror, active, onClose }: LifeMapMirrorPanelProps) {
  if (!active) return null;

  return (
    <aside className="pointer-events-auto absolute right-4 top-28 z-30 max-h-[calc(100vh-11rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-[2rem] border border-fuchsia-100/20 bg-slate-950/68 p-5 text-white shadow-2xl shadow-fuchsia-950/40 backdrop-blur-2xl sm:right-6 sm:top-32">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.36em] text-fuchsia-100/65">
            Mirror of Becoming / {mirror.generatedLabel}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-fuchsia-50">
            Identity Arc
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Close Mirror of Becoming"
        >
          Esc
        </button>
      </div>

      <p className="mt-5 rounded-3xl border border-fuchsia-100/10 bg-fuchsia-100/8 p-4 text-base leading-7 text-fuchsia-50/88">
        “{mirror.becomingStatement}”
      </p>

      <p className="mt-5 text-sm leading-6 text-slate-100/78">{mirror.summary}</p>

      <section className="mt-5">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Dominant Archetypes</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {mirror.dominantArchetypes.map((item) => (
            <span key={item} className="rounded-full border border-fuchsia-100/20 bg-fuchsia-100/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-fuchsia-50/85">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <MirrorList title="Recurring Patterns" items={mirror.recurringPatterns} />
        <MirrorList title="Recovery Signals" items={mirror.recoverySignals} />
        <MirrorList title="Relationship Themes" items={mirror.relationshipThemes} />
        <MirrorList title="Creative Signals" items={mirror.creativeSignals} />
        <MirrorList title="Threshold Moments" items={mirror.thresholdMoments} />
      </section>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.24em] text-white/45">
          <span>Confidence</span>
          <span>{Math.round(mirror.confidence * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-fuchsia-100 shadow-[0_0_22px_rgba(244,114,182,0.72)]"
            style={{ width: `${Math.round(mirror.confidence * 100)}%` }}
          />
        </div>
      </div>
    </aside>
  );
}

function MirrorList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-100/76">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
