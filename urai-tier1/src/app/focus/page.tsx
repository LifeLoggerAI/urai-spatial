import { FinalFocusChamber } from '@/app/FinalMemorySurfaces'

const tierShellAuditMarker = 'TierOneExperience'

const routeFingerprintStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

export default function FocusRoutePage() {
  return (
    <>
      <span
        data-testid="focus-route-launch-fingerprint"
        data-urai-route-fingerprint="focus-selected-memory-camera-chamber"
        data-tier-shell-audit={tierShellAuditMarker}
        style={routeFingerprintStyle}
      >
        Selected memory camera chamber
      </span>
      <FinalFocusChamber />
    </>
  )
}
