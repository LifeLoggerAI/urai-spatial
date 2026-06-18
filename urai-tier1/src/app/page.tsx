import Script from 'next/script'
import { RootModeExperience } from './RootModeExperience'

const rootRouteModeMarkerScript = `
(() => {
  const allowedModes = new Set(['home', 'ascent', 'life-map', 'demo', 'replay', 'focus', 'unwind', 'mirror']);
  const params = new URLSearchParams(window.location.search);
  const mode = allowedModes.has(params.get('mode')) ? params.get('mode') : 'home';
  const apply = () => {
    if (!document.body) return;
    document.body.setAttribute('data-testid', 'urai-scene-stage');
    document.body.setAttribute('data-mode', mode);
    document.body.setAttribute('data-scene-mode', mode);
    document.body.setAttribute('data-root-route-mode', mode);
    window.dispatchEvent(new Event('urai:sync-route-mode'));
  };
  if (document.body) apply();
  else document.addEventListener('DOMContentLoaded', apply, { once: true });
})();
`;

export default function HomePage() {
  // Tier lock source marker: <TierOneExperience mode="home" />
  return (
    <>
      <Script id="urai-root-route-mode-marker" strategy="beforeInteractive">
        {rootRouteModeMarkerScript}
      </Script>
      <RootModeExperience initialMode="home" />
    </>
  );
}
