import {
  type LifeMapEra,
  type LifeMapNode,
  type LifeMapNodeType,
  type MirrorOfBecoming,
} from "./lifeMapData";

export type LifeMapReplayPhase =
  | "gathering"
  | "threading"
  | "weather"
  | "playing"
  | "reflection"
  | "complete";

export type LifeMapReplaySequence = {
  id: string;
  startNodeId: string;
  nodeSequence: string[];
  currentIndex: number;
  progress: number;
  phase: LifeMapReplayPhase;
  caption: string;
};

const phaseThresholds: Array<{ phase: LifeMapReplayPhase; min: number; caption: string }> = [
  { phase: "gathering", min: 0, caption: "Gathering signal" },
  { phase: "threading", min: 0.18, caption: "Threading memory" },
  { phase: "weather", min: 0.38, caption: "Rendering emotional weather" },
  { phase: "playing", min: 0.56, caption: "Playing memory stream" },
  { phase: "reflection", min: 0.82, caption: "Reflection ready" },
  { phase: "complete", min: 0.98, caption: "Replay complete" },
];

export function clampReplayProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function replayPhaseForProgress(progress: number): { phase: LifeMapReplayPhase; caption: string } {
  const safeProgress = clampReplayProgress(progress);
  return [...phaseThresholds].reverse().find((item) => safeProgress >= item.min) ?? phaseThresholds[0];
}

export function buildLifeMapReplaySequence(startNode: LifeMapNode, nodes: LifeMapNode[], progress = 0): LifeMapReplaySequence {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const sequence = [startNode.id];

  for (const linkedId of startNode.connectedTo) {
    if (nodeById.has(linkedId) && !sequence.includes(linkedId)) sequence.push(linkedId);
    if (sequence.length >= 5) break;
  }

  if (sequence.length < 3) {
    for (const node of nodes) {
      if (node.connectedTo.includes(startNode.id) && !sequence.includes(node.id)) sequence.push(node.id);
      if (sequence.length >= 5) break;
    }
  }

  const safeProgress = clampReplayProgress(progress);
  const phase = replayPhaseForProgress(safeProgress);
  const currentIndex = Math.min(sequence.length - 1, Math.floor(safeProgress * Math.max(1, sequence.length)));

  return {
    id: `replay-${startNode.id}`,
    startNodeId: startNode.id,
    nodeSequence: sequence,
    currentIndex,
    progress: safeProgress,
    phase: phase.phase,
    caption: phase.caption,
  };
}

export function replayCameraTarget(sequence: LifeMapReplaySequence, nodes: LifeMapNode[]): [number, number, number] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const node = nodeById.get(sequence.nodeSequence[sequence.currentIndex]) ?? nodeById.get(sequence.startNodeId);
  return node?.position ?? [0, 0, 0];
}

export function dominantTypes(nodes: LifeMapNode[]): LifeMapNodeType[] {
  const counts = new Map<LifeMapNodeType, number>();
  for (const node of nodes) counts.set(node.type, (counts.get(node.type) ?? 0) + 1 + node.intensity);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([type]) => type);
}

export function generateMirrorOfBecoming(nodes: LifeMapNode[], eras: LifeMapEra[], userId = "demo-user"): MirrorOfBecoming {
  const types = dominantTypes(nodes);
  const strongest = [...nodes].sort((a, b) => b.intensity - a.intensity);
  const recoveryNodes = nodes.filter((node) => node.type === "recovery" || node.type === "ritual");
  const relationshipNodes = nodes.filter((node) => node.type === "relationship");
  const thresholdNodes = nodes.filter((node) => node.type === "threshold");
  const creativeNodes = nodes.filter((node) => node.type === "memory" || node.type === "season" || node.type === "legacy");

  const archetypes = buildArchetypes(types);
  const dominantEra = eras.find((era) => era.nodeIds.some((id) => strongest[0]?.id === id));

  return {
    id: `mirror-${userId}`,
    userId,
    generatedLabel: dominantEra?.title ?? "Current Arc",
    dominantArchetypes: archetypes,
    recurringPatterns: [
      thresholdNodes.length ? "Threshold pressure is being converted into visible structure." : "The map is gathering enough signal to name threshold patterns safely.",
      recoveryNodes.length ? "Recovery appears through small repeatable signals before it becomes a larger arc." : "Recovery signals are still faint and should remain gently interpreted.",
      relationshipNodes.length ? "Relationship weather affects the constellation without defining the whole identity." : "Relationship signals are not yet dominant in this Life Map view.",
    ],
    recoverySignals: recoveryNodes.map((node) => node.title).slice(0, 5),
    relationshipThemes: relationshipNodes.length
      ? relationshipNodes.map((node) => `${node.title}: ${node.subtitle}`).slice(0, 4)
      : ["No dominant relationship theme is ready to render yet."],
    creativeSignals: creativeNodes.map((node) => node.title).slice(0, 5),
    thresholdMoments: thresholdNodes.map((node) => node.title).slice(0, 5),
    summary: buildMirrorSummary(types, nodes.length),
    becomingStatement: buildBecomingStatement(types),
    sourceNodeIds: nodes.map((node) => node.id),
    sourceEraIds: eras.map((era) => era.id),
    confidence: Math.min(0.92, Math.max(0.38, nodes.length / 12 + strongest.slice(0, 3).reduce((sum, node) => sum + node.intensity, 0) / 6)),
  };
}

function buildArchetypes(types: LifeMapNodeType[]) {
  const primary = types[0];
  const secondary = types[1];
  const archetypes = new Set<string>();

  if (primary === "threshold" || secondary === "threshold") archetypes.add("The Quiet Phoenix");
  if (primary === "memory" || secondary === "memory") archetypes.add("The Builder Returning");
  if (primary === "season" || secondary === "forecast") archetypes.add("The Weather Reader");
  if (primary === "relationship" || secondary === "relationship") archetypes.add("The Resonance Keeper");
  if (primary === "legacy" || secondary === "legacy") archetypes.add("The Deep Thread Carrier");
  if (primary === "recovery" || secondary === "ritual") archetypes.add("The Gentle Restorer");

  if (!archetypes.size) archetypes.add("The Mapmaker");
  return [...archetypes].slice(0, 3);
}

function buildMirrorSummary(types: LifeMapNodeType[], nodeCount: number) {
  const primary = types[0] ?? "memory";
  if (nodeCount < 4) return "The Mirror is still gathering enough stars to form a confident identity arc.";
  if (primary === "threshold") return "The current map suggests a person transforming pressure into a visible crossing, then looking for the next stable path.";
  if (primary === "recovery") return "The current map suggests a person learning to recognize return, repair, and nervous-system steadiness as meaningful signals.";
  if (primary === "relationship") return "The current map suggests a person noticing how connection changes the emotional weather without letting it own the whole sky.";
  if (primary === "legacy") return "The current map suggests a person reading long patterns and carrying old threads into a clearer future shape.";
  return "The current map suggests a person turning scattered life signals into navigable structure.";
}

function buildBecomingStatement(types: LifeMapNodeType[]) {
  const primary = types[0] ?? "memory";
  if (primary === "threshold") return "You are becoming someone who can cross pressure without mistaking it for the end of the story.";
  if (primary === "recovery") return "You are becoming someone who notices the small returns before they become full renewal.";
  if (primary === "relationship") return "You are becoming someone who can read connection as weather, not verdict.";
  if (primary === "legacy") return "You are becoming someone who can carry deep patterns without being trapped by them.";
  return "You are becoming someone who turns pressure into structure without losing the softness that helped you notice it.";
}
