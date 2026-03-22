import { readActiveSpatialAccountId } from "./spatialAccountIO";

export function getSpatialScopedStorageKey(baseKey: string): string {
  return `${baseKey}::${readActiveSpatialAccountId()}`;
}
