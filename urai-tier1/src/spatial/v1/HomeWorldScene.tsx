'use client';

import type { HomeWorldState } from './lifeMapTypes';
import { OrbCompanion } from './OrbCompanion';
import { HomeAvatarSilhouette } from './HomeAvatarSilhouette';

export function HomeWorldScene({ state, onOpenSky }: { state: HomeWorldState; onOpenSky: () => void }) {
  return (
    <section
      className="urai-v1-home"
      data-testid="urai-v1-home-world"
      data-mood={state.mood.primary}
      aria-label="URAI home emotional world"
    >
      <button className="urai-v1-sky-portal" data-testid="urai-v1-sky-portal" type="button" aria-label="Open the Life Map through the sky" onClick={onOpenSky} />
      <div className="urai-v1-home__sky" aria-hidden="true">
        <span className="urai-v1-home__aurora urai-v1-home__aurora--one" />
        <span className="urai-v1-home__aurora urai-v1-home__aurora--two" />
        <span className="urai-v1-home__cloud urai-v1-home__cloud--one" />
        <span className="urai-v1-home__cloud urai-v1-home__cloud--two" />
        <span className="urai-v1-home__portal-shimmer" />
      </div>
      <HomeAvatarSilhouette />
      <OrbCompanion active onClick={onOpenSky} />
      <div className="urai-v1-home__ground" data-testid="urai-v1-ground-plane" aria-hidden="true">
        <span className="urai-v1-home__mist" />
        <span className="urai-v1-home__roots" />
      </div>
      <div className="urai-v1-home__whisper" aria-live="polite">{state.orbWhisper ?? 'The sky is ready when you are.'}</div>
    </section>
  );
}
