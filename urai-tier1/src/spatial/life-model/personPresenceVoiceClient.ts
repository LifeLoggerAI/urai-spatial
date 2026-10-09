'use client'

import { getAuth } from 'firebase/auth'
import { app,firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'
import { contentLanguage,type UraiContentLanguageTag } from '@/lib/i18n/contentLanguage'

export async function requestPersonPresenceVoice(input:{sessionId:string;text:string;locale:UraiContentLanguageTag;externalProcessingConsent:boolean;signal:AbortSignal}){
  if(input.signal.aborted)return {blob:null,errorCode:'VOICE_REQUEST_ABORTED'}
  if(!input.externalProcessingConsent)return {blob:null,errorCode:'EXPLICIT_CONSENT_REQUIRED'}
  const locale=typeof input.locale==='string'?contentLanguage(input.locale)?.speechTag:null
  if(!locale)return {blob:null,errorCode:'INVALID_LOCALE'}
  if(!firebasePublicEnvReady)return {blob:null,errorCode:'FIREBASE_NOT_READY'}
  const user=getAuth(app).currentUser
  if(!user)return {blob:null,errorCode:'AUTH_REQUIRED'}
  const ownsAccount=()=>!input.signal.aborted&&getAuth(app).currentUser===user
  const token=await user.getIdToken()
  if(!token||!ownsAccount())return {blob:null,errorCode:'VOICE_AUTHORITY_CHANGED'}
  let response:Response
  try{
    response=await fetch(clientApiUrl('/api/urai/person-presence/voice'),{
      method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      cache:'no-store',signal:input.signal,
      body:JSON.stringify({sessionId:input.sessionId,text:input.text,locale,externalProcessingConsent:input.externalProcessingConsent}),
    })
  }catch(error){if(!ownsAccount())return {blob:null,errorCode:'VOICE_AUTHORITY_CHANGED'};if(input.signal.aborted)throw error;return {blob:null,errorCode:'VOICE_NETWORK_UNAVAILABLE'}}
  if(!ownsAccount()){await response.body?.cancel().catch(()=>undefined);return {blob:null,errorCode:'VOICE_AUTHORITY_CHANGED'}}
  if(!response.ok){
    let errorCode='PERSON_VOICE_UNAVAILABLE'
    try{const payload=await response.json() as {error?:unknown};if(payload.error)errorCode=String(payload.error)}catch{}
    if(!ownsAccount())return {blob:null,errorCode:'VOICE_AUTHORITY_CHANGED'}
    return {blob:null,errorCode}
  }
  const blob=await response.blob()
  if(!ownsAccount())return {blob:null,errorCode:'VOICE_AUTHORITY_CHANGED'}
  return blob.size?{blob,errorCode:null}:{blob:null,errorCode:'EMPTY_PERSON_VOICE'}
}
