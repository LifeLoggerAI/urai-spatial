'use client'

import { getAuth } from 'firebase/auth'
import { app,firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'
import { contentLanguage,type UraiContentLanguageTag } from '@/lib/i18n/contentLanguage'
import { AdamVoiceResponseError, readAuthorizedAdamVoice } from '../adam/adamVoiceResponseBoundary.mjs'

export async function requestPersonPresenceVoice(input:{sessionId:string;text:string;locale:UraiContentLanguageTag;externalProcessingConsent:boolean;signal:AbortSignal}){
  const locale=typeof input.locale==='string'?contentLanguage(input.locale)?.speechTag:null
  if(!locale)return {blob:null,errorCode:'INVALID_LOCALE'}
  if(!firebasePublicEnvReady)return {blob:null,errorCode:'FIREBASE_NOT_READY'}
  const auth=getAuth(app)
  await auth.authStateReady()
  const user=auth.currentUser
  if(!user)return {blob:null,errorCode:'AUTH_REQUIRED'}
  // Capture the exact Firebase actor, not only the UID. Reauthentication with
  // the same UID is a new session and cannot accept an older owner's voice.
  const token=await user.getIdToken()
  const stillCurrent=()=>auth.currentUser===user && !input.signal.aborted
  if(!token || !stillCurrent())return {blob:null,errorCode:'AUTH_SESSION_CHANGED'}
  let response:Response
  try{
    response=await fetch(clientApiUrl('/api/urai/person-presence/voice'),{
      method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      cache:'no-store',signal:input.signal,
      body:JSON.stringify({sessionId:input.sessionId,text:input.text,locale,externalProcessingConsent:input.externalProcessingConsent}),
    })
  }catch(error){if(input.signal.aborted)throw error;return {blob:null,errorCode:'VOICE_NETWORK_UNAVAILABLE'}}
  if(!stillCurrent()){
    // The response belongs to an actor no longer authorized for this session.
    try{void response.body?.cancel('person-voice-session-changed').catch(()=>{})}catch{}
    return {blob:null,errorCode:'AUTH_SESSION_CHANGED'}
  }
  if(!response.ok){
    let errorCode='PERSON_VOICE_UNAVAILABLE'
    try{const payload=await response.json() as {error?:unknown};if(payload.error)errorCode=String(payload.error)}catch{}
    return {blob:null,errorCode}
  }
  try{
    // Reuse the existing bounded private-audio reader rather than an unbounded
    // response.blob(). It enforces accepted MIME, 8 MiB, current actor, and
    // cancellation even if owner authorization changes during stalled reads.
    const blob=await readAuthorizedAdamVoice(response,{
      signal:input.signal,isAuthorized:stillCurrent,
    })
    return {blob,errorCode:null}
  }catch(error){
    if(!stillCurrent())return {blob:null,errorCode:'AUTH_SESSION_CHANGED'}
    return {blob:null,errorCode:error instanceof AdamVoiceResponseError?error.code:'PERSON_VOICE_UNAVAILABLE'}
  }
}
