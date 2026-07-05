import type { UraiSceneIntelligenceState, UraiSceneIntelligenceTransition } from './sceneIntelligenceContract';

export const uraiSceneRegistry = [
  {
    version: 'v1',
    routeId: 'home',
    sceneId: 'home-threshold',
    routePath: '/home',
    assetPackId: 'v1-home-ground',
    fallbackMode: 'fallback-safe',
    transitionState: 'entry',
    privacyMode: 'public-safe',
    evidenceId: 'v1-home-threshold',
  },
  {
    version: 'v2',
    routeId: 'life-map',
    sceneId: 'life-map-galaxy',
    routePath: '/life-map',
    assetPackId: 'v2-life-map',
    fallbackMode: 'fallback-safe',
    transitionState: 'stable',
    privacyMode: 'private-memory',
    evidenceId: 'v2-life-map-galaxy',
  },
  {
    version: 'v3',
    routeId: 'focus',
    sceneId: 'focus-memory-chamber',
    routePath: '/focus',
    assetPackId: 'v3-focus',
    fallbackMode: 'fallback-safe',
    transitionState: 'handoff',
    privacyMode: 'private-memory',
    evidenceId: 'v3-focus-memory-chamber',
  },
  {
    version: 'v4',
    routeId: 'replay',
    sceneId: 'replay-memory-film',
    routePath: '/replay',
    assetPackId: 'v4-replay',
    fallbackMode: 'fallback-safe',
    transitionState: 'handoff',
    privacyMode: 'private-memory',
    evidenceId: 'v4-replay-memory-film',
  },
  {
    version: 'v5',
    routeId: 'unwind',
    sceneId: 'unwind-return',
    routePath: '/unwind',
    assetPackId: 'v5-unwind-mirror',
    fallbackMode: 'fallback-safe',
    transitionState: 'return',
    privacyMode: 'private-memory',
    evidenceId: 'v5-unwind-return',
  },
  {
    version: 'v6',
    routeId: 'privacy-controls',
    sceneId: 'privacy-consent-console',
    routePath: '/privacy-controls',
    assetPackId: 'v6-system-controls',
    fallbackMode: 'fallback-safe',
    transitionState: 'stable',
    privacyMode: 'consent-required',
    evidenceId: 'v6-privacy-controls',
  },
  {
    version: 'v7',
    routeId: 'spatial-ar-vr',
    sceneId: 'spatial-ar-vr-entry',
    routePath: '/spatial/ar-vr',
    assetPackId: 'v7-scene-intelligence',
    fallbackMode: 'fallback-safe',
    transitionState: 'entry',
    privacyMode: 'public-safe',
    evidenceId: 'v7-spatial-ar-vr-entry',
  },
] as const satisfies readonly UraiSceneIntelligenceState[];

export const uraiSceneContinuity = [
  { from: 'home', to: 'life-map', intent: 'enter', safe: true, reason: 'Home threshold enters Life Map.' },
  { from: 'life-map', to: 'focus', intent: 'focus', safe: true, reason: 'Life Map node can enter Focus.' },
  { from: 'focus', to: 'replay', intent: 'replay', safe: true, reason: 'Focused memory can enter Replay.' },
  { from: 'replay', to: 'unwind', intent: 'recover', safe: true, reason: 'Replay can hand off to Unwind recovery.' },
  { from: 'unwind', to: 'life-map', intent: 'return', safe: true, reason: 'Unwind returns to Life Map.' },
  { from: 'home', to: 'privacy-controls', intent: 'inspect', safe: true, reason: 'Home can inspect privacy controls.' },
] as const satisfies readonly UraiSceneIntelligenceTransition[];

export function getUraiScene(routeId: UraiSceneIntelligenceState['routeId']) {
  return uraiSceneRegistry.find((scene) => scene.routeId === routeId) ?? null;
}
