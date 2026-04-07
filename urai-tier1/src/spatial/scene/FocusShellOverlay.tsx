"use client";

import type { SelectedStar } from "../types/scene";

type FocusShellOverlayProps = {
  selected: SelectedStar | null;
};

export default function FocusShellOverlay({ selected }: FocusShellOverlayProps) {
  if (!selected) return null;

  const title =
    selected.title ||
    selected.label ||
    selected.chapter ||
    selected.signature ||
    "Selected Memory";

  const body =
    selected.summary ||
    selected.detail ||
    selected.description ||
    selected.transcript ||
    "";

  const meta = [selected.dateLabel, selected.chapter, selected.timeband]
    .filter(Boolean)
    .join(" • ");

  const tags = Array.isArray(selected.tags) ? selected.tags : [];

  return (
    <div className="pointer-events-none absolute inset-0 z-[40]">
      <div className="absolute left-1/2 top-[8vh] w-[min(92vw,760px)] -translate-x-1/2 rounded-[28px] border border-white/10 bg-black/28 px-6 py-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="text-[11px] uppercase tracking-[0.30em] text-white/55">
          Focus
        </div>
        <div className="mt-2 text-[clamp(1.5rem,2.8vw,2.5rem)] font-semibold leading-tight">
          {title}
        </div>
        {meta ? <div className="mt-2 text-sm text-white/60">{meta}</div> : null}
        {body ? (
          <div className="mt-4 max-w-[64ch] text-[15px] leading-7 text-white/80">
            {body}
          </div>
        ) : null}
        {tags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.slice(0, 8).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/68"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
