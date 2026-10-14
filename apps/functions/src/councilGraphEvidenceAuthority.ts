import { createHash } from 'node:crypto'
import * as functions from 'firebase-functions/v1'
import { isCanonicalStoredPolicy } from './consentPolicyAuthority'
import { requireLifeItemSources, lifeAuthorityDigest, lifeItemDigest } from './lifeGraphAuthority'

const token = /^[A-Za-z0-9._:-]{1,160}$/
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const deny = (reason: string): never => { throw new functions.https.HttpsError('failed-precondition', reason) }
function ids(value: unknown, max: number): string[] {
  if (!Array.isArray(value) || value.length > max || value.some(x => typeof x !== 'string' || !token.test(x))
    || new Set(value).size !== value.length) deny('COUNCIL_GRAPH_IDS_INVALID')
  return value as string[]
}
export type CouncilGraphSelection = { snapshotId: string; entityIds: string[] }
export function parseCouncilGraphSelection(input: unknown): CouncilGraphSelection {
  if (!input || typeof input !== 'object' || Array.isArray(input)) deny('COUNCIL_GRAPH_SELECTION_INVALID')
  const x = input as Record<string, unknown>
  if (typeof x.snapshotId !== 'string' || !token.test(x.snapshotId)
    || Object.keys(x).some(key => key !== 'snapshotId' && key !== 'entityIds')) deny('COUNCIL_GRAPH_SELECTION_INVALID')
  const entityIds = ids(x.entityIds, 8)
  if (!entityIds.length) deny('COUNCIL_GRAPH_SELECTION_EMPTY')
  return { snapshotId: x.snapshotId as string, entityIds }
}
