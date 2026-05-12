"use client";

import type { CompanionState } from "@/lib/firebase/firebaseSpatialSchema";

type Props = { state: CompanionState; expanded: boolean; onToggle: () => void };

export function CompanionOrb({ state, expanded, onToggle }: Props) {
  return (
    <div className="companionOrbWrap">
      <button className="companionOrb" type="button" aria-label="Open companion message" aria-expanded={expanded} onClick={onToggle} style={{ ["--orb-color" as string]: state.orb.color, ["--pulse" as string]: `${state.orb.pulseRate}s`, ["--scale" as string]: state.orb.scale }}>
        <span />
      </button>
      {expanded ? (
        <section className="companionPanel" aria-live="polite">
          <strong>Companion · {state.mood}</strong>
          <p>{state.message}</p>
          {state.suggestedAction ? <a href={state.suggestedAction.route}>{state.suggestedAction.label}</a> : null}
          <small>Voice tone: {state.voiceTone}. Audio stays silent until explicitly enabled.</small>
        </section>
      ) : null}
      <style jsx>{`.companionOrbWrap{position:absolute;left:50%;top:39.5%;transform:translate(-50%,-50%);z-index:5}.companionOrb{width:5.2rem;height:5.2rem;border:0;border-radius:999px;background:radial-gradient(circle,var(--orb-color),rgba(100,205,255,.38) 42%,rgba(60,160,220,.08) 72%,transparent);cursor:pointer;filter:drop-shadow(0 0 3.8rem var(--orb-color));animation:orbBreath var(--pulse) ease-in-out infinite;transform:scale(var(--scale));}.companionOrb span{display:block;inset:22%;position:absolute;border-radius:999px;background:rgba(255,255,255,.34);filter:blur(2px)}.companionOrb:focus-visible{outline:2px solid rgba(220,250,255,.9);outline-offset:5px}.companionPanel{position:absolute;left:50%;top:6.3rem;width:min(22rem,86vw);transform:translateX(-50%);padding:1rem;border:1px solid rgba(192,235,255,.22);border-radius:1rem;background:rgba(4,14,28,.72);backdrop-filter:blur(16px);color:#dff7ff}.companionPanel p{margin:.45rem 0;color:#c6e5f2}.companionPanel a{color:#9fe8ff;font-weight:800}.companionPanel small{display:block;color:#90b6c8}@keyframes orbBreath{0%,100%{filter:drop-shadow(0 0 2.6rem var(--orb-color));opacity:.86}50%{filter:drop-shadow(0 0 4.6rem var(--orb-color));opacity:1}}@media (prefers-reduced-motion:reduce){.companionOrb{animation:none}}`}</style>
    </div>
  );
}
