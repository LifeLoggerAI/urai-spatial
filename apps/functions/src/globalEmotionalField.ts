import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const ALLOWED_STATES = new Set(['Calm','Reflective','Energized','Heavy','Uncertain','Hopeful'])

function requireUser(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function publishedCell(data: FirebaseFirestore.DocumentData) {
  const bounds = data?.bounds && typeof data.bounds === 'object' ? data.bounds : {}
  const distribution = data?.distribution && typeof data.distribution === 'object' ? data.distribution : {}
  const safeDistribution: Record<string, number> = {}
  for (const state of ALLOWED_STATES) {
    const value = finiteNumber(distribution[state])
    if (value !== null) safeDistribution[state] = value
  }
  return {
    cellId: String(data?.cellId ?? '').slice(0, 120),
    bucketStart: finiteNumber(data?.bucketStart),
    cohortBand: ['25-49','50-99','100+'].includes(String(data?.cohortBand ?? ''))
      ? String(data.cohortBand)
      : null,
    bounds: {
      south: finiteNumber(bounds.south),
      west: finiteNumber(bounds.west),
      north: finiteNumber(bounds.north),
      east: finiteNumber(bounds.east),
    },
    dominantState: ALLOWED_STATES.has(String(data?.dominantState ?? ''))
      ? String(data.dominantState)
      : null,
    distribution: safeDistribution,
  }
}

export const getGlobalEmotionalFieldSnapshot = functions.https.onCall(async (_data, context) => {
  requireUser(context)

  // Launch boundary: the global field is hard-off unless explicitly enabled by
  // server environment. Client input can never enable or relax this boundary.
  if (process.env.URAI_GLOBAL_EMOTIONAL_FIELD_ENABLED !== 'true') {
    return {
      enabled: false,
      generatedAt: Date.now(),
      cells: [],
      source: 'server-hard-off',
    }
  }

  const snapshot = await db.collection('globalEmotionalFieldCells').limit(200).get()
  return {
    enabled: true,
    generatedAt: Date.now(),
    cells: snapshot.docs.map((doc) => publishedCell(doc.data())),
    source: 'server-published-aggregate-only',
  }
})
