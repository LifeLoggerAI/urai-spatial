export type ImmersiveContractState = {
  id: string | null;
  title: string;
  label: string;
  sceneMode: string;
  xrReady: boolean;
  cinematicReady: boolean;
  intelligenceReady: boolean;
  readiness: number;
};

export function resolveImmersiveContractById(
  starId: string | undefined,
  mode: string = "HOME"
): ImmersiveContractState | null {
  if (!starId) return null;

  return {
    id: starId,
    title: "Immersive contract",
    label: "Immersive contract ready",
    sceneMode: mode,
    xrReady: true,
    cinematicReady: true,
    intelligenceReady: true,
    readiness: 72,
  };
}
