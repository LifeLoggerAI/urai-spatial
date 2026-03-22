import { resolveWebXREntryStateById } from "@/spatial/webxr/resolveWebXREntryState";
import { resolveXRCameraRigStateById } from "@/spatial/xr-runtime/resolveXRCameraRigState";
import { resolveXRInputStateById } from "@/spatial/input/resolveXRInputState";
import { resolveImmersiveReplayTraversalById } from "@/spatial/traversal/resolveImmersiveReplayTraversal";
import { resolveNarratorOrchestrationById } from "@/spatial/narrator/resolveNarratorOrchestration";

export type WebXRRendererHandoffState = {
  id: string;
  title: string;
  runtimeMode: "focus" | "replay";
  handoffState: "cold" | "ready" | "armed";
  readiness: number;
  rendererTarget: string;
  sessionTarget: string;
  pipeline: string[];
  blockers: string[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveWebXRRendererHandoffById(
  id: string | null | undefined,
  mode: string | null | undefined
): WebXRRendererHandoffState | undefined {
  if (!id) return undefined;

  const webxr = resolveWebXREntryStateById(id, mode);
  const rig = resolveXRCameraRigStateById(id, mode);
  const input = resolveXRInputStateById(id, mode);
  const traversal = resolveImmersiveReplayTraversalById(id, mode);
  const narrator = resolveNarratorOrchestrationById(id, mode);

  if (!webxr && !rig && !input && !traversal && !narrator) return undefined;

  const runtimeMode = mode === "replay" ? "replay" : "focus";

  const readiness = clamp(
    Math.round(
      (webxr?.readiness ?? 0) * 0.30 +
      (rig?.readiness ?? 0) * 0.25 +
      (input?.readiness ?? 0) * 0.20 +
      (traversal?.readiness ?? 0) * 0.15 +
      (narrator?.readiness ?? 0) * 0.10
    ),
    0,
    100
  );

  const handoffState =
    readiness >= 75 ? "armed" :
    readiness >= 45 ? "ready" :
    "cold";

  const rendererTarget =
    runtimeMode === "replay"
      ? "xr-replay-renderer"
      : "xr-focus-renderer";

  const sessionTarget =
    webxr?.targetMode ?? "immersive-vr";

  const pipeline = [
    "session-request",
    "renderer-bind",
    "camera-rig-bind",
    "input-attach",
    runtimeMode === "replay" ? "replay-traversal-bind" : "focus-traversal-bind",
    "narrator-state-bind",
  ];

  const blockers = [
    handoffState === "cold" ? "renderer handoff below armed threshold" : undefined,
    !webxr ? "missing xr entry state" : undefined,
    !rig ? "missing xr camera rig state" : undefined,
    !input ? "missing xr input state" : undefined,
  ].filter((value): value is string => Boolean(value));

  return {
    id,
    title: `WebXR Renderer Handoff ${runtimeMode === "replay" ? "Replay" : "Focus"}`,
    runtimeMode,
    handoffState,
    readiness,
    rendererTarget,
    sessionTarget,
    pipeline,
    blockers,
  };
}
