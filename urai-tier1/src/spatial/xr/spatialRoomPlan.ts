export type SpatialRoomMode = 'vr' | 'ar' | 'webxr-preview'
export type SpatialRoomSafety = 'private-local' | 'shared-redacted' | 'public-demo'

export interface SpatialRoomPlan {
  roomId: string
  mode: SpatialRoomMode
  safety: SpatialRoomSafety
  manifestIds: string[]
  maxParticipants: number
  requiresExplicitEntry: boolean
  rawCaptureAllowed: false
  roomCopy: string
}

export function buildSpatialRoomPlan({
  roomId,
  mode,
  manifestIds,
  safety = 'private-local',
}: {
  roomId: string
  mode: SpatialRoomMode
  manifestIds: string[]
  safety?: SpatialRoomSafety
}): SpatialRoomPlan {
  const maxParticipants = safety === 'private-local' ? 1 : safety === 'shared-redacted' ? 4 : 12
  return {
    roomId,
    mode,
    safety,
    manifestIds: Array.from(new Set(manifestIds)).slice(0, 48),
    maxParticipants,
    requiresExplicitEntry: true,
    rawCaptureAllowed: false,
    roomCopy: mode === 'ar'
      ? 'AR room places redacted memory anchors into the current environment after explicit entry.'
      : mode === 'vr'
        ? 'VR room opens a private constellation chamber with redacted memory stars.'
        : 'WebXR preview validates the spatial room without leaving the browser shell.',
  }
}

export function canEnterSpatialRoom(plan: SpatialRoomPlan) {
  return plan.requiresExplicitEntry && !plan.rawCaptureAllowed && plan.manifestIds.length > 0
}
