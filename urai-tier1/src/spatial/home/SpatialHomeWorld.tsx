"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHomeWorldState } from "./useHomeWorldState";
import { useAscentTransition } from "./motion/useAscentTransition";
import HomeScene from "./visual/HomeScene";

export default function SpatialHomeWorld({ userId = "demo-user" }: { userId?: string }) {
  const router = useRouter();
  const { state, loading, explanation, source, refresh } = useHomeWorldState(userId);
  const { opening, enter } = useAscentTransition("/life-map");
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div
      data-testid="urai-spatial-stage"
      data-camera={opening ? "ascent" : "home"}
      data-loading={loading}
      data-ground-tier={state.groundTier}
      data-orb-tier={state.orbTier}
      data-sky-tier={state.skyTier}
      data-homeworld-confidence={state.confidence?.label ?? "low"}
      data-homeworld-explanation={showExplanation ? "open" : "closed"}
      data-homeworld-source={source}
      data-mood={state.moodState}
      data-recovery={state.recoveryState}
      data-energy={Math.round(state.energyScore)}
      data-narrator-speaking={state.narratorSpeaking}
    >
      <HomeScene
        homeWorldState={state}
        state={opening ? "enteringLifeMap" : "home"}
        opening={opening}
        enterLifeMap={enter}
        onReplay={() => router.push("/replay", { scroll: false })}
        onUnwind={() => router.push("/mirror", { scroll: false })}
        onFocus={() => router.push("/focus", { scroll: false })}
      />

      <nav className="dock" data-testid="urai-command-ribbon" aria-label="Home World controls">
        <button type="button" onClick={enter} disabled={opening}>
          LifeMap
        </button>
        <button type="button" onClick={() => router.push("/mirror", { scroll: false })} disabled={opening}>
          Mirror
        </button>
        <button type="button" onClick={() => router.push("/replay", { scroll: false })} disabled={opening}>
          Replay
        </button>
        <button
          type="button"
          onClick={() => setShowExplanation((open) => !open)}
          aria-expanded={showExplanation}
        >
          Why am I seeing this?
        </button>
      </nav>

      {showExplanation ? (
        <aside
          className="explanation"
          data-testid="homeworld-explanation-panel"
          data-homeworld-explanation="open"
          aria-label="Why am I seeing this?"
        >
          <div className="explanation-head">
            <div>
              <p className="eyebrow">Home World V3</p>
              <h2>{explanation.headline}</h2>
            </div>
            <button type="button" onClick={() => setShowExplanation(false)} aria-label="Close explanation">
              ×
            </button>
          </div>

          <p>{explanation.summary}</p>

          <div className="badges">
            <span>{explanation.confidence.label} confidence</span>
            <span>Derived only · no raw audio stored</span>
            {source === "local" ? <span>Local-only</span> : null}
          </div>

          <ul>
            {explanation.whyAmISeeingThis.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <div className="channels">
            <article>
              <strong>Ground</strong>
              <p>{explanation.ground}</p>
            </article>
            <article>
              <strong>Orb</strong>
              <p>{explanation.orb}</p>
            </article>
            <article>
              <strong>Sky</strong>
              <p>{explanation.sky}</p>
            </article>
          </div>

          <p className="privacy">{explanation.privacy.note}</p>
          <button type="button" className="refresh" onClick={refresh}>
            Refresh world
          </button>
        </aside>
      ) : null}
    </div>
  );
}