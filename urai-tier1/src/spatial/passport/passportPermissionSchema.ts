export type PassportPermissionCategory =
  | 'location'
  | 'audio'
  | 'calendar'
  | 'contacts'
  | 'motion'
  | 'health'
  | 'camera'
  | 'notifications'
  | 'memory-places'
  | 'exports'

export type PassportPermissionState = 'off' | 'ask' | 'on' | 'limited'

export type PassportPermission = {
  id: string
  category: PassportPermissionCategory
  title: string
  state: PassportPermissionState
  creates: string
  privacyNote: string
  canExport: boolean
  canDelete: boolean
}

export const DEMO_PASSPORT_PERMISSIONS: PassportPermission[] = [
  {
    id: 'permission-location',
    category: 'location',
    title: 'Location Memory Places',
    state: 'limited',
    creates: 'Symbolic place clusters and private place doors.',
    privacyNote: 'Exact place data stays hidden unless explicitly enabled.',
    canExport: false,
    canDelete: true,
  },
  {
    id: 'permission-memory-places',
    category: 'memory-places',
    title: 'Memory Places',
    state: 'on',
    creates: 'Symbolic scenes, objects, and replay beats.',
    privacyNote: 'Private places are not public by default.',
    canExport: true,
    canDelete: true,
  },
  {
    id: 'permission-exports',
    category: 'exports',
    title: 'Spatial Exports',
    state: 'ask',
    creates: 'Shareable redacted images, videos, and scrolls.',
    privacyNote: 'Exports pass through redaction first.',
    canExport: true,
    canDelete: false,
  },
]
