export type OwnershipKeyState = 'locked' | 'available' | 'authenticating' | 'authorized' | 'expired' | 'failed'
export type PassportRuntimeState = 'private' | 'signed-out' | 'demo' | 'empty' | 'offline' | 'provider-outage' | 'webgl-unavailable'
export type ExportState = 'idle' | 'queued' | 'preparing' | 'ready' | 'failed' | 'expired' | 'cancelled'
export type DeletionState = 'idle' | 'awaiting-confirmation' | 'pending' | 'partial' | 'completed' | 'failed' | 'cancelled'
export type ProvenanceState = 'complete' | 'partial' | 'missing'

export type PassportSource = {
  id: string
  label: string
  sourceType: string
  authorizationBasis: string
  firstSeen: string
  lastUpdated: string
  permission: 'granted' | 'limited' | 'paused' | 'denied'
  retention: string
  processing: string
  contributesTo: string[]
  provenance: ProvenanceState
}

export type PassportDevice = {
  id: string
  label: string
  channel: string
  status: 'active' | 'paused' | 'revoked'
  lastSeen: string
}

export type PassportReceipt = {
  id: string
  kind: 'consent' | 'export' | 'deletion' | 'reauthentication' | 'recovery'
  summary: string
  createdAt: string
  immutable: true
}

export type PassportSnapshot = {
  ownerId: string
  displayName: string
  ownershipStatus: 'verified' | 'limited' | 'recovery-required'
  keyState: OwnershipKeyState
  sources: PassportSource[]
  devices: PassportDevice[]
  activePermissions: number
  recentConsentChanges: number
  exportState: ExportState
  deletionState: DeletionState
  receipts: PassportReceipt[]
  recoveryStatus: 'clear' | 'pending' | 'attention-required'
}

export function demoPassportSnapshot(): PassportSnapshot {
  return {
    ownerId: 'demo-owner',
    displayName: 'Disclosed sample owner',
    ownershipStatus: 'verified',
    keyState: 'available',
    sources: [
      {
        id: 'sample-phone',
        label: 'Sample phone capture',
        sourceType: 'Device sensor bundle',
        authorizationBasis: 'Explicit sample consent',
        firstSeen: '2026-07-01T12:00:00.000Z',
        lastUpdated: '2026-07-20T18:30:00.000Z',
        permission: 'limited',
        retention: '365 days',
        processing: 'Private world only',
        contributesTo: ['Mirror', 'Replay', 'Life Map'],
        provenance: 'complete',
      },
      {
        id: 'sample-calendar',
        label: 'Sample calendar connection',
        sourceType: 'External account',
        authorizationBasis: 'User connection',
        firstSeen: '2026-07-03T12:00:00.000Z',
        lastUpdated: '2026-07-19T09:00:00.000Z',
        permission: 'paused',
        retention: 'Until disconnected',
        processing: 'No new events while paused',
        contributesTo: ['Focus', 'Automation'],
        provenance: 'partial',
      },
    ],
    devices: [
      { id: 'sample-device', label: 'Sample primary device', channel: 'Audio, motion and location', status: 'active', lastSeen: 'Recently' },
    ],
    activePermissions: 7,
    recentConsentChanges: 2,
    exportState: 'idle',
    deletionState: 'idle',
    receipts: [
      { id: 'sample-receipt', kind: 'consent', summary: 'Location precision changed to symbolic only.', createdAt: '2026-07-20T18:30:00.000Z', immutable: true },
    ],
    recoveryStatus: 'clear',
  }
}

export function redactPassportSnapshot(snapshot: PassportSnapshot): PassportSnapshot {
  return {
    ...snapshot,
    ownerId: 'private-owner',
    sources: snapshot.sources.map(({ id, ...source }, index) => ({ ...source, id: `source-${index + 1}` })),
    devices: snapshot.devices.map(({ id, ...device }, index) => ({ ...device, id: `device-${index + 1}` })),
    receipts: snapshot.receipts.map(({ id, ...receipt }, index) => ({ ...receipt, id: `receipt-${index + 1}` })),
  }
}

export function canBeginSensitiveAction(snapshot: PassportSnapshot): boolean {
  return snapshot.keyState === 'authorized' && snapshot.ownershipStatus !== 'recovery-required'
}
