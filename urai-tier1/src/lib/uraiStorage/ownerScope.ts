// Legacy browser caches are partitioned by an explicit caller-provided owner.
// This is NOT authentication, verified consent, or an authorization boundary.
export function resolveLegacyOwnerId(ownerId: string | null | undefined): string | null {
  return typeof ownerId === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(ownerId)
    ? ownerId
    : null;
}

export function legacyOwnerStorageKey(
  namespace: string,
  ownerId: string | null | undefined
): string | null {
  const owner = resolveLegacyOwnerId(ownerId);
  return owner ? `${namespace}:owner:${encodeURIComponent(owner)}:v1` : null;
}
