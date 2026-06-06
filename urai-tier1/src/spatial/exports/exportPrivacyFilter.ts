export type SpatialExportPrivacyMode = 'abstract' | 'city-only' | 'redacted' | 'exact-opt-in'

export type SpatialExportCandidate = {
  id: string
  title: string
  privacyLevel: 'private' | 'sensitive' | 'shareable' | 'demo'
  locationPrivacy?: string
  includeLocationLabel?: boolean
  includeExactCoordinates?: boolean
  includePeopleNames?: boolean
}

export type SpatialExportDecision = {
  allowed: boolean
  privacyMode: SpatialExportPrivacyMode
  title: string
  reasons: string[]
}

export function filterSpatialExport(candidate: SpatialExportCandidate): SpatialExportDecision {
  const reasons: string[] = []

  if (candidate.privacyLevel === 'sensitive' || candidate.privacyLevel === 'private') {
    reasons.push('private-or-sensitive-object')
  }

  if (candidate.includeExactCoordinates && candidate.locationPrivacy !== 'exact-share-opt-in') {
    reasons.push('exact-location-not-opted-in')
  }

  const allowed = reasons.length === 0 || candidate.privacyLevel === 'demo'

  return {
    allowed,
    privacyMode: allowed ? 'redacted' : 'abstract',
    title: allowed ? candidate.title : 'Private spatial export',
    reasons,
  }
}
