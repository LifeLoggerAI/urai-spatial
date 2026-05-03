import { resolveMemoryClusterById } from "@/spatial/clustering/resolveMemoryCluster";
import { resolveNarrativeReplayById } from "@/spatial/narrative/resolveNarrativeReplay";
import { resolveCinematicReplayById } from "@/spatial/cinematic/resolveCinematicReplay";
import { resolveUnityAdapterStateById } from "@/spatial/unity/resolveUnityAdapterState";
import { resolveXRInputStateById } from "@/spatial/input/resolveXRInputState";

export type TraversalNode = {
  id: string;
  label: string;
  detail: string;
};

export type ImmersiveReplayTraversal = {
  id: string;
  title: string;
  modeLabel: string;
  readiness: number;
  pathLabel: string;
  guidance: string;
  nodes: TraversalNode[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveImmersiveReplayTraversalById(
  id: string | null | undefined,
  mode: string | null | undefined
): ImmersiveReplayTraversal | undefined {
  if (!id) return undefined;

  const cluster = resolveMemoryClusterById(id);
  const narrative = resolveNarrativeReplayById(id);
  const cinematic = resolveCinematicReplayById(id);
  const unity = resolveUnityAdapterStateById(id, mode);
  const input = resolveXRInputStateById(id, mode);

  if (!cluster && !narrative && !cinematic && !unity && !input) return undefined;

  const readiness = clamp(
    Math.round(
      ((unity?.readiness ?? 40) * 0.35) +
      ((input?.readiness ?? 40) * 0.25) +
      ((cluster?.neighbors.length ?? 0) * 6) +
      (mode === "REPLAY" ? 12 : 0)
    ),
    0,
    100
  );

  const title =
    narrative?.title
      : "Immersive Replay Traversal";

  const modeLabel = mode === "REPLAY" ? "Replay Traversal" : "Focus Traversal";

  const pathLabel =
    mode === "REPLAY"
      ? "subject → beat → adjacent echo → return"
      : "focus → cluster → orbit → return";

  const guidance =
    mode === "REPLAY"
      ? "Advance through the replay path in short anchored steps and keep narrative framing stable."
      : "Traverse outward from the focus node, inspect adjacency, then collapse back to anchor.";

  const neighborNodes =
    (cluster?.neighbors ?? []).slice(0, 3).map((neighbor, index) => ({
      id: neighbor.id,
      detail: [neighbor.chapter, neighbor.timeband, neighbor.emotion]
        .filter((value): value is string => Boolean(value))
        .join(" · "),
    }));

  const nodes: TraversalNode[] = [
    {
      label: "Anchor",
      detail: narrative?.kicker ?? cinematic?.sceneLabel ?? "entry anchor",
    },
    {
      label: "Action",
      detail: input?.primaryAction ?? "focus advance",
    },
    ...neighborNodes,
    {
      label: "Return",
      detail: unity?.adapterMode ?? "baseline return",
    },
  ];

  return {
    id,
    title,
    modeLabel,
    readiness,
    pathLabel,
    guidance,
    nodes,
  };
}
