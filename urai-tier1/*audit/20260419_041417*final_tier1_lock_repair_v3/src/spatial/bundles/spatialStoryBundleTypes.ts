export type SpatialStoryBundle = {
  schema: "urai.spatial.story-bundle.v1";
  id: string;
  label: string;
  createdAt: string;
  exportedAt: string;
  summary?: string;
  summaryText?: string;
  arcs: any[];
  seasonalArcs: any[];
  snapshot?: any;
  account?: any;
  narrator?: any;
};
