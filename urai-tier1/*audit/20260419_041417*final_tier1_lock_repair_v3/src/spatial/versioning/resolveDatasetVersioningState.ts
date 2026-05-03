import { buildDatasetVersionSnapshot } from "@/spatial/versioning/buildDatasetVersionSnapshot";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type DatasetVersioningState = {
  id: string;
  title: string;
  summary: string;
  readiness: number;
  versionLabel: string;
  rollbackLabel: string;
  datasetSize: number;
  pendingWrites: number;
  signature: string;
  retainedArtifacts: string[];
};

export function resolveDatasetVersioningStateById(
  id: string | null | undefined
): DatasetVersioningState | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  if (!memory) return undefined;

  const snapshot = buildDatasetVersionSnapshot(id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || undefined);

  return {
    id,
    summary:
      snapshot.pendingWrites > 0
        ? "Version snapshot is ready with rollback metadata and pending write visibility before commit."
        : "Version snapshot is aligned with current dataset state and ready for rollback-safe tagging.",
    readiness: snapshot.readiness,
    versionLabel: snapshot.versionLabel,
    rollbackLabel: snapshot.rollbackLabel,
    datasetSize: snapshot.datasetSize,
    pendingWrites: snapshot.pendingWrites,
    signature: snapshot.signature,
    retainedArtifacts: snapshot.retainedArtifacts,
  };
}
