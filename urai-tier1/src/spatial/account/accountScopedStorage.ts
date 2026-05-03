import { readActiveSpatialAccountId } from "./spatialAccountIO";

export function getSpatialScopedStorageKey(baseKey: string): string {
  const accountId = readActiveSpatialAccountId();

  const safeAccountId =
    typeof accountId === "string" && accountId.trim().length > 0
      ? accountId.trim()
      : "default";

  const safeBaseKey =
    typeof baseKey === "string" && baseKey.trim().length > 0
      ? baseKey.trim()
      : "state";

  return "urai-spatial:" + safeAccountId + ":" + safeBaseKey;
}
