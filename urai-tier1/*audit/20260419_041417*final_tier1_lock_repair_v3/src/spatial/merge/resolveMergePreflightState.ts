import { buildBatchDiffAudit } from "@/spatial/merge/buildBatchDiffAudit";
import { resolveMemorySphereById } from "@/spatial/memory/resolveMemorySphere";

export type MergePreflightState = {
  id: string;
  title: string;
  summary: string;
  readiness: number;
  existingCount: number;
  incomingCount: number;
  matchedCount: number;
  newCount: number;
  changedCount: number;
  conflicts: string[];
  actions: string[];
};

export function resolveMergePreflightStateById(
  id: string | null | undefined
): MergePreflightState | undefined {
  if (!id) return undefined;

  const memory = resolveMemorySphereById(id);
  if (!memory) return undefined;

  const audit = buildBatchDiffAudit();

  return {
    id,
    summary:
      audit.conflictingIds.length === 0
        ? "Incoming rows are ready for merge with low conflict risk."
        : "Incoming rows are mergeable, but changed records should be reviewed before persistence.",
    readiness: audit.readiness,
    existingCount: audit.existingCount,
    incomingCount: audit.incomingCount,
    matchedCount: audit.matchedCount,
    newCount: audit.newCount,
    changedCount: audit.changedCount,
    conflicts: audit.conflictingIds,
  };
}
