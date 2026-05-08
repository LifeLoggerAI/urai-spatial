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

const DEFAULT_SCENE_ID = "urai-spatial-demo-anchor";

function normalizeSceneId(id: string | null | undefined) {
  const normalized = id?.trim();
  return normalized && normalized.length > 0 ? normalized : DEFAULT_SCENE_ID;
}

function normalizeMode(mode: string | null | undefined) {
  const normalized = mode?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : "preview";
}

export function resolveUnityAdapterStateById(
  id: string | null | undefined,
  mode: string | null | undefined
): UnityAdapterState {
  const sceneId = normalizeSceneId(id);
  const adapterMode = normalizeMode(mode);

  const isReplay = adapterMode === "replay";
  const isFocus = adapterMode === "focus";

  return {
    id: sceneId,
    title: isReplay
      ? "Replay bridge ready"
      : isFocus
        ? "Focus bridge ready"
        : "URAI Spatial Unity Adapter",
    summary: isReplay
      ? "The selected memory has enough scene context to hand off replay anchors to a Unity client."
      : isFocus
        ? "The selected memory can be exported as a focused spatial manifest for Unity integration."
        : "Exports the selected spatial scene anchor and tier-lock metadata for downstream XR review.",
    sceneProfile: isReplay
      ? "memory-replay"
      : isFocus
        ? "memory-focus"
        : "spatial-preview",
    adapterMode,
    readiness: isReplay || isFocus ? 1 : 0.72,
    rootAnchor: `urai://spatial/${encodeURIComponent(sceneId)}`,
    payload: [
      "scene-anchor",
      "camera-path",
      "spatial-tier-lock",
      "selected-star",
      "replay-signal",
    ],
    label: "Unity Adapter",
    ready: isReplay || isFocus,
  };
}

export function resolveUnityAdapterState(ready: boolean): UnityAdapterState {
  const state = resolveUnityAdapterStateById(DEFAULT_SCENE_ID, "preview");

  return {
    ...state,
    readiness: ready ? 1 : 0,
    ready,
  };
}