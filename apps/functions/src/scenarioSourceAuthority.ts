/**
 * Bounded source metadata admission for previously saved Possible Futures.
 * This module is intentionally side-effect-free and provider-independent.
 * It does not certify Life Graph provenance or replace C1 source receipts.
 */
export type ScenarioSourceKind = 'autobiographical-memory' | 'interpretation'
export type ScenarioSourceRef = {
  path: string
  id: string
  truthKind: ScenarioSourceKind
  sourceRevision: number
  entityKind?: 'person' | 'place'
}

export class ScenarioSourceAuthorityError extends Error {
  constructor(readonly code: 'SCENARIO_SOURCE_REFERENCE_INVALID' | 'SCENARIO_SOURCE_UNAVAILABLE') {
    super(code)
    this.name = 'ScenarioSourceAuthorityError'
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null
}

export function parseScenarioSourceRef(ownerId: string, value: unknown): ScenarioSourceRef {
  const item = object(value)
  if (!item || item.purpose !== 'scenario.explore') throw new ScenarioSourceAuthorityError('SCENARIO_SOURCE_REFERENCE_INVALID')
  const kind = item.truthKind
  if (kind !== 'autobiographical-memory' && kind !== 'interpretation') {
    throw new ScenarioSourceAuthorityError('SCENARIO_SOURCE_REFERENCE_INVALID')
  }
  const path = item.sourceId
  const prefix = `users/${ownerId}/${kind === 'autobiographical-memory' ? 'memories' : 'lifeEntities'}/`
  if (typeof path !== 'string' || !path.startsWith(prefix)) {
    throw new ScenarioSourceAuthorityError('SCENARIO_SOURCE_REFERENCE_INVALID')
  }
  const id = path.slice(prefix.length)
  const expectedRecordId = `${kind === 'autobiographical-memory' ? 'memory' : 'life-entity'}:${id}`
  if (!/^[A-Za-z0-9:_-]{1,160}$/.test(id) || item.truthRecordId !== expectedRecordId ||
      !Number.isSafeInteger(item.sourceRevision) || (item.sourceRevision as number) < 0) {
    throw new ScenarioSourceAuthorityError('SCENARIO_SOURCE_REFERENCE_INVALID')
  }
  const entityKind = item.sourceEntityKind
  if (kind === 'autobiographical-memory' && entityKind !== undefined ||
      kind === 'interpretation' && entityKind !== undefined && entityKind !== 'person' && entityKind !== 'place') {
    throw new ScenarioSourceAuthorityError('SCENARIO_SOURCE_REFERENCE_INVALID')
  }
  return {
    path,
    id,
    truthKind: kind,
    sourceRevision: item.sourceRevision as number,
    ...(entityKind ? { entityKind: entityKind as 'person' | 'place' } : {}),
  }
}

// Older imported memories may not carry a record-local consent field. They
// still require current owner policy in the caller; an explicit denial cannot
// be overridden by that policy or by a stale saved scenario.
export function isScenarioMemoryConsentUsable(value: unknown): boolean {
  return value == null || value === 'granted' || value === 'limited'
}

const BLOCKED_SOURCE_STATUSES = new Set(['revoked', 'deleted', 'superseded', 'archived', 'withdrawn', 'blocked', 'disabled', 'expired', 'denied', 'pending', 'rejected'])
export function isScenarioSourceStatusUsable(value: unknown): boolean {
  return value == null || (typeof value === 'string' && !BLOCKED_SOURCE_STATUSES.has(value.trim().toLowerCase()))
}

export function assertCurrentScenarioSourceRecord(ownerId: string, source: ScenarioSourceRef, value: unknown): void {
  const row = object(value)
  if (!row) throw new ScenarioSourceAuthorityError('SCENARIO_SOURCE_UNAVAILABLE')
  if (source.truthKind === 'autobiographical-memory') {
    if ((row.ownerId ?? row.userId) !== ownerId || row.deleted === true || row.revoked === true || row.demo === true ||
        row.synthetic === true || !isScenarioMemoryConsentUsable(row.consentState) ||
        !isScenarioSourceStatusUsable(row.status)) {
      throw new ScenarioSourceAuthorityError('SCENARIO_SOURCE_UNAVAILABLE')
    }
  } else {
    if (row.ownerId !== ownerId || row.revoked === true || row.deleted === true || row.demo === true ||
        row.synthetic === true || (row.kind !== 'person' && row.kind !== 'place') ||
        (source.entityKind !== undefined && source.entityKind !== row.kind) ||
        !isScenarioSourceStatusUsable(row.status)) {
      throw new ScenarioSourceAuthorityError('SCENARIO_SOURCE_UNAVAILABLE')
    }
  }
}
