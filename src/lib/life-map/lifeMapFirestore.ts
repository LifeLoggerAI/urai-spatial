import { demoChapters, demoEdges, demoNodes, mirrorReplayPath } from './lifeMapDemoData'
import { LifeMapNode, LifeMapSettings } from './lifeMapTypes'

const hasFirestore = false

export async function fetchLifeMapNodes(userId: string) { return hasFirestore ? [] : demoNodes.filter(n => n.userId === userId || userId === 'demo-user') }
export async function fetchLifeMapEdges(_userId: string) { return hasFirestore ? [] : demoEdges }
export async function fetchLifeChapters(_userId: string) { return hasFirestore ? [] : demoChapters }
export async function saveLifeMapSettings(_userId: string, settings: LifeMapSettings) { return { ok: true, settings } }
export async function createLifeMapNode(_userId: string, node: LifeMapNode) { return { ok: true, node } }
export async function updateLifeMapNode(_userId: string, nodeId: string, updates: Partial<LifeMapNode>) { return { ok: true, nodeId, updates } }
export async function generateLifeMapFromSignals(_userId: string) { return demoNodes }
export async function generateReplayPath(_userId: string, nodeIds: string[]) { return mirrorReplayPath.filter(x => nodeIds.includes(x.nodeId)) }
export async function generateMirrorOfBecoming(_userId: string) { return mirrorReplayPath }

export const lifeMapFirestoreSchema = `
users/{userId}/lifeMapNodes
users/{userId}/lifeMapEdges
users/{userId}/lifeChapters
users/{userId}/memoryBlooms
users/{userId}/rituals
users/{userId}/relationshipNodes
users/{userId}/dreamNodes
users/{userId}/recoveryEvents
users/{userId}/shadowEvents
users/{userId}/narratorInsights
users/{userId}/lifeMapSettings
`
