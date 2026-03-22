import type { SceneMode } from "../state/sceneStore";

export type SceneExportManifest = {
  id: string | null;
  title: string;
  label: string;
  sceneMode: SceneMode;
};

export function resolveSceneExportManifestById(
  starId: string | undefined,
  mode: SceneMode
): SceneExportManifest | null {
  if (!starId && mode === "home") return null;

  const id = starId ?? null;
  const suffix = id ? ` for ${id}` : "";

  return {
    id,
    title: `Scene Export · ${mode}`,
    label: `Scene export ready${suffix}`,
    sceneMode: mode,
  };
}
