/**
 * Resolve the actual Scenario branch selected by spatial navigation.
 * The world router uses opaque br_ IDs; legacy URLs may contain numeric indexes.
 * A requested branch that is absent from the owner's loaded Scenario must not
 * silently select another branch (and attach the wrong outcome report).
 */
export function resolvePossibleFutureBranchIndex(
  requestedBranch: string | null,
  loadedBranchIds: readonly string[],
  previousIndex = 0,
): number | null {
  const ids = loadedBranchIds.slice(0, 3)
  if (!ids.every(id => /^br_[A-Za-z0-9_-]{12,96}$/.test(id)) || new Set(ids).size !== ids.length) {
    return null
  }
  if (requestedBranch === null || requestedBranch === '') {
    return Number.isSafeInteger(previousIndex) && previousIndex >= 0 && previousIndex < ids.length
      ? previousIndex : 0
  }
  if (/^br_[A-Za-z0-9_-]{12,96}$/.test(requestedBranch)) {
    const index = ids.indexOf(requestedBranch)
    return index >= 0 ? index : null
  }
  if (!/^(0|[1-9][0-9]*)$/.test(requestedBranch)) return null
  const index = Number(requestedBranch)
  return Number.isSafeInteger(index) && index >= 0 && index < ids.length ? index : null
}
