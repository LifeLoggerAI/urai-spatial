/** Read-only UI projection of the existing source-checked Council Life Graph callable.
 * This client state is NOT a server authorization receipt or certified release artifact.
 */
export type LifeGraphWorldProjection = Readonly<{
  snapshotId: string
  graphHash: string
  entityIds: readonly string[]
  sourceChecked: true
  providerDispatchAuthorized: false
}>
const TOKEN = /^[A-Za-z0-9._:-]{1,160}$/
const DIGEST = /^[a-f0-9]{64}$/
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null
}
export function projectLifeGraphEvidence(value: unknown, snapshotId: string, entityIds: readonly string[]): LifeGraphWorldProjection {
  const record = object(value)
  if (!record || !TOKEN.test(snapshotId) || !Array.isArray(entityIds) || entityIds.length === 0
    || entityIds.length > 8 || entityIds.some(id => !TOKEN.test(id))
    || new Set(entityIds).size !== entityIds.length
    || record.snapshotId !== snapshotId || typeof record.graphHash !== 'string'
    || !DIGEST.test(record.graphHash) || record.sourceChecked !== true
    || record.providerDispatchAuthorized !== false || !Array.isArray(record.entities)
    || record.entities.length !== entityIds.length
    || record.entities.some(entity => !object(entity) || !entityIds.includes((entity as Record<string, unknown>).id as string))) {
    throw new Error('LIFE_GRAPH_WORLD_PROJECTION_UNAVAILABLE')
  }
  return Object.freeze({ snapshotId, graphHash: record.graphHash, entityIds: Object.freeze([...entityIds]),
    sourceChecked: true, providerDispatchAuthorized: false })
}
