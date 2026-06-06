export type PlaceReplayBeatAnimation = 'glow' | 'open' | 'fade' | 'bloom' | 'focus' | 'none'

export type PlaceReplayBeat = {
  id: string
  memoryPlaceId: string
  targetPlaceObjectId?: string
  startMs: number
  durationMs: number
  title: string
  narratorText: string
  cameraAnchor?: [number, number, number]
  objectAnimation: PlaceReplayBeatAnimation
  soundCue?: string
  hapticCue?: string
}

export type PlaceReplayManifest = {
  id: string
  memoryPlaceId: string
  title: string
  beatIds: string[]
  durationMs: number
  privacyLevel: 'private' | 'sensitive' | 'shareable' | 'demo'
}

export function makeDemoPlaceReplayBeats(memoryPlaceId: string, objectIds: string[]): PlaceReplayBeat[] {
  return [
    {
      id: `${memoryPlaceId}-beat-enter`,
      memoryPlaceId,
      startMs: 0,
      durationMs: 4500,
      title: 'Enter the place',
      narratorText: 'The place opens as a symbolic memory scene.',
      objectAnimation: 'glow',
    },
    {
      id: `${memoryPlaceId}-beat-object`,
      memoryPlaceId,
      targetPlaceObjectId: objectIds[0],
      startMs: 4500,
      durationMs: 5000,
      title: 'Focus an object',
      narratorText: 'A nearby object becomes the first replay anchor.',
      objectAnimation: 'focus',
    },
    {
      id: `${memoryPlaceId}-beat-return`,
      memoryPlaceId,
      startMs: 9500,
      durationMs: 3500,
      title: 'Return safely',
      narratorText: 'The replay closes with a safe return path.',
      objectAnimation: 'fade',
    },
  ]
}
