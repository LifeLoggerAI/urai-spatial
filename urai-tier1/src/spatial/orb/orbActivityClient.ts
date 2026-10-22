'use client'

import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/client'
import { isCurrentAIActorSnapshot, type AIActorSnapshot } from '@/lib/privacy/aiActorBoundary'

export type OrbActivityItem = {
  id: string
  kind: 'proposal' | 'outcome-report' | 'outcome-observation'
  truthKind: 'scenario' | 'user-assertion' | 'observation'
  recordedAt: string
  scenarioId: string | null
}

// Strict view model: never expose raw ledger documents or private source refs
// and never use a ledger response as prompt context.
export async function readOrbActivity(actor: AIActorSnapshot): Promise<OrbActivityItem[] | null> {
  if (!actor.actor || !actor.uid || !isCurrentAIActorSnapshot(actor)) return null
  const fn = httpsCallable<{ limit: number }, unknown>(functions, 'getAILedgerEntries')
  const result = await fn({ limit: 15 })
  if (!isCurrentAIActorSnapshot(actor)) return null
  if (!result.data || typeof result.data !== 'object') throw new Error('Invalid activity response')
  const data = result.data as Record<string, unknown>
  if (!Array.isArray(data.entries) || data.entries.length > 15) throw new Error('Invalid activity entries')
  return data.entries.map((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid activity entry')
    const row = value as Record<string, unknown>
    const kind = row.kind
    const truthKind = row.truthKind
    if (kind !== 'proposal' && kind !== 'outcome-report' && kind !== 'outcome-observation')
      throw new Error('Unknown activity kind')
    if (truthKind !== 'scenario' && truthKind !== 'user-assertion' && truthKind !== 'observation')
      throw new Error('Unknown activity truth kind')
    if (typeof row.entryId !== 'string' || !/^ai_[A-Za-z0-9_-]{12,96}$/.test(row.entryId))
      throw new Error('Invalid activity ID')
    if (typeof row.ownerId !== 'string' || row.ownerId !== actor.uid)
      throw new Error('Owner identity mismatch')
    return {
      id: row.entryId,
      kind,
      truthKind,
      recordedAt: typeof row.timestamp === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(row.timestamp)
        ? row.timestamp.slice(0, 19).replace('T', ' ') + ' UTC' : 'Time unavailable',
      scenarioId: typeof row.scenarioId === 'string' && /^scn_[A-Za-z0-9_-]{12,96}$/.test(row.scenarioId)
        ? row.scenarioId : null,
    }
  })
}
