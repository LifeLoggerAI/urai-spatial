import { lifeMapNodes, type LifeMapNode } from "./lifeMapData";

export const quietResetDemoNode: LifeMapNode = {
  id: "quiet-reset",
  title: "The Quiet Reset",
  subtitle: "A private return through the memory field",
  type: "recovery",
  position: [0.2, 0.35, 1.3],
  intensity: 0.94,
  aura: "#8adfff",
  dateLabel: "May 9, 2026",
  replayAvailable: true,
  summary:
    "A calm recovery memory where pressure softened, perspective returned, and the next step became visible without exposing raw private content.",
  connectedTo: ["memory-thread", "recovery-bloom", "threshold-moment"],
  occurredAt: "2026-05-09T12:00:00.000Z",
  sourceType: "manual_seed",
  clusterId: "quiet-reset",
  eraId: "threshold-return",
  narratorHint: "This was the moment the noise lowered enough for you to return.",
  privacyLevel: "private",
  tags: ["sample", "recovery", "quiet-reset"],
};

export const canonicalLifeMapDemoNodes: LifeMapNode[] = lifeMapNodes.some(
  (node) => node.id === quietResetDemoNode.id,
)
  ? lifeMapNodes
  : [quietResetDemoNode, ...lifeMapNodes];
