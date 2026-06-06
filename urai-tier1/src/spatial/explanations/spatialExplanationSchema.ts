export type SpatialExplanationConfidence = 'low' | 'medium' | 'high'
export type SpatialExplanationControl = 'hide' | 'disable' | 'export' | 'delete' | 'explain' | 'enter' | 'replay'

export type SpatialExplanation = {
  objectId: string
  objectType: string
  reason: string
  dataSources: string[]
  confidence: SpatialExplanationConfidence
  privacyLevel: string
  controls: SpatialExplanationControl[]
}

export function explainMemoryPlace(input: {
  objectId: string
  objectType: string
  privacyLevel: string
  source?: 'demo' | 'firestore' | 'fallback'
}): SpatialExplanation {
  return {
    objectId: input.objectId,
    objectType: input.objectType,
    reason: 'This spatial object is shown because it belongs to the selected memory place.',
    dataSources: [input.source ?? 'fallback'],
    confidence: input.source === 'firestore' ? 'medium' : 'low',
    privacyLevel: input.privacyLevel,
    controls: ['explain', 'hide', 'replay'],
  }
}
