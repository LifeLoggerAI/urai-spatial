"use client";

import type { SelectedStar } from "../types/scene";

type ReplayOverlayProps = {
  selected: SelectedStar | null;
  onBack: () => void;
  onExit: () => void;
};

export default function ReplayOverlay({
  selected,
  onBack,
  onExit,
}: ReplayOverlayProps) {
  if (!selected) return null;

  return (
    <div className="urai-overlay urai-overlay--replay">
      <div className="urai-overlay__card urai-overlay__card--replay">
        <div className="urai-overlay__eyebrow">Replay</div>
        <h2 className="urai-overlay__title">{selected.title}</h2>
        <div className="urai-overlay__meta">
          <span>{selected.chapter}</span>
          <span>{selected.dateLabel}</span>
          <span>{selected.memoryTone}</span>
        </div>
        <p className="urai-overlay__body">
          The camera has entered the memory volume around this star. The interface stays minimal so the
          world remains primary and the replay reads as spatial travel rather than a screen overlay.
        </p>
        <div className="urai-overlay__actions">
          <button className="urai-btn urai-btn--ghost" onClick={onBack} type="button">
            Back to Focus
          </button>
          <button className="urai-btn" onClick={onExit} type="button">
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
