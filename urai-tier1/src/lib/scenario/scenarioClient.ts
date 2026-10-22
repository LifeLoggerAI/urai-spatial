'use client'

import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/client'

function op(prefix: string) {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${id}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 96)
}

async function call<T = Record<string, unknown>>(name: string, payload: Record<string, unknown>) {
  const fn = httpsCallable<Record<string, unknown>, T>(functions, name)
  return (await fn(payload)).data
}

export function createPossibleFutureClient(payload: {
  question: string
  originRealm: string
  returnToken: string
  cameraCheckpoint?: string
  sourceContext?: {
    memoryId?: string
    personId?: string
    placeId?: string
  }
  excludedEvidence?: readonly Record<string, unknown>[]
  worldRevision?: string
  timeHorizon?: { amount: number; unit: 'day' | 'week' | 'month' | 'year' }
  assumptionOnly?: boolean
}) {
  return call<{ scenarioId: string; basisId: string; basisRevision: number; status: string }>('createPossibleFuture', { ...payload, operationId: op('scenario-create') })
}

export function requestPossibleFutureGenerationClient(payload: { scenarioId: string; expectedRevision: number }) {
  return call<{ status: string; manualScenarioAvailable?: boolean }>('generatePossibleFutureBranches', { ...payload, operationId: op('scenario-generate') })
}

export function submitManualScenarioBranchesClient(payload: {
  scenarioId: string
  expectedRevision: number
  branches: readonly { label: string; summary: string }[]
  operationId: string
}) {
  return call<{ status: string; branchIds: string[] }>('generatePossibleFutureBranches', { scenarioId: payload.scenarioId, expectedRevision: payload.expectedRevision, manualBranches: payload.branches, operationId: payload.operationId })
}

export function getPossibleFutureClient(scenarioId: string) {
  return call<{ scenario: Record<string, unknown>; basis: Record<string, unknown> | null; branches: Record<string, unknown>[] }>('getPossibleFuture', { scenarioId })
}

export function savePossibleFutureClient(scenarioId: string) { return call('savePossibleFuture', { scenarioId, operationId: op('scenario-save') }) }
export function discardPossibleFutureClient(scenarioId: string) { return call('discardPossibleFuture', { scenarioId, operationId: op('scenario-discard') }) }

export function getPossibleFutureCouncilBundleClient(scenarioId: string, branchId?: string) {
  return call<{
    scenarioId: string
    branchId: string | null
    truthKind: 'scenario'
    question: string
    branchLabel: string
    branchSummary: string
    uncertainty: string[]
    assumptionOnly: boolean
    evidenceCount: number
    evidenceKinds: string[]
    disclosure: string
  }>('getPossibleFutureCouncilBundle', { scenarioId, ...(branchId ? { branchId } : {}) })
}

/** User-owned report only. Independent observations need trusted server evidence verification. */
export function reportPossibleFutureOwnerOutcomeClient(payload: {
  scenarioId: string
  branchId: string
  assertion: string
  operationId: string
}) {
  return call<{ observationId: string; scenarioId: string; verified: false; source: 'user-assertion'; idempotent: boolean }>(
    'recordPossibleFutureOutcome',
    { ...payload, source: 'user-assertion' },
  )
}

// Owner-directed, read-only recall. The server independently checks live owner,
// deletion and memory consent authority; this client only validates its result.
export type PossibleFutureOwnerReport = {
  observationId: string
  branchId: string
  assertion: string
  source: 'user-assertion'
  verified: false
  reportedAt: string | null
}

export async function getPossibleFutureOwnerReportsClient(payload: {
  scenarioId: string
  branchId: string
}): Promise<PossibleFutureOwnerReport[]> {
  if (!/^scn_[A-Za-z0-9_-]{12,96}$/.test(payload.scenarioId)
    || !/^br_[A-Za-z0-9_-]{12,96}$/.test(payload.branchId)) {
    throw new Error('Invalid owner outcome lookup.')
  }
  const raw = await call<unknown>('getPossibleFutureOwnerReports', payload)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid owner outcome response.')
  const data = raw as Record<string, unknown>
  if (data.scenarioId !== payload.scenarioId || data.branchId !== payload.branchId
    || !Array.isArray(data.reports) || data.reports.length > 20) {
    throw new Error('Owner outcome context mismatch.')
  }
  return data.reports.map((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid owner outcome record.')
    const row = value as Record<string, unknown>
    if (typeof row.observationId !== 'string' || !/^obs_[A-Za-z0-9_-]{12,96}$/.test(row.observationId)
      || row.branchId !== payload.branchId || row.source !== 'user-assertion'
      || row.verified !== false || typeof row.assertion !== 'string'
      || !row.assertion.trim() || row.assertion.length > 1200
      || (row.reportedAt !== null && (typeof row.reportedAt !== 'string' || row.reportedAt.length > 40))) {
      throw new Error('Owner outcome record failed its truth boundary.')
    }
    return {
      observationId: row.observationId, branchId: payload.branchId,
      assertion: row.assertion, source: 'user-assertion' as const,
      verified: false as const, reportedAt: row.reportedAt as string | null,
    }
  })
}
