import { readActiveSpatialAccountId } from "@/spatial/account/spatialAccountIO";

export function getSpatialScopedStorageKey(baseKey: string): string {
  return `${baseKey}::${readActiveSpatialAccountId()}`;
}
