import SpatialScene from '../../*audit/20260402_175733*PASS_T1_RECOVERY_LOCK/backup/src/spatial/scene/SpatialScene'
import { CanonicalTierLockHud } from '../../urai-tier1/*audit/20260419_021801*tier2_camera_motion_lock/src/spatial/components/CinematicCameraRig'

const publicDemoMode = process.env.NEXT_PUBLIC_PUBLIC_DEMO_MODE === 'true'
const recordingMode = process.env.NEXT_PUBLIC_RECORDING_MODE === 'true'
const showInternalHud = !publicDemoMode && !recordingMode

export default function HomePage() {
  return (
    <>
      <SpatialScene />
      {showInternalHud ? <CanonicalTierLockHud /> : null}
    </>
  )
}
