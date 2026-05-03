import type { Mode } from "@/lib/uraiCanon/types";

export type XRInputState = {
  id: string | null;
  title: string;
  label: string;
  sceneMode: Mode;
};

export function resolveXRInputStateById(
  starId: string | undefined,
  mode: Mode
): XRInputState | null {
  if (!starId && mode === "HOME") return null;

  return {
    id: starId ?? null,
    title: "XR input",
    label: "XR input ready",
    sceneMode: mode,
  };
}
