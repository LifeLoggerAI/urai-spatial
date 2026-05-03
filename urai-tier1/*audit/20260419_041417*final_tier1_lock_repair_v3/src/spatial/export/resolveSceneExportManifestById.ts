import type { Mode } from "@/lib/uraiCanon/types";

export type SceneExportManifest = {
  id: string | null;
  title: string;
  label: string;
  sceneMode: Mode;
};

export function resolveSceneExportManifestById(
  starId: string | undefined,
  mode: Mode
): SceneExportManifest | null {
  if (!starId && mode === "HOME") return null;

  const id = starId ?? null;

  return {
    id,
    sceneMode: mode,
  };
}
