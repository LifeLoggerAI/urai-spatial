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
      (mode === "replay" ? 12 : 0)
    ),
    0,
    100
  );

  const title =
    narrative?.title
      ? `${narrative.title} Traversal`
      : "Immersive Replay Traversal";

  const modeLabel = mode === "replay" ? "Replay Traversal" : "Focus Traversal";

  const pathLabel =
    mode === "replay"
      ? "subject → beat → adjacent echo → return"
      : "focus → cluster → orbit → return";

  const guidance =
    mode === "replay"
      ? "Advance through the replay path in short anchored steps and keep narrative framing stable."
      : "Traverse outward from the focus node, inspect adjacency, then collapse back to anchor.";

  const neighborNodes =
    (cluster?.neighbors ?? []).slice(0, 3).map((neighbor, index) => ({
      id: neighbor.id,
      label: `${index + 1}. ${neighbor.title}`,
      detail: [neighbor.chapter, neighbor.timeband, neighbor.emotion]
        .filter((value): value is string => Boolean(value))
        .join(" · "),
    }));

  const nodes: TraversalNode[] = [
    {
      id: `${id}-anchor`,
      label: "Anchor",
      detail: narrative?.kicker ?? cinematic?.sceneLabel ?? "entry anchor",
    },
    {
      id: `${id}-action`,
      label: "Action",
      detail: input?.primaryAction ?? "focus advance",
    },
    ...neighborNodes,
    {
      id: `${id}-return`,
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
