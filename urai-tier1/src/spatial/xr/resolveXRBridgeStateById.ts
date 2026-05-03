export type XRBridgeState = {
  id: string | null;
  title: string;
  label: string;
  sceneMode: string;
  ready: boolean;
};

export function resolveXRBridgeStateById(
  starId: string | undefined,
  mode: string = "HOME"
): XRBridgeState | null {
  if (!starId) return null;

  return {
    id: starId,
    title: "XR bridge",
    label: "XR bridge ready",
    sceneMode: mode,
    ready: true,
  };
}
