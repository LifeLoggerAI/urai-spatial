export const XR_RELEASE_AUTHORITY = {
  launchClaim: 'preview-only-not-physically-verified',
  physicalHardwareCertified: false,
  productionFinal: false,
  statement: 'URAI ships XR-aware preview and capability boundaries without claiming Quest, controller, hand-tracking, comfort, performance, or physical-device certification until retained hardware evidence exists.',
  evidenceRequired: [
    'physical device identity',
    'browser and runtime version',
    'navigation capture',
    'controller or hand input proof',
    'comfort verification',
    'frame-pacing evidence',
    'rollback or disable path',
  ],
} as const

export function canClaimPhysicalXrRelease() {
  return XR_RELEASE_AUTHORITY.physicalHardwareCertified && XR_RELEASE_AUTHORITY.productionFinal
}
