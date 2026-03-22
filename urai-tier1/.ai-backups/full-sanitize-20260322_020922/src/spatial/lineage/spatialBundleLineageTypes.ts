export type SpatialBundleLineageNode = {
  id: string;
  label: string;
  source: "generated" | "imported";
  storedAt: string;
  isActive: boolean;
  hasSnapshot: boolean;
};

export type SpatialBundleLineageEdge = {
  id: string;
  fromId: string;
  toId: string;
  summary: string;
};

export type SpatialBundleLineageGraph = {
  schema: "urai.spatial.bundle-lineage.v1";
  activeNodeId: string | null;
  nodes: SpatialBundleLineageNode[];
  edges: SpatialBundleLineageEdge[];
  summaryText: string;
};
