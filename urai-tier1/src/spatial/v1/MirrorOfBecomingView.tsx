'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { MirrorOfBecomingState } from './lifeMapTypes';

const patternConstellation = [
  { label: 'Loop seen', value: 'Pressure → withdrawal → repair', tone: 'old reflex' },
  { label: 'Softened edge', value: 'Pause before response', tone: 'new option' },
  { label: 'Relationship signal', value: 'Needs spoken earlier', tone: 'clearer bond' },
  { label: 'Self pattern', value: 'Calm returns faster', tone: 'integration' },
] as const;

const changeCards = [
  {
    title: 'Before',
    body: 'The pattern felt like weather happening to you: fast, loud, and hard to name while inside it.',
  },
  {
    title: 'During',
    body: 'The Mirror slows the memory into a visible shape so the loop can be witnessed without becoming a judgment.',
  },
  {
    title: 'After',
    body: 'The same moment becomes a choice point: protect privacy, name the need, return to Focus, or replay the scene with care.',
  },
] as const;

export function MirrorOfBecomingView({ mirror, onClose, onHome }: { mirror: MirrorOfBecomingState; onClose: () => void; onHome: () => void }) {
  return (
    <section className="urai-v1-mirror" data-testid="urai-v1-mirror-view" aria-label="Mirror of Becoming pattern world">
      <div className="urai-v1-mirror__sky" aria-hidden="true" />
      <div className="urai-v1-mirror__surface" aria-hidden="true">
        <span className="urai-v1-mirror__orb" />
        <span className="urai-v1-mirror__glyph">{mirror.symbolicGlyph}</span>
        <span className="urai-v1-mirror__ring urai-v1-mirror__ring--one" />
        <span className="urai-v1-mirror__ring urai-v1-mirror__ring--two" />
      </div>

      <article className="urai-v1-mirror__insight">
        <p className="urai-v1-kicker">Mirror of Becoming</p>
        <h1>{mirror.patternTitle}</h1>
        <p>{mirror.insight}</p>
        <p className="urai-v1-mirror__privacy">Private-safe reflection only. The Mirror shows patterns and choices, not diagnosis, blame, or public identity.</p>
      </article>

      <section className="urai-v1-mirror__constellation" aria-label="Pattern constellation">
        {patternConstellation.map((item, index) => (
          <article key={item.label} style={{ '--mirror-delay': `${index * 90}ms` } as CSSProperties}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.tone}</small>
          </article>
        ))}
      </section>

      <section className="urai-v1-mirror__change" aria-label="Before during and after pattern map">
        {changeCards.map((card) => (
          <article key={card.title}>
            <span>{card.title}</span>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className="urai-v1-mirror__actions" aria-label="Mirror route actions">
        <button type="button" onClick={onClose}>Return to Life Map</button>
        <Link href="/replay">Replay pattern</Link>
        <Link href="/focus">Open Focus</Link>
        <Link href="/passport">Review permissions</Link>
        <button type="button" onClick={onHome}>Return home</button>
      </section>

      <style jsx>{styles}</style>
    </section>
  );
}

const styles = `
.urai-v1-mirror {
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  isolation: isolate;
  color: #f8fbff;
  background:
    radial-gradient(circle at 50% 32%, rgba(226, 246, 255, 0.20), transparent 24rem),
    radial-gradient(circle at 78% 28%, rgba(168, 85, 247, 0.16), transparent 30rem),
    linear-gradient(180deg, #06111f 0%, #030712 58%, #02040a 100%);
}
.urai-v1-mirror__sky {
  position: absolute;
  inset: -12%;
  z-index: -5;
  background-image:
    radial-gradient(circle, rgba(255,255,255,.75) 0 1px, transparent 1.6px),
    radial-gradient(circle, rgba(125,211,252,.48) 0 1px, transparent 1.7px);
  background-size: 190px 190px, 320px 280px;
  opacity: .34;
}
.urai-v1-mirror__surface {
  position: absolute;
  left: 50%;
  top: 44%;
  width: min(58vw, 680px);
  height: min(58vw, 680px);
  transform: translate(-50%, -50%);
  border-radius: 999px;
  border: 1px solid rgba(226, 246, 255, 0.18);
  background:
    radial-gradient(circle, rgba(226, 246, 255, 0.11), rgba(139, 92, 246, 0.07), transparent 70%),
    conic-gradient(from 220deg, rgba(103,232,249,.18), transparent, rgba(216,180,254,.16), transparent, rgba(103,232,249,.18));
  box-shadow: inset 0 0 110px rgba(103, 232, 249, 0.12), 0 0 140px rgba(139, 92, 246, 0.20);
}
.urai-v1-mirror__ring {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(226,246,255,.18);
}
.urai-v1-mirror__ring--one { inset: 13%; transform: rotate(12deg); }
.urai-v1-mirror__ring--two { inset: 28%; border-color: rgba(216,180,254,.18); transform: rotate(-18deg); }
.urai-v1-mirror__glyph {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: clamp(54px, 10vw, 120px);
  color: rgba(235, 250, 255, 0.74);
  text-shadow: 0 0 48px rgba(103, 232, 249, 0.5);
}
.urai-v1-mirror__orb {
  position: absolute;
  left: 50%;
  top: 56%;
  width: 74px;
  height: 74px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: #67e8f9;
  filter: blur(18px);
  opacity: 0.32;
}
.urai-v1-mirror__insight,
.urai-v1-mirror__constellation,
.urai-v1-mirror__change,
.urai-v1-mirror__actions {
  position: absolute;
  z-index: 20;
  pointer-events: auto;
}
.urai-v1-mirror__insight {
  left: clamp(1rem, 4vw, 3rem);
  top: clamp(1rem, 4vw, 3rem);
  width: min(34rem, calc(100vw - 2rem));
  padding: 1.15rem;
  border: 1px solid rgba(226,232,240,.16);
  border-radius: 1.5rem;
  background: rgba(2,6,23,.64);
  box-shadow: 0 24px 90px rgba(0,0,0,.36), inset 0 0 30px rgba(255,255,255,.04);
  backdrop-filter: blur(18px);
}
.urai-v1-mirror__insight h1 { margin: .35rem 0 .6rem; font-size: clamp(2.3rem, 5vw, 4.9rem); line-height: .95; letter-spacing: -.05em; }
.urai-v1-mirror__insight p { margin: 0; color: rgba(226,232,240,.78); line-height: 1.55; }
.urai-v1-kicker { color: rgba(125,211,252,.76) !important; font-size: .72rem; font-weight: 900; letter-spacing: .28em; text-transform: uppercase; }
.urai-v1-mirror__privacy { margin-top: .75rem !important; color: rgba(186,230,253,.78) !important; font-size: .83rem; }
.urai-v1-mirror__constellation {
  right: clamp(1rem, 4vw, 3rem);
  top: clamp(1rem, 4vw, 3rem);
  display: grid;
  gap: .75rem;
  width: min(24rem, calc(100vw - 2rem));
}
.urai-v1-mirror__constellation article,
.urai-v1-mirror__change article {
  border: 1px solid rgba(226,232,240,.14);
  border-radius: 1.35rem;
  background: rgba(15,23,42,.62);
  padding: .9rem;
  box-shadow: 0 18px 70px rgba(0,0,0,.28), inset 0 0 26px rgba(255,255,255,.035);
  backdrop-filter: blur(16px);
}
.urai-v1-mirror__constellation span,
.urai-v1-mirror__change span { color: rgba(125,211,252,.72); font-size: .64rem; font-weight: 900; letter-spacing: .2em; text-transform: uppercase; }
.urai-v1-mirror__constellation strong { display: block; margin-top: .35rem; color: white; }
.urai-v1-mirror__constellation small { color: rgba(226,232,240,.58); }
.urai-v1-mirror__change {
  left: 50%;
  bottom: clamp(5.4rem, 11svh, 8rem);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: .8rem;
  width: min(62rem, calc(100vw - 2rem));
  transform: translateX(-50%);
}
.urai-v1-mirror__change p { margin: .45rem 0 0; color: rgba(226,232,240,.72); font-size: .88rem; line-height: 1.5; }
.urai-v1-mirror__actions {
  left: 50%;
  bottom: max(1rem, env(safe-area-inset-bottom));
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: .5rem;
  width: min(58rem, calc(100vw - 2rem));
  transform: translateX(-50%);
}
.urai-v1-mirror__actions a,
.urai-v1-mirror__actions button {
  border: 1px solid rgba(226,232,240,.18);
  border-radius: 999px;
  background: rgba(226,232,240,.08);
  color: rgba(248,250,252,.92);
  padding: .72rem .95rem;
  font: inherit;
  font-size: .82rem;
  font-weight: 900;
  text-decoration: none;
  cursor: pointer;
}
.urai-v1-mirror__actions a:hover,
.urai-v1-mirror__actions button:hover,
.urai-v1-mirror__actions a:focus-visible,
.urai-v1-mirror__actions button:focus-visible { background: rgba(103,232,249,.16); outline: none; }
@media (max-width: 860px) {
  .urai-v1-mirror { overflow: auto; padding-bottom: 8rem; }
  .urai-v1-mirror__surface { position: relative; left: 50%; top: auto; margin-top: 15rem; width: min(86vw, 28rem); height: min(86vw, 28rem); }
  .urai-v1-mirror__insight,
  .urai-v1-mirror__constellation,
  .urai-v1-mirror__change,
  .urai-v1-mirror__actions { position: relative; left: auto; right: auto; top: auto; bottom: auto; width: auto; transform: none; margin: 1rem; }
  .urai-v1-mirror__change { grid-template-columns: 1fr; }
}
`;
