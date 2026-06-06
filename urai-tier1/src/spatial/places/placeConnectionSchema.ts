export type MemoryPlaceConnectionType =
  | 'same-person'
  | 'same-season'
  | 'same-location'
  | 'same-emotion'
  | 'same-chapter'
  | 'before-after'
  | 'recovery-path'
  | 'legacy-thread'

export type MemoryPlaceConnection = {
  id: string
  userId: string | null
  fromPlaceId: string
  toPlaceId: string
  connectionType: MemoryPlaceConnectionType
  strength: number
  emotionalTone: string
  visualStyle: 'path' | 'bridge' | 'door' | 'river' | 'constellation-line' | 'portal'
  privacyLevel: 'private' | 'sensitive' | 'shareable' | 'demo'
}

export function makeDemoPlaceConnection(fromPlaceId: string, toPlaceId: string, index: number): MemoryPlaceConnection {
  return {
    id: `${fromPlaceId}-to-${toPlaceId}`,
    userId: null,
    fromPlaceId,
    toPlaceId,
    connectionType: index % 2 === 0 ? 'same-emotion' : 'before-after',
    strength: 0.45 + Math.min(0.45, index * 0.08),
    emotionalTone: 'symbolic',
    visualStyle: 'constellation-line',
    privacyLevel: 'demo',
  }
}
