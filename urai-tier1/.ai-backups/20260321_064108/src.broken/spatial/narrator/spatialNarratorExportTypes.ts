export type SpatialNarratorExport = {
  schema: "urai.spatial.narrator-export.v1";
  exportedAt: string;
  accountId: string;
  accountLabel: string | null;
  lensLabel: string | null;
  compareSetLabel: string | null;
  sceneMode: string;
  selectedStarId: string | null;
  title: string;
  scriptText: string;
  metadata: {
    locomotionDistance: number | null;
    compareSetCount: number;
  };
};
