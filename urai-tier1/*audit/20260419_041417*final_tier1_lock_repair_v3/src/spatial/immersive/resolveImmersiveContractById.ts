import type { Mode } from "@/lib/uraiCanon/types";

export type ImmersiveContractState = {
  id: string | null;
  title: string;
  label: string;
  sceneMode: Mode;
};

export function resolveImmersiveContractById(
  starId: string | undefined,
  mode: Mode
): ImmersiveContractState | null {
  if (!starId && mode === "HOME") return null;

  const id = starId ?? null;

  return {
    id,
    sceneMode: mode,
  };
}
