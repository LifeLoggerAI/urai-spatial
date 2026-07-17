export type ReplayOperationKind = 'save' | 'hide' | 'correct'

export type ReplayCorrection = {
  field: 'title' | 'summary' | 'emotion' | 'people' | 'place'
  previousValue: unknown
  nextValue: unknown
  reason?: string
}

export type ReplayOperation = {
  id: string
  memoryId: string
  manifestId: string
  ownerId: string
  kind: ReplayOperationKind
  created