import type { SpatialAccountManifest } from "./spatialAccountTypes";

const MANIFEST_KEY = "urai.spatial.account.manifest.v1";
const ACTIVE_ACCOUNT_KEY = "urai.spatial.account.active.id";
const FALLBACK_ACCOUNT_ID = "local-spatial-account";

type JsonRecord = Record<string, unknown>;

function isRecord(value: any): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJsonRecord(key: string): JsonRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: any = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeJsonRecord(key: string, value: JsonRecord): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function asManifest(value: JsonRecord | null): SpatialAccountManifest {
  return (value ?? {}) as SpatialAccountManifest;
}

function readStringField(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value ? value : null;
}

export function readSpatialAccountManifest(): SpatialAccountManifest {
  return asManifest(readJsonRecord(MANIFEST_KEY));
}

export function writeSpatialAccountManifest(
  next: SpatialAccountManifest | ((current: SpatialAccountManifest) => SpatialAccountManifest)
): SpatialAccountManifest {
  const current = readSpatialAccountManifest();
  const resolved = typeof next === "function" ? next(current) : next;
  const record: JsonRecord = isRecord(resolved) ? resolved : {};

  writeJsonRecord(MANIFEST_KEY, record);

  const candidateId =
    readStringField(record, "activeAccountId") ??
    readStringField(record, "accountId") ??
    readStringField(record, "id");

  if (candidateId && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, candidateId);
    } catch {}
  }

  return record as SpatialAccountManifest;
}

export function readActiveSpatialAccountId(): string {
  if (typeof window === "undefined") return FALLBACK_ACCOUNT_ID;

  try {
    const explicit = window.localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (explicit) return explicit;

    const manifest = readJsonRecord(MANIFEST_KEY);
    if (manifest) {
      return (
        readStringField(manifest, "activeAccountId") ??
        readStringField(manifest, "accountId") ??
        readStringField(manifest, "id") ??
        FALLBACK_ACCOUNT_ID
      );
    }
  } catch {}

  return FALLBACK_ACCOUNT_ID;
}

export function writeActiveSpatialAccountId(accountId: string): string {
  const finalId = accountId || FALLBACK_ACCOUNT_ID;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, finalId);
    } catch {}
  }

  return finalId;
}
