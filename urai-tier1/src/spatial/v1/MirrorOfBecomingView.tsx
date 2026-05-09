'use client';

import type { MirrorOfBecomingState } from './lifeMapTypes';

export function MirrorOfBecomingView({ mirror, onClose, onHome }: { mirror: MirrorOfBecomingState; onClose: () => void; onHome: () => void }) {
  return (
    <section className="urai-v1-mirror" data-testid="urai-v1-mirror-view" aria-label="Mirror of Becoming">
      <div className="urai-v1-mirror__surface" aria-hidden="true">
        <span className="urai-v1-mirror__orb" />
        <span className="urai-v1-mirror__glyph">{mirror.symbolicGlyph}</span>
      </div>
      <article className="urai-v1-mirror__insight">
        <p className="urai-v1-kicker">Mirror of Becoming</p>
        <h2>{mirror.patternTitle}</h2>
        <p>{mirror.insight}</p>
        <div className="urai-v1-mirror__actions">
          <button type="button" onClick={onClose}>Return to Life Map</button>
          <button type="button" onClick={onHome}>Return home</button>
        </div>
      </article>
    </section>
  );
}
