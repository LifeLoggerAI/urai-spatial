import type {
  SpatialCuratedDeckExpiryGovernanceCheck,
  SpatialCuratedDeckExpiryGovernanceEntry,
  SpatialCuratedDeckExpiryGovernanceStatus,
  SpatialCuratedDeckExpiryGovernanceSummary,
} from "@/spatial/curation/spatialCuratedDeckExpiryGovernanceTypes";

type CuratedDeckEntryLike = {
  id?: string;
  title?: string;
  label?: string;
  generatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  storedAt?: string;
  expiresAt?: string;
  retentionUntil?: string;
  reopenWatchUntil?: string;
  source?: string;
};

function toTime(value: unknown): number | null {
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function ageDays(entry: CuratedDeckEntryLike, now: number): number {
  const created =
    toTime(entry.generatedAt) ??
    toTime(entry.createdAt) ??
    toTime(entry.updatedAt) ??
    toTime(entry.storedAt);
  if (created == null) return 0;
  return Math.max(0, Math.round((now - created) / 86400000));
}

function expiryMs(entry: CuratedDeckEntryLike, now: number): number | null {
  return (
    toTime(entry.expiresAt) ??
    toTime(entry.retentionUntil) ??
    toTime(entry.reopenWatchUntil) ??
    (now + 14 * 86400000)
  );
}

function classify(expiresInDays: number): SpatialCuratedDeckExpiryGovernanceStatus {
  if (expiresInDays <= 0) return "expired";
  if (expiresInDays <= 7) return "review";
  if (expiresInDays <= 30) return "active";
  return "active";
}

function makeChecks(
  entry: CuratedDeckEntryLike,
  age: number,
  expiresInDays: number,
): SpatialCuratedDeckExpiryGovernanceCheck[] {
  const checks: SpatialCuratedDeckExpiryGovernanceCheck[] = [
    {
      id: "clock",
      label: "expiry clock",
      status: expiresInDays <= 0 ? "fail" : expiresInDays <= 7 ? "warn" : "pass",
      detail:
        expiresInDays <= 0
          ? "expiry reached"
          : expiresInDays <= 7
            ? `expires in ${expiresInDays}d`
            : `expires in ${expiresInDays}d`,
    },
    {
      id: "retention",
      label: "retention age",
      status: age >= 90 ? "warn" : "pass",
      detail: `${age}d since creation`,
    },
    {
      id: "provenance",
      label: "source trace",
      status: entry.source ? "pass" : "warn",
      detail: entry.source ? `source ${entry.source}` : "source not set",
    },
  ];
  return checks;
}

export function buildSpatialCuratedDeckExpiryGovernance(input: {
  entries: CuratedDeckEntryLike[];
  activeEntryId?: string | null;
}): SpatialCuratedDeckExpiryGovernanceSummary {
  const now = Date.now();

  const entries: SpatialCuratedDeckExpiryGovernanceEntry[] = (input.entries ?? []).map((entry, index) => {
    const age = ageDays(entry, now);
    const exp = expiryMs(entry, now) ?? now;
    const expiresInDays = Math.round((exp - now) / 86400000);
    const status = classify(expiresInDays);

    return {
      entryId: entry.id ?? `entry-${index + 1}`,
      title: entry.title ?? entry.label ?? `Entry ${index + 1}`,
      ageDays: age,
      expiresInDays,
      status,
      checks: makeChecks(entry, age, expiresInDays),
    };
  });

  const counts: Record<SpatialCuratedDeckExpiryGovernanceStatus, number> = {
    active: 0,
    review: 0,
    expired: 0,
    blocked: 0,
  };

  for (const entry of entries) counts[entry.status] += 1;

  const active = entries.find((entry) => entry.entryId === (input.activeEntryId ?? null)) ?? null;

  return {
    schema: "urai.spatial.curated-deck-expiry-governance.v1",
    generatedAt: new Date(now).toISOString(),
    totalEntries: entries.length,
    activeEntryId: active?.entryId ?? null,
    activeStatus: active?.status ?? null,
    statusCounts: counts,
    entries,
  };
}
