export type UnityAdapterState = {
  id: string;
  title: string;
  sceneProfile: string;
  adapterMode: string;
  readiness: number;
  ready: boolean;
  rootAnchor: string;
  payload: string[];
  summary: string;
};

function normalizedMode(mode: string | null | undefined) {
  return (mode ?? 'HOME').toUpperCase();
}

export function resolveUnityAdapterState(ready: boolean): Pick<UnityAdapterState, 'title' | 'ready'> {
  return {
    title: 'Unity Adapter',
    ready,
  };
}

export function resolveUnityAdapterStateById(
  id: string | null | undefined,
  mode: string | null | undefined,
): UnityAdapterState | undefined {
  const sceneId = id?.trim();
  if (!sceneId) return undefined;

  const sceneMode = normalizedMode(mode);
  const adapterMode = sceneMode === 'REPLAY' ? 'immersive-replay' : sceneMode === 'FOCUS' ? 'focused-memory' : 'spatial-preview';
  const readiness = sceneMode === 'REPLAY' || sceneMode === 'FOCUS' ? 1 : 0.72;

  return {
    id: sceneId,
    title: sceneMode === 'REPLAY' ? 'Replay bridge ready' : 'Unity bridge ready',
    sceneProfile: sceneMode,
    adapterMode,
    readiness,
    ready: readiness >= 1,
    rootAnchor: `urai://${sceneMode.toLowerCase()}/${encodeURIComponent(sceneId)}`,
    payload: [
      'scene-profile',
      'selected-star',
      'camera-anchor',
      'tier-boundary',
      'replay-signal',
    ],
    summary: sceneMode === 'REPLAY'
      ? 'The selected memory has enough scene context to hand off replay anchors to a Unity client.'
      : 'The selected memory can be exported as a stable spatial manifest for Unity integration.',
  };
}
