import type { SceneMode } from "../state/sceneStore";

export type ImmersiveContractState = {
  id: string | null;
  title: string;
  label: string;
  sceneMode: SceneMode;
};

export function resolveImmersiveContractById(
  starId: string | undefined,
  mode: SceneMode
): ImmersiveContractState | null {
  if (!starId && mode === "home") return null;

  const id = starId ?? null;
  const suffix = id ? ` for ${id}` : "";

  return {
    id,
    title: `Immersive Contract · ${mode}`,
    label: `Immersive contract ready${suffix}`,
    sceneMode: mode,
  };
}
