import { FinalFocusChamber } from '@/app/FinalMemorySurfaces'

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
        style={routeFingerprintStyle}
      >
        Selected memory camera chamber
      </span>
      <FinalFocusChamber />
    </>
  )
}
