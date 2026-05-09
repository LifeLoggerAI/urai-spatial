'use client';

export function AscentTransition({ reducedMotion, onComplete }: { reducedMotion: boolean; onComplete: () => void }) {
  return (
    <section
      className="urai-v1-ascent"
      data-testid="urai-v1-ascent-transition"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      aria-label="Sky opening into Life Map"
      role="status"
    >
      <div className="urai-v1-ascent__sky" aria-hidden="true" />
      <span className="urai-v1-ascent__thread" aria-hidden="true" />
      <span className="urai-v1-ascent__mist" aria-hidden="true" />
      <span className="urai-v1-ascent__stars" aria-hidden="true" />
      <button type="button" className="urai-v1-ascent__enter" onClick={onComplete}>
        Enter Life Map
      </button>
    </section>
  );
}
