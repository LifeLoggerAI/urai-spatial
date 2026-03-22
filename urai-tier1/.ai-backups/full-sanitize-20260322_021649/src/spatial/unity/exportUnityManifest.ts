import { resolveUnityAdapterStateById } from "@/spatial/unity/resolveUnityAdapterState";

export type UnityExportManifest = {
  sceneId: string;
  adapterMode: string;
  readiness: number;
  rootAnchor: string;
  payload: string[];
};

export function exportUnityManifestById(
  id: string | null | undefined,
  mode: string | null | undefined
): UnityExportManifest | undefined {
  const state = resolveUnityAdapterStateById(id, mode);
  if (!state) return undefined;

  return {
    sceneId: state.id,
    adapterMode: state.adapterMode,
    readiness: state.readiness,
    rootAnchor: state.rootAnchor,
    payload: state.payload,
  };
}
