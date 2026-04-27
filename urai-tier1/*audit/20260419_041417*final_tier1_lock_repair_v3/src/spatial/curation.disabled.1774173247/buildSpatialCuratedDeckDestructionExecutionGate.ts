import { buildSpatialCuratedDeckDestructionAuthorization } from "@/spatial/curation/buildSpatialCuratedDeckDestructionAuthorization";
import type { SpatialCuratedDeckDestructionExecutionGateSummary } from "@/spatial/curation/spatialCuratedDeckDestructionExecutionGateTypes";

export type BuildSpatialCuratedDeckDestructionExecutionGateInput =
  Parameters<typeof buildSpatialCuratedDeckDestructionAuthorization>[0];

export function buildSpatialCuratedDeckDestructionExecutionGate(
  input: BuildSpatialCuratedDeckDestructionExecutionGateInput,
): SpatialCuratedDeckDestructionExecutionGateSummary {
  const authorization = buildSpatialCuratedDeckDestructionAuthorization(input);

  return {
    ...authorization,
    schema: "urai.spatial.curated-deck-destruction-execution-gate.v1",
  };
}
