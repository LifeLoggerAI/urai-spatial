"use client";

import type { SelectedStar } from "../types/scene";

type ReplayOverlayProps = {
  selected: SelectedStar | null;
};

export default function ReplayOverlay({ selected }: ReplayOverlayProps) {
  if (!selected) return null;

  const title =
    selected.title ||
    selected.label ||
    selected.chapter ||
    "Replay";

  const body =
    selected.transcript ||
    selected.detail ||
    selected.description ||
    selected.summary ||
    "";

  return (
    <div className="pointer-events-none absolute inset-0 z-[50]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(66,110,255,0.16),rgba(0,0,0,0.72)_58%,rgba(0,0,0,0.92)_100%)]" />
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,820px)] -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-white/10 bg-black/34 px-7 py-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.30em] text-white/50">
          Replay
        </div>
        <div className="mt-2 text-[clamp(1.7rem,3vw,2.8rem)] font-semibold leading-tight">
          {title}
        </div>
        {selected.dateLabel ? (
          <div className="mt-2 text-sm text-white/58">{selected.dateLabel}</div>
        ) : null}
        {body ? (
          <div className="mt-5 max-w-[68ch] text-[15px] leading-7 text-white/82">
            {body}
          </div>
        ) : null}
        <div className="mt-6 text-xs uppercase tracking-[0.28em] text-white/38">
          Esc → Focus → LifeMap → Home
        </div>
      </div>
    </div>
  );
}
