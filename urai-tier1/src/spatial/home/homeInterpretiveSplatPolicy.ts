export const HOME_INTERPRETIVE_SPLAT_PREFIX = '/assets/urai/home-production/interpretive/'

export function resolveHomeInterpretiveSplatAsset(value?: string | null) {
  const candidate = value?.trim()
  if (!candidate) return null
  const forbidden = candidate.includes('..') || candidate.includes('\\') || candidate.includes('?') || candidate.includes('#')
  if (forbidden || !candidate.startsWith(HOME_INTERPRETIVE_SPLAT_PREFIX) || !candidate.endsWith('.splat')) {
    throw new Error('HOME_INTERPRETIVE_SPLAT_ASSET_NOT_APPROVED')
  }
  return candidate
}
