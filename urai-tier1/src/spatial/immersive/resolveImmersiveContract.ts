import { resolveImmersiveContractById } from "./resolveImmersiveContractById";

export type ImmersiveContract = {
  id: string | null;
  title: string;
  label: string;
  xrReady: boolean;
  cinematicReady: boolean;
  intelligenceReady: boolean;
  readiness: number;
  mode: string;
};

export function resolveImmersiveContract(
  starId: string | null | undefined,
  mode: string = "HOME"
): ImmersiveContract | null {
  if (!starId) return null;

  const byId = resolveImmersiveContractById(starId, mode);

  return {
    id: starId,
    title: byId?.title ?? "Immersive contract",
    label: byId?.label ?? "Immersive contract ready",
    xrReady: true,
    cinematicReady: true,
    intelligenceReady: true,
    readiness: 72,
    mode,
  };
}

export default resolveImmersiveContract;
