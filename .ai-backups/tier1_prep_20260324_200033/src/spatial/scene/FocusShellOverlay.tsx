"use client";

import type { SelectedStar } from "../types/scene";

type FocusShellOverlayProps = {
  selected: SelectedStar | null;
  onReplay: () => void;
  onBack: () => void;
};

export default function FocusShellOverlay({
  selected,
  onReplay,
  onBack,
}: FocusShellOverlayProps) {
  if (!selected) return null;

  return (
    <div className="urai-overlay urai-overlay--focus">
      <div className="urai-overlay__card urai-overlay__card--focus">
        <div className="urai-overlay__eyebrow">Focus</div>
        <h2 className="urai-overlay__title">{selected.title}</h2>
        <div className="urai-overlay__meta">
          <span>{selected.chapter}</span>
          <span>{selected.dateLabel}</span>
          <span>{selected.depthBand}</span>
        </div>
        <p className="urai-overlay__body">{selected.summary}</p>
        <div className="urai-overlay__actions">
          <button className="urai-btn urai-btn--ghost" onClick={onBack} type="button">
            Return to LifeMap
          </button>
          <button className="urai-btn" onClick={onReplay} type="button">
            Enter Replay
          </button>
        </div>
      </div>
    </div>
  );
}
