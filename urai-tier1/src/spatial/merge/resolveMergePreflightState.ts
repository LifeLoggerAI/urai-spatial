import { buildBatchDiffAudit } from "@/spatial/merge/buildBatchDiffAudit";

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

type LooseAudit = Record<string, unknown>;

function numberFrom(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArrayFrom(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function resolveMergePreflightStateById(
  id: string | null | undefined
): MergePreflightState | undefined {
  if (!id) return undefined;

  const audit = buildBatchDiffAudit() as LooseAudit;
  const conflicts = stringArrayFrom(audit.conflictingIds);

  const readiness = numberFrom(audit.readiness);
  const existingCount = numberFrom(audit.existingCount);
  const incomingCount = numberFrom(audit.incomingCount);
  const matchedCount = numberFrom(audit.matchedCount);
  const newCount = numberFrom(audit.newCount);
  const changedCount = numberFrom(audit.changedCount);

  const actions =
    conflicts.length === 0
      ? ["Approve merge", "Persist incoming rows", "Rebuild memory index"]
      : ["Review conflicts", "Confirm changed records", "Run merge again"];

  return {
    id,
    title: "Merge preflight",
    summary:
      conflicts.length === 0
        ? "Incoming rows are ready for merge with low conflict risk."
        : "Incoming rows are mergeable, but changed records should be reviewed before persistence.",
    readiness,
    existingCount,
    incomingCount,
    matchedCount,
    newCount,
    changedCount,
    conflicts,
    actions,
  };
}

export default resolveMergePreflightStateById;
