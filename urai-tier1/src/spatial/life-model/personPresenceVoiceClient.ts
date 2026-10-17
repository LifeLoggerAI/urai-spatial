'use client'

import { getAuth } from 'firebase/auth'
import { app,firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'
import { contentLanguage,type UraiContentLanguageTag } from '@/lib/i18n/contentLanguage'

export async function requestPersonPresenceVoice(input:{sessionId:string;text:string;locale:UraiContentLanguageTag;externalProcessingConsent:boolean;signal:AbortSignal}){
  const locale=typeof input.locale==='string'?contentLanguage(input.locale)?.speechTag:null
  if(!locale)return {blob:null,errorCode:'INVALID_LOCALE'}
  if(!firebasePublicEnvReady)return {blob:null,errorCode:'FIREBASE_NOT_READY'}
  const user=getAuth(app).currentUser
  if(!user)return {blob:null,errorCode:'AUTH_REQUIRED'}
  const token=await user.getIdToken()
  let response:Response
  try{
    response=await fetch(clientApiUrl('/api/urai/person-presence/voice'),{
      method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      cache:'no-store',signal:input.signal,
      body:JSON.stringify({sessionId:input.sessionId,text:input.text,locale,externalProcessingConsent:input.externalProcessingConsent}),
    })
  }catch(error){if(input.signal.aborted)throw error;return {blob:null,errorCode:'VOICE_NETWORK_UNAVAILABLE'}}
  if(!response.ok){
    let errorCode='PERSON_VOICE_UNAVAILABLE'
    try{const payload=await response.json() as {error?:unknown};if(payload.error)errorCode=String(payload.error)}catch{}
    return {blob:null,errorCode}
  }
  const blob=await response.blob()
  return blob.size?{blob,errorCode:null}:{blob:null,errorCode:'EMPTY_PERSON_VOICE'}
}
