import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { randomUUID } from 'node:crypto'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const fv = admin.firestore.FieldValue

function requireUid(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}
function id(value: unknown, prefix: string) {
  const text = String(value ?? '')
  if (!text.startsWith(prefix)) throw new functions.https.HttpsError('invalid-argument', `Invalid ${prefix} identifier.`)
  return text
}
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 128) : [] }

export const calibratePossibleFutureOutcome = functions.https.onCall(async (data, context) => {
  const ownerId = requireUid(context)
  const scenarioId = id(data?.scenarioId, 'scn_')
  const observationId = id(data?.observationId, 'obs_')
  const scenarioRef = db.doc(`users/${ownerId}/scenarios/${scenarioId}`)
  const observationRef = scenarioRef.collection('outcomeObservations').doc(observationId)
  const [scenario, observation] = await Promise.all([scenarioRef.get(), observationRef.get()])
  if (!scenario.exists || !observation.exists) throw new functions.https.HttpsError('not-found', 'Scenario outcome evidence is missing.')
  const calibrationId = `cal_${randomUUID().replace(/-/g, '')}`
  const record = {
    id: calibrationId,
    ownerId,
    scenarioId,
    observationId,
    assumptionSurvivedIds: strings(data?.assumptionSurvivedIds),
    assumptionInvalidatedIds: strings(data?.assumptionInvalidatedIds),
    uncertaintyResolvedIds: strings(data?.uncertaintyResolvedIds),
    uncertaintyUnresolvedIds: strings(data?.uncertaintyUnresolvedIds),
    majorFactorOmissions: strings(data?.majorFactorOmissions),
    userCorrectionCount: Math.max(0, Math.floor(Number(data?.userCorrectionCount ?? 0))),
    predictiveAccuracyClaimed: false,
    personalizationWeightsUpdated: false,
    createdAt: fv.serverTimestamp(),
  }
  await scenarioRef.collection('calibration').doc(calibrationId).create(record)
  return { calibrationId, predictiveAccuracyClaimed: false, personalizationWeightsUpdated: false }
})
