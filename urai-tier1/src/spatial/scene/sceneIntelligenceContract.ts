export type UraiSceneRouteId =
  | 'home'
  | 'life-map'
  | 'focus'
  | 'replay'
  | 'unwind'
  | 'spatial-ar-vr'
  | 'privacy-controls'
  | 'status';

export type UraiSceneVersion = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7';

export type UraiSceneFallbackMode = 'fallback-safe' | 'asset-active' | 'degraded';
export type UraiSceneTransitionState = 'entry' | 'stable' | 'handoff' | 'return';
export type UraiScenePrivacyMode = 'public-safe' | 'private-memory' | 'consent-required';

export type UraiSceneIntelligenceState = {
  readonly version: UraiSceneVersion;
  readonly routeId: UraiSceneRouteId;
  readonly sceneId: string;
  readonly routePath: string;
  readonly memoryId?: string;
  readonly assetPackId: string;
  readonly fallbackMode: UraiSceneFallbackMode;
  readonly transitionState: UraiSceneTransitionState;
  readonly privacyMode: UraiScenePrivacyMode;
  readonly evidenceId: string;
};

export type UraiSceneIntelligenceTransition = {
  readonly from: UraiSceneRouteId;
  readonly to: UraiSceneRouteId;
  readonly intent: 'enter' | 'focus' | 'replay' | 'recover' | 'return' | 'inspect';
  readonly safe: boolean;
  readonly reason: string;
};
