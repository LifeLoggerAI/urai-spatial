/** A public env flag is not proof of which Firebase Functions backend answered. */
export const OPERATIONAL_PRIVACY_BACKEND_SCHEMA = 'urai-operational-privacy-capabilities-v1' as const

export function assertOperationalPrivacyBackendCapabilities(
  value: unknown,
  expected: { uid: string; projectId: string },
): void {
  const response = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
  const features = response?.capabilities
  const claims = features && typeof features === 'object' && !Array.isArray(features)
    ? features as Record<string, unknown>
    : null
  if (!expected.uid || !expected.projectId ||
      response?.schema !== OPERATIONAL_PRIVACY_BACKEND_SCHEMA ||
      response?.contract !== 'operational-v1' ||
      response?.uid !== expected.uid ||
      response?.projectId !== expected.projectId ||
      claims?.scopedExports !== true ||
      claims?.scopedDeletion !== true ||
      claims?.ownerExportDownload !== true) {
    throw new Error('OPERATIONAL_PRIVACY_BACKEND_UNVERIFIED')
  }
}
