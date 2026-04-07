
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { SpatialStoryBundleVaultEntry } from "@/spatial/vault/spatialStoryBundleVaultTypes";
import type {
  SpatialBundleLineageEdge,
  SpatialBundleLineageGraph,
  SpatialBundleLineageNode,
} from "@/spatial/lineage/spatialBundleLineageTypes";

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function locomotionMagnitude(entry: SpatialStoryBundleVaultEntry): number {
  const x = entry.bundle.snapshot.locomotion.userX;
  const y = entry.bundle.snapshot.locomotion.userY;
  const z = entry.bundle.snapshot.locomotion.userZ;
  return Math.sqrt(x * x + y * y + z * z);
}

function buildEdge(
  from: SpatialStoryBundleVaultEntry,
  to: SpatialStoryBundleVaultEntry,
): SpatialBundleLineageEdge {
  const sceneModeChanged =
    from.bundle.snapshot.sceneMode !== to.bundle.snapshot.sceneMode;
  const selectedStarChanged =
    (from.bundle.snapshot.selectedStarId ?? null) !==
    (to.bundle.snapshot.selectedStarId ?? null);
  const locomotionDelta = round3(
    locomotionMagnitude(to) - locomotionMagnitude(from),
  );

  const parts = [
    sceneModeChanged ? "scene mode changed" : "scene mode stable",
    selectedStarChanged ? "selection changed" : "selection stable",
    `locomotion delta ${locomotionDelta}`,
  ];

  return {
    id: `edge_${from.id}_${to.id}`,
    fromId: from.id,
    toId: to.id,
    summary: parts.join(" · "),
  };
}

export function buildSpatialBundleLineage(input: {
  entries: SpatialStoryBundleVaultEntry[];
  activeEntryId: string | null;
}): SpatialBundleLineageGraph {
  const nodes: SpatialBundleLineageNode[] = input.entries.map((entry) => ({
    id: entry.id,
    label: entry.label,
    source: entry.source,
    storedAt: new Date((entry as any).storedAt ?? 0).toISOString(),
    isActive: entry.id === input.activeEntryId,
    hasSnapshot: !!entry.bundle.snapshot,
  }));

  const edges: SpatialBundleLineageEdge[] = [];

  for (let i = 1; i < input.entries.length; i += 1) {
    edges.push(buildEdge(input.entries[i - 1], input.entries[i]));
  }

  const activeNode =
    nodes.find((node) => node.id === input.activeEntryId) ?? null;

  const summaryText =
    nodes.length === 0
      ? "No bundle lineage available."
      : `${nodes.length} archived bundles connected by ${edges.length} lineage edges.` +
        (activeNode ? ` Active node: ${activeNode.label}.` : "");

  return {
    schema: "urai.spatial.bundle-lineage.v1",
    activeNodeId: input.activeEntryId,
    nodes,
    edges,
    summaryText,
  };
}
