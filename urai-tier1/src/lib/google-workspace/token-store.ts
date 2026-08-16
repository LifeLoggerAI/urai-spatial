import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { assertExternalAccountAdc } from '@/lib/server/google-adc'
import type { GoogleTokenResponse } from './oauth'

const TOKEN_COLLECTION = 'providerOAuthTokens'
const PROVIDER_ID = 'google-workspace'

type EncryptedValue = { iv: string; tag: string; data: string }

type StoredGoogleTokens = {
  provider: typeof PROVIDER_ID
  accessToken: EncryptedValue
  refreshToken?: EncryptedValue
  expiresAt: number
  scopes: string[]
  tokenType: string
  updatedAt: number
}

function encryptionKey(): Buffer {
  const raw = String(process.env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY || '').trim()
  if (!raw) throw new Error('Missing GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  return key
}

function encrypt(value: string): EncryptedValue {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64'),
  }
}

export function decryptGoogleSecret(value: EncryptedValue): string {
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(value.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8')
}

async function db() {
  assertExternalAccountAdc()
  const app = await import('firebase-admin/app')
  const firestore = await import('firebase-admin/firestore')
  if (!app.getApps().length) app.initializeApp({ credential: app.applicationDefault() })
  return firestore.getFirestore()
}

export async function saveGoogleTokens(uid: string, tokens: GoogleTokenResponse) {
  const firestore = await db()
  const tokenRef = firestore.collection(TOKEN_COLLECTION).doc(`${uid}_${PROVIDER_ID}`)
  const existing = await tokenRef.get()
  const previous = existing.exists ? (existing.data() as Partial<StoredGoogleTokens>) : undefined

  const record: StoredGoogleTokens = {
    provider: PROVIDER_ID,
    accessToken: encrypt(tokens.access_token),
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : previous?.refreshToken,
    expiresAt: Date.now() + Math.max(tokens.expires_in || 0, 0) * 1000,
    scopes: String(tokens.scope || '').split(' ').filter(Boolean),
    tokenType: tokens.token_type || 'Bearer',
    updatedAt: Date.now(),
  }
  await tokenRef.set(record, { merge: true })

  await firestore.doc(`users/${uid}/providerConnections/${PROVIDER_ID}`).set({
    provider: PROVIDER_ID,
    connected: true,
    scopes: record.scopes,
    updatedAt: new Date(),
  }, { merge: true })
}

export async function googleConnectionStatus(uid: string) {
  const firestore = await db()
  const snapshot = await firestore.doc(`users/${uid}/providerConnections/${PROVIDER_ID}`).get()
  if (!snapshot.exists) return { connected: false, provider: PROVIDER_ID, scopes: [] as string[] }
  const data = snapshot.data() || {}
  return {
    connected: data.connected === true,
    provider: PROVIDER_ID,
    scopes: Array.isArray(data.scopes) ? data.scopes.filter((value): value is string => typeof value === 'string') : [],
  }
}

export async function disconnectGoogle(uid: string) {
  const firestore = await db()
  await Promise.all([
    firestore.collection(TOKEN_COLLECTION).doc(`${uid}_${PROVIDER_ID}`).delete(),
    firestore.doc(`users/${uid}/providerConnections/${PROVIDER_ID}`).set({
      provider: PROVIDER_ID,
      connected: false,
      scopes: [],
      updatedAt: new Date(),
    }, { merge: true }),
  ])
}
