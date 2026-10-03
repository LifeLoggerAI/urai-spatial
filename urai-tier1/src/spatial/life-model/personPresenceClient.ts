'use client'

import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'

export type PersonPresenceMessage = { role:'user'|'assistant'; content:string }

export type PersonPresenceResult = {
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
  | { type:'status'; status:string; sessionId?:string; mode?:string }
  | { type:'delta'; text:string }
  | ({ type:'done' } & PersonPresenceResult)
  | { type:'error'; code:string; message:string }

export class PersonPresenceError extends Error {
  constructor(readonly code:string, message='Person presence is unavailable.') {
    super(message)
    this.name = 'PersonPresenceError'
  }
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
  const token = await bearerToken()
  const response = await fetch(clientApiUrl('/api/urai/person-presence/conversation'),{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    cache:'no-store',
    signal:input.signal,
    body:JSON.stringify({
      sessionId:input.sessionId,
      message:input.message,
      context:input.context.slice(-10),
      locale:input.locale,
      aiProcessingConsent:input.aiProcessingConsent,
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

  const reader=response.body.getReader()
  const decoder=new TextDecoder()
  let buffer='', finalResult:PersonPresenceResult|null=null
  while(true){
    const {value,done}=await reader.read()
    if(done) break
    buffer+=decoder.decode(value,{stream:true})
    const lines=buffer.split('\n')
    buffer=lines.pop()??''
    for(const line of lines){
      if(!line.trim()) continue
      let event:PersonPresenceEvent
      try{event=JSON.parse(line) as PersonPresenceEvent}catch{continue}
      input.onEvent?.(event)
      if(event.type==='done') finalResult=event
      if(event.type==='error') throw new PersonPresenceError(event.code,event.message)
    }
  }
  if(!finalResult) throw new PersonPresenceError('PERSON_PRESENCE_INCOMPLETE','Person presence returned an incomplete response.')
  if(finalResult.historicalSourceAuthority!==false || finalResult.syntheticOutputMayBecomeHistoricalSource!==false){
    throw new PersonPresenceError('PERSON_PRESENCE_TRUTH_BOUNDARY_FAILED','Person presence truth boundary failed.')
  }
  return finalResult
}
