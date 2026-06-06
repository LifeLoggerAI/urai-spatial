import { getHapticCue, SpatialHapticCueId } from '@/spatial/haptics/hapticCueRegistry'
import { getSoundCue, SpatialSoundCueId } from '@/spatial/sound/soundCueRegistry'

export type SpatialCueMetadata = {
  soundCueId: SpatialSoundCueId
  hapticCueId: SpatialHapticCueId
  soundLabel: string
  hapticLabel: string
  reducedMotionSafe: boolean
  privacySafe: boolean
}

export function getSpatialCueMetadata(soundCueId: SpatialSoundCueId, hapticCueId: SpatialHapticCueId): SpatialCueMetadata {
  const sound = getSoundCue(soundCueId)
  const haptic = getHapticCue(hapticCueId)
  return {
    soundCueId,
    hapticCueId,
    soundLabel: sound.label,
    hapticLabel: haptic.label,
    reducedMotionSafe: haptic.reducedMotionSafe,
    privacySafe: sound.privacySafe,
  }
}
