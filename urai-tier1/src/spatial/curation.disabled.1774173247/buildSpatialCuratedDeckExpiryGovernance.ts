import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism";
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

function toTime(value: any): number | null {
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function computeAgeDays(entry: CuratedDeckEntryLike, now: number): number {
  const createdAt =
    toTime(entry.generatedAt) ??
    toTime(entry.createdAt) ??
    toTime(entry.updatedAt) ??
    toTime(entry.storedAt);

  if (createdAt == null) return 0;
  return Math.max(0, Math.round((now - createdAt) / 86400000));
}

function computeExpiryAt(entry: CuratedDeckEntryLike, now: number): number {
  return (
    toTime(entry.expiresAt) ??
    toTime(entry.retentionUntil) ??
    toTime(entry.reopenWatchUntil) ??
    (now + 14 * 86400000)
  );
}

function classifyStatus(expiresInDays: number): SpatialCuratedDeckExpiryGovernanceStatus {
  if (expiresInDays <= 0) return "expired";
  if (expiresInDays <= 7) return "review";
  if (expiresInDays <= 30) return "active";
  return "active";
}

function buildChecks(
  entry: CuratedDeckEntryLike,
  ageDays: number,
  expiresInDays: number,
): SpatialCuratedDeckExpiryGovernanceCheck[] {
  return [
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
      id: "retention-age",
      label: "retention age",
      status: ageDays >= 90 ? "warn" : "pass",
      detail: `${ageDays}d since creation`,
    },
    {
      id: "source-trace",
      label: "source trace",
      status: entry.source ? "pass" : "warn",
      detail: entry.source ? `source ${entry.source}` : "source not set",
    },
  ];
}

function scoreStatus(status: SpatialCuratedDeckExpiryGovernanceStatus): number {
  switch (status) {
    case "expired":
      return 100;
    case "review":
      return 70;
    case "active":
      return 25;
    case "blocked":
      return 0;
  }
}

function computeExpiryPosture(
  expiryScore: number,
  coldStorageEligible: boolean,
  statusCounts: Record<SpatialCuratedDeckExpiryGovernanceStatus, number>,
): string {
  if (coldStorageEligible) return "cold";
  if (statusCounts.expired > 0 || expiryScore >= 80) return "expired";
  if (statusCounts.review > 0 || expiryScore >= 55) return "review";
  return "active";
}

export function buildSpatialCuratedDeckExpiryGovernance(input: {
  entries: CuratedDeckEntryLike[];
  activeEntryId?: string | null;
}): SpatialCuratedDeckExpiryGovernanceSummary {
  const now = uraiNow();

  const entries: SpatialCuratedDeckExpiryGovernanceEntry[] = (input.entries ?? []).map((entry, index) => {
    const ageDays = computeAgeDays(entry, now);
    const expiryAt = computeExpiryAt(entry, now);
    const expiresInDays = Math.round((expiryAt - now) / 86400000);
    const status = classifyStatus(expiresInDays);

    return {
      entryId: entry.id ?? `entry-${index + 1}`,
      title: entry.title ?? entry.label ?? `Entry ${index + 1}`,
      ageDays,
      expiresInDays,
      status,
      checks: buildChecks(entry, ageDays, expiresInDays),
    };
  });

  const statusCounts: Record<SpatialCuratedDeckExpiryGovernanceStatus, number> = {
    active: 0,
    review: 0,
    expired: 0,
    blocked: 0,
  };

  for (const entry of entries) {
    statusCounts[entry.status] += 1;
  }

  const activeEntry =
    entries.find((entry) => entry.entryId === (input.activeEntryId ?? null)) ?? null;

  const expiryScore = entries.length
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            entries.reduce((sum, entry) => sum + scoreStatus(entry.status), 0) / entries.length,
          ),
        ),
      )
    : 0;

  const coldStorageEligible =
    entries.length > 0 &&
    statusCounts.active === 0 &&
    statusCounts.blocked === 0 &&
    (statusCounts.review > 0 || statusCounts.expired > 0);

  const expiryPosture = computeExpiryPosture(
    expiryScore,
    coldStorageEligible,
    statusCounts,
  );

  return {
    schema: "urai.spatial.curated-deck-expiry-governance.v1",
    generatedAt: new Date(now).toISOString(),
    totalEntries: entries.length,
    activeEntryId: activeEntry?.entryId ?? null,
    activeStatus: activeEntry?.status ?? null,
    expiryScore,
    expiryPosture,
    coldStorageEligible,
    statusCounts,
    entries,
  };
}
