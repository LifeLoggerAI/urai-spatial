import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export type UraiXrSessionScope = 'room:join' | 'room:signal' | 'room:publish' | 'room:observe' | 'room:admin'

export type UraiXrRoomSession = {
  tokenId: string
  roomId: string
  peerId: string
  scopes: UraiXrSessionScope[]
  issuedAt: number
  expiresAt: number
  rotateAfter: number
  shardId?: string
}

export type UraiXrSignedRoomSession = UraiXrRoomSession & {
  signature: string
}

export type UraiXrSessionValidation = {
  ok: boolean
  reason?: 'expired' | 'rotation_required' | 'bad_signature' | 'missing_scope' | 'malformed'
  session?: UraiXrSignedRoomSession
}

function canonicalSessionPayload(session: UraiXrRoomSession) {
  return JSON.stringify({
    tokenId: session.tokenId,
    roomId: session.roomId,
    peerId: session.peerId,
    scopes: [...session.scopes].sort(),
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
    rotateAfter: session.rotateAfter,
    shardId: session.shardId ?? null,
  })
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function issueUraiXrRoomSession(input: {
  roomId: string
  peerId: string
  scopes?: UraiXrSessionScope[]
  ttlMs?: number
  rotationMs?: number
  secret?: string
  now?: number
  shardId?: string
}): UraiXrSignedRoomSession {
  const now = input.now ?? Date.now()
  const session: UraiXrRoomSession = {
    tokenId: randomUUID(),
    roomId: input.roomId,
    peerId: input.peerId,
    scopes: input.scopes ?? ['room:join', 'room:signal', 'room:publish'],
    issuedAt: now,
    expiresAt: now + (input.ttlMs ?? 15 * 60 * 1000),
    rotateAfter: now + (input.rotationMs ?? 5 * 60 * 1000),
    shardId: input.shardId,
  }
  const secret = input.secret ?? process.env.URAI_XR_SESSION_SECRET ?? 'local-xr-dev-secret'
  return { ...session, signature: sign(canonicalSessionPayload(session), secret) }
}

export function encodeUraiXrRoomSession(session: UraiXrSignedRoomSession) {
  return Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')
}

export function decodeUraiXrRoomSession(token: string): UraiXrSignedRoomSession | null {
  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as UraiXrSignedRoomSession
  } catch {
    return null
  }
}

export function validateUraiXrRoomSession(input: {
  token: string
  requiredScope: UraiXrSessionScope
  roomId: string
  peerId: string
  secret?: string
  now?: number
}): UraiXrSessionValidation {
  const session = decodeUraiXrRoomSession(input.token)
  if (!session) return { ok: false, reason: 'malformed' }
  if (session.roomId !== input.roomId || session.peerId !== input.peerId) return { ok: false, reason: 'malformed' }
  if (!session.scopes.includes(input.requiredScope)) return { ok: false, reason: 'missing_scope', session }
  const now = input.now ?? Date.now()
  if (now >= session.expiresAt) return { ok: false, reason: 'expired', session }
  if (now >= session.rotateAfter) return { ok: false, reason: 'rotation_required', session }
  const secret = input.secret ?? process.env.URAI_XR_SESSION_SECRET ?? 'local-xr-dev-secret'
  const expected = sign(canonicalSessionPayload(session), secret)
  const actualBuffer = Buffer.from(session.signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return { ok: false, reason: 'bad_signature', session }
  }
  return { ok: true, session }
}

export function rotateUraiXrRoomSession(input: { token: string; secret?: string; now?: number }) {
  const existing = decodeUraiXrRoomSession(input.token)
  if (!existing) return null
  return issueUraiXrRoomSession({
    roomId: existing.roomId,
    peerId: existing.peerId,
    scopes: existing.scopes,
    secret: input.secret,
    now: input.now,
    shardId: existing.shardId,
  })
}
