export type AnchorType =
  | 'identity'
  | 'work'
  | 'health'
  | 'relationships'
  | 'growth'
  | 'legacy'

export interface AnchorNode {
  id: string
  label: string
  type: AnchorType
  color: string
}

export const anchorData: AnchorNode[] = [
  { id: 'identity', label: 'Identity', type: 'identity', color: '#88ccff' },
  { id: 'work', label: 'Work', type: 'work', color: '#ffaa88' },
  { id: 'health', label: 'Health', type: 'health', color: '#88ffaa' },
  { id: 'relationships', label: 'Relationships', type: 'relationships', color: '#ff88cc' },
  { id: 'growth', label: 'Growth', type: 'growth', color: '#cc88ff' },
  { id: 'legacy', label: 'Legacy', type: 'legacy', color: '#ffd966' }
]
