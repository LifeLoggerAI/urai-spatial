'use client'

import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'
import { contentLanguage, type UraiContentLanguageTag } from '@/lib/i18n/contentLanguage'
import { readPresenceContentStream } from '@/lib/i18n/presenceContentStream'

export type PersonPresenceMessage = { role:'user'|'assistant'; content:string; locale?:UraiContentLanguageTag }

export type PersonPresenceResult = {
  locale:UraiContentLanguageTag
  message:string
  caption:string
  evidenceClaimIds:string[]
  uncertainty:string
  simulationLabel:string
  provider:'openai'
  historicalSourceAuthority:false
  syntheticOutputMayBecomeHistoricalSource:false
}

export type PersonPresenceEvent =
  | { type:'status'; status:string; sessionId?:string; mode?:string; locale:UraiContentLanguageTag }
  | { type:'delta'; text:string; locale:UraiContentLanguageTag }
  | ({ type:'done' } & PersonPresenceResult)
  | { type:'error'; code:string; message:string }

export class PersonPresenceError extends Error {
  constructor(readonly code:string, message='Person presence is unavailable.') {
    super(message)
    this.name = 'PersonPresenceError'
  }
}

// Error responses may contain private data and can stall after a Firebase
// account switch. Bound the actual network bytes, validate the machine code,
// and never surface raw provider text to another session.
async function boundedPersonPresenceFailure(response: Response, signal: AbortSignal, isCurrent: () => boolean): Promise<PersonPresenceError> {
  const failure = () => new PersonPresenceError('PERSON_PRESENCE_FAILURE')
  const stale = () => new PersonPresenceError('AUTH_SESSION_CHANGED', 'Sign in again to use Person Presence.')
  if (!response.body) return failure()
  const reader = response.body.getReader()
  let authorityLost = false
  const current = () => {
    try { return !authorityLost && !signal.aborted && isCurrent() === true }
    catch { return false }
  }
  const cancel = () => { void reader.cancel('person-presence-error-denied').catch(() => {}) }
  const poll = setInterval(() => {
    if (!current()) { authorityLost = true; cancel() }
  }, 50)
  poll.unref?.()
  signal.addEventListener('abort', cancel, { once: true })
  try {
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      if (!current()) return stale()
      const { done, value } = await reader.read()
      if (!current()) return stale()
      if (done) break
      if (!(value instanceof Uint8Array) || value.byteLength > 4096 - size) return failure()
      size += value.byteLength
      chunks.push(value)
    }
    if (!size) return failure()
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const payload: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    const error = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as { error?: unknown }).error : null
    // Server error messages are intentionally not forwarded: they can include
    // user-supplied or personal context, even for a previously valid actor.
    return new PersonPresenceError(typeof error === 'string' && /^[A-Z][A-Z0-9_]{0,119}$/.test(error)
      ? error : 'PERSON_PRESENCE_FAILURE')
  } catch {
    return current() ? failure() : stale()
  } finally {
    clearInterval(poll)
    signal.removeEventListener('abort', cancel)
    cancel()
    reader.releaseLock()
  }
}

async function stablePersonPresenceRequestId(input:{
  sessionId:string
  message:string
  context:PersonPresenceMessage[]
  locale:string
}) {
  if (!globalThis.crypto?.subtle) return null
  const intent = JSON.stringify({
    sessionId:input.sessionId,
    message:input.message,
    context:input.context.slice(-10),
    locale:input.locale,
  })
  const digest = await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(intent))
  return Array.from(new Uint8Array(digest),(value)=>value.toString(16).padStart(2,'0')).join('')
}

async function bearerToken() {
  if (!firebasePublicEnvReady) throw new PersonPresenceError('FIREBASE_NOT_READY','UrAi authentication is not ready.')
  const auth=getAuth(app)
  await auth.authStateReady()
  const actor=auth.currentUser
  if (!actor) throw new PersonPresenceError('AUTH_REQUIRED','Sign in to use Person Presence.')
  const token=await actor.getIdToken()
  if(!token || auth.currentUser!==actor)
    throw new PersonPresenceError('AUTH_SESSION_CHANGED','Sign in again to use Person Presence.')
  return {token,auth,actor}
}

export async function requestPersonPresence(input:{
  sessionId:string
  message:string
  context:PersonPresenceMessage[]
  locale:string
  aiProcessingConsent:boolean
  signal:AbortSignal
  onEvent?:(event:PersonPresenceEvent)=>void
}):Promise<PersonPresenceResult>{
  const locale=typeof input.locale==='string'?contentLanguage(input.locale)?.speechTag:null
  if(!locale)throw new PersonPresenceError('INVALID_LOCALE','Choose a supported content language.')
  const {token,auth,actor} = await bearerToken()
  const current=()=>auth.currentUser===actor && !input.signal.aborted
  if(!current())throw new PersonPresenceError('AUTH_SESSION_CHANGED','Sign in again to use Person Presence.')
  const requestId = await stablePersonPresenceRequestId({...input,locale})
  if(!requestId || input.signal.aborted) throw new PersonPresenceError('REQUEST_ID_UNAVAILABLE','Person presence could not establish a stable request identity.')
  // Both identity hashing and network awaits may outlive the signed-in actor.
  if(!current())throw new PersonPresenceError('AUTH_SESSION_CHANGED','Sign in again to use Person Presence.')
  const response = await fetch(clientApiUrl('/api/urai/person-presence/conversation'),{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    cache:'no-store',
    signal:input.signal,
    body:JSON.stringify({
      sessionId:input.sessionId,
      message:input.message,
      context:input.context.slice(-10),
      locale,
      aiProcessingConsent:input.aiProcessingConsent,
      requestId,
    }),
  }).catch((error)=>{
    if(input.signal.aborted) throw error
    throw new PersonPresenceError('NETWORK_UNAVAILABLE','Person presence could not be reached.')
  })
  if(!current()){
    try{void response.body?.cancel('person-presence-session-changed').catch(()=>{})}catch{}
    throw new PersonPresenceError('AUTH_SESSION_CHANGED','Sign in again to use Person Presence.')
  }
  if(!response.ok || !response.body){
    throw await boundedPersonPresenceFailure(response,input.signal,current)
  }

  return readPresenceContentStream<PersonPresenceResult,PersonPresenceEvent>(response,{
    locale,signal:input.signal,isCurrent:current,
    onEvent:(event)=>{
      if(!current())throw new PersonPresenceError('AUTH_SESSION_CHANGED','Sign in again to use Person Presence.')
      input.onEvent?.(event)
    },incompleteCode:'PERSON_PRESENCE_INCOMPLETE',
    error:(code,message)=>new PersonPresenceError(code,message),
    validateDone:(event)=>{
      if(!current())throw new PersonPresenceError('AUTH_SESSION_CHANGED','Sign in again to use Person Presence.')
      if(event.historicalSourceAuthority!==false || event.syntheticOutputMayBecomeHistoricalSource!==false){
        throw new PersonPresenceError('PERSON_PRESENCE_TRUTH_BOUNDARY_FAILED','Person presence truth boundary failed.')
      }
      if(event.provider!=='openai' || !Array.isArray(event.evidenceClaimIds) || event.evidenceClaimIds.length>12
        || event.evidenceClaimIds.some((id)=>typeof id!=='string' || !id || id.length>160)
        || typeof event.uncertainty!=='string' || event.uncertainty.length>320
        || typeof event.simulationLabel!=='string' || !event.simulationLabel.trim() || event.simulationLabel.length>120){
        throw new PersonPresenceError('INVALID_PROVIDER_RESPONSE','Person presence returned invalid response metadata.')
      }
    },
  })
}
