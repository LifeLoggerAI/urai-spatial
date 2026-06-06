export type MemoryPlaceTimelineEvent = {
  memoryId: string
  timestamp: string
  title: string
  emotionalTone: string
  intensity: number
  objectIds: string[]
  weatherPreset: string
  cameraPreset: 'wide' | 'object-focus' | 'orbit' | 'doorway'
}

export type MemoryPlaceTimeline = {
  id: string
  memoryPlaceId: string
  events: MemoryPlaceTimelineEvent[]
  privacyLevel: 'private' | 'sensitive' | 'shareable' | 'demo'
}

export function makeDemoPlaceTimeline(memoryPlaceId: string, memoryIds: string[], objectIds: string[]): MemoryPlaceTimeline {
  return {
    id: `${memoryPlaceId}-timeline`,
    memoryPlaceId,
    privacyLevel: 'demo',
    events: memoryIds.map((memoryId, index) => ({
      memoryId,
      timestamp: '2026-05-21T00:00:00.000Z',
      title: `Memory marker ${index + 1}`,
      emotionalTone: 'symbolic',
      intensity: 0.5,
      objectIds,
      weatherPreset: 'soft-memory-weather',
      cameraPreset: index === 0 ? 'wide' : 'object-focus',
    })),
  }
}
