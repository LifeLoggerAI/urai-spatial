import { buildPersistenceSyncPlan } from "@/spatial/persistence/buildPersistenceSyncPlan";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type PersistenceSyncState = {
  id: string;
  title: string;
  summary: string;
  readiness: number;
  writeCount: number;
  insertCount: number;
  updateCount: number;
  skipCount: number;
  queuePreview: string[];
};

export function resolvePersistenceSyncStateById(
  id: string | null | undefined
): PersistenceSyncState | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  if (!memory) return undefined;

  const plan = buildPersistenceSyncPlan();

  return {
    id,
    summary:
      plan.writeCount > 0
        ? "Imported rows are now mapped into persistence-ready write operations for canonical memory storage."
        : "No pending writes detected. Current import batch is aligned with stored dataset state.",
    readiness: plan.readiness,
    writeCount: plan.writeCount,
    insertCount: plan.insertCount,
    updateCount: plan.updateCount,
    skipCount: plan.skipCount,
  };
}
