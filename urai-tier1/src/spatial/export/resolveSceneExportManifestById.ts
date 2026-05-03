export type SceneExportManifest = {
  id: string | null;
  title: string;
  label: string;
  sceneMode: string;
};

export function resolveSceneExportManifestById(
  starId: string | undefined,
  mode: string = "HOME"
): SceneExportManifest {
  return {
    id: starId ?? null,
    title: "Scene export",
    label: "Scene export ready",
    sceneMode: mode,
  };
}
