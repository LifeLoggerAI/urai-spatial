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
  evidenceRefs?: readonly Record<string, unknown>[]
  excludedEvidence?: readonly Record<string, unknown>[]
  permissionReceiptIds?: readonly string[]
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
}) {
  return call<{ status: string; branchIds: string[] }>('generatePossibleFutureBranches', { scenarioId: payload.scenarioId, expectedRevision: payload.expectedRevision, manualBranches: payload.branches, operationId: op('scenario-manual') })
}

export function getPossibleFutureClient(scenarioId: string) {
  return call<{ scenario: Record<string, unknown>; basis: Record<string, unknown> | null; branches: Record<string, unknown>[] }>('getPossibleFuture', { scenarioId })
}

export function savePossibleFutureClient(scenarioId: string) { return call('savePossibleFuture', { scenarioId, operationId: op('scenario-save') }) }
export function discardPossibleFutureClient(scenarioId: string) { return call('discardPossibleFuture', { scenarioId, operationId: op('scenario-discard') }) }
