import { getMemoryDataset } from "@/spatial/replay/resolveReplayScene";
import { buildPersistenceSyncPlan } from "@/spatial/persistence/buildPersistenceSyncPlan";

type LooseRecord = Record<string, unknown>;

export type DatasetVersionSnapshot = {
  versionLabel: string;
  rollbackLabel: string;
  datasetSize: number;
  pendingWrites: number;
  signature: string;
  retainedArtifacts: string[];
  readiness: number;
};

function str(value: any): string {
  return typeof value === "string" ? value : "";
}

function checksum(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  return unsigned.toString(16).padStart(8, "0");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildDatasetVersionSnapshot(versionSeed?: string): DatasetVersionSnapshot {
  const dataset = getMemoryDataset() as LooseRecord[];
  const plan = buildPersistenceSyncPlan();

  const signatureSource = dataset
    .map((row) => [str(row.id), str(row.title), str(row.chapter), str(row.timeband), str(row.emotion)].join("|"))
    .sort()
    .join("::");

  const signature = checksum(signatureSource || "empty-dataset");
  const suffix = versionSeed ?? signature.slice(0, 8);


  const readiness = clamp(
    Math.round(
      dataset.length * 4 +
      plan.writeCount * 10 +
      (plan.skipCount * 3)
    ),
    0,
    100
  );

  return {
    versionLabel,
    rollbackLabel,
    datasetSize: dataset.length,
    pendingWrites: plan.writeCount,
    signature,
    retainedArtifacts: [
      "dataset snapshot",
      "merge audit",
      "persistence queue",
      "rollback marker",
    ],
    readiness,
  };
}
