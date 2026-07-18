export type WorkforceState = 'idle' | 'observing-locally' | 'preparing' | 'awaiting-owner-approval' | 'executing' | 'completed' | 'blocked' | 'revoked'
export type ServiceAvailability = 'available' | 'degraded' | 'offline'

export type GroundDestination = {
  id: string
  label: string
  detail: string
  href: string
  color: string
  position: [number, number, number]
  camera: [number, number, number]
  lookAt: [number, number, number]
  workforceState: WorkforceState
  availability: ServiceAvailability
}

export const DESTINATIONS: readonly GroundDestination[] = [
  { id: 'reception', label: 'Reception', detail: 'Today and arrivals', href: '/ground?district=reception', color: '#67e8f9', position: [-5.8, 0, -5], camera: [-3.7, 1.65, -0.4], lookAt: [-5.8, 1.1, -5], workforceState: 'observing-locally', availability: 'available' },
  { id: 'privacy', label: 'Privacy Sanctuary', detail: 'Consent and local control', href: '/privacy-controls?from=ground', color: '#a78bfa', position: [5.8, 0, -5], camera: [3.7, 1.65, -0.4], lookAt: [5.8, 1.1, -5], workforceState: 'awaiting-owner-approval', availability: 'available' },
  { id: 'council', label: 'Council', detail: 'Approvals and decisions', href: '/ground?district=council', color: '#facc6b', position: [0, 0, -9], camera: [0, 1.7, -3.6], lookAt: [0, 1.2, -9], workforceState: 'preparing', availability: 'available' },
  { id: 'logistics', label: 'Logistics', detail: 'Tasks and movement', href: '/ground?district=logistics&service=jobs', color: '#fb7185', position: [-8.5, 0, -12.5], camera: [-5.2, 1.7, -7.1], lookAt: [-8.5, 1.2, -12.5], workforceState: 'blocked', availability: 'degraded' },
  { id: 'wellness', label: 'Wellness', detail: 'Recovery and body signals', href: '/ground?district=wellness', color: '#86efac', position: [8.5, 0, -12.5], camera: [5.2, 1.7, -7.1], lookAt: [8.5, 1.2, -12.5], workforceState: 'idle', availability: 'available' },
  { id: 'archive', label: 'Archive', detail: 'Memory and provenance', href: '/life-map?from=ground', color: '#93c5fd', position: [0, 0, -17], camera: [0, 1.7, -10.7], lookAt: [0, 1.2, -17], workforceState: 'idle', availability: 'available' },
  { id: 'mirror', label: 'Reflection Realm', detail: 'Mirror and rewind', href: '/mirror?from=ground', color: '#e9d5ff', position: [-7, 1.4, -19.5], camera: [-4.2, 2.1, -14], lookAt: [-7, 2.1, -19.5], workforceState: 'idle', availability: 'available' },
  { id: 'passport', label: 'Ownership Vault', detail: 'Identity and export', href: '/passport?from=ground', color: '#fde68a', position: [7, 1.4, -19.5], camera: [4.2, 2.1, -14], lookAt: [7, 2.1, -19.5], workforceState: 'awaiting-owner-approval', availability: 'available' },
  { id: 'consent', label: 'Consent Sanctuary', detail: 'Permissions and revocation', href: '/privacy-controls?from=ground&panel=consent', color: '#c084fc', position: [-9.5, 2.2, -24], camera: [-6.2, 2.6, -18.2], lookAt: [-9.5, 2.8, -24], workforceState: 'awaiting-owner-approval', availability: 'available' },
  { id: 'atlas', label: 'Emotional Atlas', detail: 'Consent-aware place memory', href: '/location-map?from=ground', color: '#5eead4', position: [-3.4, 2.8, -25.5], camera: [-2.2, 2.8, -19], lookAt: [-3.4, 3.2, -25.5], workforceState: 'observing-locally', availability: 'available' },
  { id: 'focus', label: 'Focus Chamber', detail: 'Selected-memory attention', href: '/focus?demo=1&memoryId=demo:ground-focus&manifestId=demo-manifest&node=demo:ground-focus&from=ground', color: '#c4b5fd', position: [3.4, 2.8, -25.5], camera: [2.2, 2.8, -19], lookAt: [3.4, 3.2, -25.5], workforceState: 'preparing', availability: 'available' },
  { id: 'replay', label: 'Replay Theater', detail: 'Entered-memory cinema', href: '/replay?demo=1&memoryId=demo:ground-replay&manifestId=demo-manifest&node=demo:ground-replay&from=ground', color: '#f9a8d4', position: [9.5, 2.2, -24], camera: [6.2, 2.6, -18.2], lookAt: [9.5, 2.8, -24], workforceState: 'idle', availability: 'available' },
]

export const STATE_LABEL: Record<WorkforceState, string> = {
  idle: 'Idle',
  'observing-locally': 'Observing locally',
  preparing: 'Preparing',
  'awaiting-owner-approval': 'Awaiting your approval',
  executing: 'Executing',
  completed: 'Completed',
  blocked: 'Blocked',
  revoked: 'Revoked',
}
