import { NextResponse } from 'next/server'
import { verifyFirebaseUser } from '@/lib/server/firebase-user'

export const dynamic = 'force-static'

function validCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function unadmittedElevationSpendResponse() {
  // No environment flag or API key can admit this retained billable GET
  // adapter. Reopening requires an actual protected executor and provisioning.
  return NextResponse.json({ error: 'elevation_protected_spend_required' }, { status: 503, headers: { 'cache-control': 'private, no-store, max-age=0' } })
}

function blockUnadmittedElevationSpend(): void {
  throw new Error('elevation_protected_spend_required')
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

  try { blockUnadmittedElevationSpend() }
  catch { return unadmittedElevationSpendResponse() }

  const apiKey = process.env.URAI_ELEVATION_SERVER_CREDENTIAL
  if (!apiKey) return NextResponse.json({ error: 'elevation_unavailable' }, { status: 503, headers: { 'cache-control': 'private, no-store, max-age=0' } })

  let allowed: boolean
  try { allowed = await consumeElevationRateLimit(uid) } catch { return NextResponse.json({ error: 'elevation_rate_limit_unavailable' }, { status: 503, headers: { 'cache-control': 'private, no-store, max-age=0' } }) }
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'cache-control': 'private, no-store, max-age=0' } })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/elevation/json')
    url.searchParams.set('locations', `${latitude},${longitude}`)
    url.searchParams.set('key', apiKey)
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ error: 'elevation_provider_error' }, { status: 502, headers: { 'cache-control': 'private, no-store, max-age=0' } })
    const payload = await response.json() as { status?: string; results?: Array<{ elevation?: number; resolution?: number }> }
    const first = payload.status === 'OK' && Array.isArray(payload.results) ? payload.results[0] : undefined
    if (!first || typeof first.elevation !== 'number' || !Number.isFinite(first.elevation)) return NextResponse.json({ error: 'elevation_result_unavailable' }, { status: 502, headers: { 'cache-control': 'private, no-store, max-age=0' } })
    return NextResponse.json({ elevationMeters: first.elevation, resolutionMeters: typeof first.resolution === 'number' && Number.isFinite(first.resolution) ? first.resolution : null, source: 'google-maps-elevation', subject: uid }, { headers: { 'cache-control': 'private, no-store, max-age=0' } })
  } catch (error) {
    const code = error instanceof Error && error.name === 'AbortError' ? 'elevation_timeout' : 'elevation_provider_error'
    return NextResponse.json({ error: code }, { status: 502, headers: { 'cache-control': 'private, no-store, max-age=0' } })
  } finally {
    clearTimeout(timeout)
  }
}
