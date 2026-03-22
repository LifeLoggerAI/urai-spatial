import { buildBatchDiffAudit } from "@/spatial/merge/buildBatchDiffAudit";

export type PersistenceSyncPlan = {
  totalActions: number;
  insertCount: number;
  updateCount: number;
  skipCount: number;
  writeCount: number;
  readiness: number;
  queue: Array<{
    id: string;
    operation: "insert" | "update" | "skip";
    destination: string;
    payloadKeys: string[];
  }>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildPersistenceSyncPlan(): PersistenceSyncPlan {
  const audit = buildBatchDiffAudit();

  const queue = audit.actions.map((action) => ({
    id: action.id,
    operation: action.action,
    destination: `memoryNodes/${action.id}`,
    payloadKeys:
      action.action === "skip"
        ? ["id"]
        : ["id", "title", "summary", "chapter", "timeband", "emotion", "color", "intensity"],
  }));

  const insertCount = audit.actions.filter((item) => item.action === "insert").length;
  const updateCount = audit.actions.filter((item) => item.action === "update").length;
  const skipCount = audit.actions.filter((item) => item.action === "skip").length;
  const writeCount = insertCount + updateCount;

  const readiness = clamp(
    Math.round(
      writeCount * 16 +
      skipCount * 8 -
      audit.conflictingIds.length * 10
    ),
    0,
    100
  );

  return {
    totalActions: audit.actions.length,
    insertCount,
    updateCount,
    skipCount,
    writeCount,
    readiness,
    queue,
  };
}
