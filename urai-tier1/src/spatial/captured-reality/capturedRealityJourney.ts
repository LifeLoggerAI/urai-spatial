const SAFE_ASSET_ID = /^[A-Za-z0-9._-]{1,128}$/
const SAFE_MEMORY_ID = /^[A-Za-z0-9._:-]{1,120}$/

/** Only opaque identifiers travel through the existing journey; no source names or URLs. */
export function capturedRealityJourneyEntryHref(assetId: string, memoryId: string) {
  if (!SAFE_ASSET_ID.test(assetId) || !SAFE_MEMORY_ID.test(memoryId)) return null
  const params = new URLSearchParams({ assetId, memoryId })
  return `/spatial/captured-reality?${params.toString()}`
}

export function capturedRealityJourneyReturnHref(memoryId: string | null) {
  if (!memoryId || !SAFE_MEMORY_ID.test(memoryId)) return '/life-map'
  return `/replay?${new URLSearchParams({ memoryId }).toString()}`
}
