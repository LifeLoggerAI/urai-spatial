import type { HomeWorldState } from "../homeWorldTypes";

export function NarratorEffectLayer({ state }: { state: HomeWorldState }) {
  const text = narratorText(state);

  return (
    <>
      <div className="narrator-shimmer" data-testid="home-layer-narrator-shimmer" aria-hidden="true" />
      <aside className="explain-panel" data-testid="home-world-explainability" aria-label="Why the Home World looks this way">
        <p>WHY THIS WORLD</p>
        <span>{text}</span>
      </aside>
      <span className="sr-only" data-testid="home-world-narrator-text">{text}</span>
    </>
  );
}

function narratorText(state: HomeWorldState) {
  if (state.moodState === "shadow") return "The world is using softer light because recent signals suggest heavier emotional weather.";
  if (state.moodState === "recovery") return "The ground is brighter because recovery and growth signals are active.";
  if (state.moodState === "dream") return "The sky is more violet because rest, memory, and dream-like signals are stronger.";
  if (state.recoveryState === "awakened") return "Your world is showing an awakened ecosystem because several growth signals are stable together.";
  return "The world reflects recent mood, energy, recovery, ritual, memory, and rhythm signals.";
}
