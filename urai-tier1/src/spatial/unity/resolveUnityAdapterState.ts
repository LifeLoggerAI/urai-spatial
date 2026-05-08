export type UnityAdapterState = {
  id: string;
  title: string;
  summary: string;
  sceneProfile: string;
  adapterMode: string;
  readiness: number;
  rootAnchor: string;
  payload: string[];
  label: string;
  ready: boolean;
};

const DEFAULT_SCENE_ID = 'urai-spatial-demo-anchor';

function normalizeSceneId(id: string | null | undefined) {
  const normalized = id?.trim();
  return normalized && normalized.length > 0 ? normalized : DEFAULT_SCENE_ID;
}

function normalizeMode(mode: string | null | undefined) {
  const normalized = mode?.trim();
  return normalized && normalized.length > 0 ? normalized : 'preview';
}

export function resolveUnityAdapterStateById(
  id: string | null | undefined,
  mode: string | null | undefined
): UnityAdapterState | undefined {
  const sceneId = normalizeSceneId(id);
  const adapterMode = normalizeMode(mode);

  return {
    id: sceneId,
    title: 'URAI Spatial Unity Adapter',
    summary: 'Exports the selected spatial scene anchor and tier-lock metadata for downstream XR review.',
    sceneProfile: adapterMode === 'replay' ? 'memory-replay' : adapterMode === 'focus' ? 'memory-focus' : 'spatial-preview',
    adapterMode,
    readiness: 1,
    rootAnchor: `urai://spatial/${encodeURIComponent(sceneId)}`,
    payload: [
      'scene-anchor',
      'camera-path',
      'spatial-tier-lock',
      'selected-star',
    ],
    label: 'Unity Adapter',
    ready: true,
  };
}

export function resolveUnityAdapterState(ready: boolean): UnityAdapterState {
  const state = resolveUnityAdapterStateById(DEFAULT_SCENE_ID, 'preview');
  return {
    ...state,
    readiness: ready ? 1 : 0,
    ready,
  };
}
