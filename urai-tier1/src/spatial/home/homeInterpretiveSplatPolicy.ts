export const HOME_INTERPRETIVE_SPLAT_PREFIX = '/assets/urai/home-production/interpretive/'

const APPROVED_ASSET_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.splat$/

export function resolveHomeInterpretiveSplatAsset(value?: string | null) {
  const candidate = value?.trim()
  if (!candidate) return null

  const hasApprovedPrefix = candidate.startsWith(HOME_INTERPRETIVE_SPLAT_PREFIX)
  const assetName = hasApprovedPrefix ? candidate.slice(HOME_INTERPRETIVE_SPLAT_PREFIX.length) : ''
  const forbidden =
    candidate.includes('\\') ||
    candidate.includes('?') ||
    candidate.includes('#') ||
    candidate.includes('%') ||
    assetName.includes('/') ||
    assetName.includes('..') ||
    !APPROVED_ASSET_NAME.test(assetName)

  if (forbidden || !hasApprovedPrefix) {
    throw new Error('HOME_INTERPRETIVE_SPLAT_ASSET_NOT_APPROVED')
  }
  return candidate
}
