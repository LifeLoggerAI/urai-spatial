import { NextResponse } from 'next/server'
import { verifyFirebaseUser } from '@/lib/server/firebase-user'
import { SpatialSpendError, paidSpatialElevationFetch, assertSpatialPaidOutputCurrent } from '../../../../../../apps/functions/src/protectedProviderSpend'
import { ElevationResultError, readNormalizedElevation } from '../../../../../../apps/functions/src/mapsElevationResult'

export const dynamic = 'force-static'

function validCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

const RATE_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 12

async function consumeElevationRateLimit(uid: string) {
  const firestore = await import('firebase-admin/firestore')
  const db = firestore.getFirestore()
  const ref = db.doc(`users/${uid}/providerRateLimits/maps-elevation`)
  const now = Date.now()
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const data = snapshot.data() ?? {}
    const startedAt = data.windowStartedAt
    const prior = startedAt instanceof firestore.Timestamp ? startedAt.toMillis() : 0
    const active = prior > 0 && now - prior < RATE_WINDOW_MS
    const count = active ? Number(data.count ?? 0) : 0
    if (count >= RATE_LIMIT_MAX) return false
    transaction.set(ref, {
      provider: 'maps-elevation',
      count: count + 1,
      windowStartedAt: firestore.Timestamp.fromMillis(active ? prior : now),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
    return true
  })
}

export async function POST(request: Request) {
  if (process.env.URAI_FIREBASE_STATIC_EXPORT === 'true') {
    return NextResponse.json({ error: 'elevation_unavailable_in_static_export' }, { status: 503, headers: { 'cache-control': 'private, no-store, max-age=0' } })
  }

  const uid = await verifyFirebaseUser(request)
  if (!uid) return NextResponse.json({ error: 'authentication_required' }, { status: 401, headers: { 'cache-control': 'private, no-store, max-age=0' } })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400, headers: { 'cache-control': 'private, no-store, max-age=0' } }) }
  const record = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  const latitude = record.latitude
  const longitude = record.longitude
  if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) return NextResponse.json({ error: 'invalid_coordinate' }, { status: 400, headers: { 'cache-control': 'private, no-store, max-age=0' } })

  const apiKey = process.env.URAI_ELEVATION_SERVER_CREDENTIAL
  if (!apiKey) return NextResponse.json({ error: 'elevation_unavailable' }, { status: 503, headers: { 'cache-control': 'private, no-store, max-age=0' } })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  const signal = request.signal ? AbortSignal.any([request.signal, controller.signal]) : controller.signal
  try {
    const firestore = await import('firebase-admin/firestore')
    const db = firestore.getFirestore(), input = { latitude, longitude }
    let rateConsumed = false
    const response = await paidSpatialElevationFetch(db, uid, input, apiKey, signal, async () => {
      if (!rateConsumed) {
        let allowed: boolean
        try { allowed = await consumeElevationRateLimit(uid) } catch { throw new Error('elevation_rate_limit_unavailable') }
        if (!allowed) throw new Error('rate_limited')
        rateConsumed = true
      }
      if (await verifyFirebaseUser(request) !== uid) throw new Error('authentication_required')
    })
    const result = await readNormalizedElevation(response, input)
    if (await verifyFirebaseUser(request) !== uid) throw new Error('authentication_required')
    assertSpatialPaidOutputCurrent(response)
    return NextResponse.json({ ...result, subject: uid }, { headers: { 'cache-control': 'private, no-store, max-age=0' } })
  } catch (error) {
    const controlled = error instanceof Error ? error.message : ''
    const status = controlled === 'authentication_required' ? 401 : controlled === 'rate_limited' ? 429 : controlled === 'elevation_rate_limit_unavailable' || error instanceof SpatialSpendError ? 503 : 502
    if (status !== 502) return NextResponse.json({ error: error instanceof SpatialSpendError ? 'elevation_protected_spend_required' : controlled }, { status, headers: { 'cache-control': 'private, no-store, max-age=0' } })
    if (error instanceof ElevationResultError) return NextResponse.json({ error: error.code }, { status: error.status, headers: { 'cache-control': 'private, no-store, max-age=0' } })
    const code = error instanceof Error && error.name === 'AbortError' ? 'elevation_timeout' : 'elevation_provider_error'
    return NextResponse.json({ error: code }, { status: 502, headers: { 'cache-control': 'private, no-store, max-age=0' } })
  } finally {
    clearTimeout(timeout)
  }
}
