import type { SceneMode } from "../state/sceneStore";

export type XRInputState = {
  id: string | null;
  title: string;
  label: string;
  sceneMode: SceneMode;
};

export function resolveXRInputStateById(
  starId: string | undefined,
  mode: SceneMode
): XRInputState | null {
  if (!starId && mode === "home") return null;

  const id = starId ?? null;
  const suffix = id ? ` for ${id}` : "";

  return {
    id,
    title: `XR Input · ${mode}`,
    label: `XR input ready${suffix}`,
    sceneMode: mode,
  };
}
