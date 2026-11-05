'use client'

import { getAuth } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { app, firebasePublicEnvReady, functions } from '@/lib/firebase/client'

export const MEMORY_MEDIA_MAX_BYTES = 4 * 1024 * 1024
export const MEMORY_MEDIA_TYPES = 'image/png,image/jpeg,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm'
const kinds: Record<string, string> = { 'image/png': 'image', 'image/jpeg': 'image', 'image/webp': 'image',
  'audio/mpeg': 'audio', 'audio/wav': 'audio', 'audio/ogg': 'audio', 'video/mp4': 'video', 'video/webm': 'video' }
type Memory = { id: string; ownerId: string; demo?: boolean; privacy: string }
type Lifecycle = { signal: AbortSignal; isCurrent: () => boolean }
type FileSource = Pick<File, 'size' | 'type' | 'arrayBuffer'>
function stopped(): never { throw new DOMException('File attachment stopped.', 'AbortError') }

export async function attachOwnedMemoryFile(memory: Memory, file: FileSource, lifecycle: Lifecycle, suppliedOperationId?: string) {
  const auth = getAuth(app), owner = auth.currentUser
  if (!firebasePublicEnvReady || !owner || memory.demo || memory.privacy !== 'private' || memory.ownerId !== owner.uid
    || !/^[A-Za-z0-9_-]{1,128}$/.test(memory.id)) throw new Error('PRIVATE_MEMORY_REQUIRED')
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > MEMORY_MEDIA_MAX_BYTES || !kinds[file.type]) throw new Error('FILE_TYPE_OR_SIZE_UNSUPPORTED')
  const operationId = suppliedOperationId ?? `memory-media-${crypto.randomUUID()}`
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(operationId)) throw new Error('OPERATION_ID_INVALID')
  const current = () => !lifecycle.signal.aborted && lifecycle.isCurrent() && auth.currentUser === owner
  const check = () => { if (!current()) stopped(); if (globalThis.navigator?.onLine === false) throw new Error('OFFLINE') }
  const authority = httpsCallable<{ memoryId: string }, Record<string, unknown>>(functions, 'getMemoryMediaUploadAuthority')
  const requireAuthority = async () => {
    check()
    const token = await owner.getIdTokenResult(true); check()
    const authTime = token.claims.auth_time, now = Math.floor(Date.now() / 1000)
    if (!Number.isSafeInteger(authTime) || Number(authTime) <= 0 || Number(authTime) > now || now - Number(authTime) > 300) throw new Error('RECENT_AUTHENTICATION_REQUIRED')
    const response = await authority({ memoryId: memory.id }); check()
    const value = response.data
    if (value.schemaVersion !== 'urai-owned-memory-media-v1' || value.ownerId !== owner.uid || value.memoryId !== memory.id
      || !Number.isSafeInteger(value.consentRevision) || Number(value.consentRevision) < 1
      || !Number.isSafeInteger(value.expiresAt) || Number(value.expiresAt) <= Date.now()) throw new Error('MEMORY_MEDIA_AUTHORITY_REQUIRED')
    return value
  }
  const first = await requireAuthority()
  const bytes = new Uint8Array(await file.arrayBuffer()); check()
  if (bytes.byteLength !== file.size) throw new Error('FILE_CHANGED')
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 32768) { check(); binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768)) }
  const base64 = btoa(binary); check()
  const checksum = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), v => v.toString(16).padStart(2, '0')).join(''); check()
  const last = await requireAuthority()
  if (last.consentRevision !== first.consentRevision || last.expiresAt !== first.expiresAt) throw new Error('MEMORY_MEDIA_AUTHORITY_CHANGED')
  const upload = httpsCallable<Record<string, unknown>, Record<string, unknown>>(functions, 'registerMemoryMedia')
  check()
  const response = await upload({ memoryId: memory.id, operationId, kind: kinds[file.type], contentType: file.type, base64 }); check()
  const result = response.data
  if (result.memoryId !== memory.id || result.state !== 'ready' || typeof result.receiptId !== 'string' || !/^[a-f0-9]{64}$/.test(result.receiptId)
    || result.sha256 !== checksum || result.byteLength !== bytes.length || result.contentType !== file.type
    || Object.keys(result).some(key => !['receiptId', 'memoryId', 'state', 'sha256', 'byteLength', 'contentType'].includes(key))) throw new Error('MEMORY_MEDIA_RECEIPT_INVALID')
  return { receiptId: result.receiptId, memoryId: memory.id }
}
