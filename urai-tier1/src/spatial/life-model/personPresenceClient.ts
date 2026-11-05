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
  const user = getAuth(app).currentUser
  if (!user) throw new PersonPresenceError('AUTH_REQUIRED','Sign in to use Person Presence.')
  return user.getIdToken()
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
  const token = await bearerToken()
  const requestId = await stablePersonPresenceRequestId({...input,locale})
  if(!requestId || input.signal.aborted) throw new PersonPresenceError('REQUEST_ID_UNAVAILABLE','Person presence could not establish a stable request identity.')
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
  if(!response.ok || !response.body){
    let code='PERSON_PRESENCE_FAILURE', message='Person presence is unavailable.'
    try{
      const payload=await response.json() as {error?:unknown;message?:unknown}
      if(payload.error) code=String(payload.error)
      if(payload.message) message=String(payload.message)
    }catch{}
    throw new PersonPresenceError(code,message)
  }

  return readPresenceContentStream<PersonPresenceResult,PersonPresenceEvent>(response,{
    locale,signal:input.signal,onEvent:input.onEvent,incompleteCode:'PERSON_PRESENCE_INCOMPLETE',
    error:(code,message)=>new PersonPresenceError(code,message),
    validateDone:(event)=>{
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
