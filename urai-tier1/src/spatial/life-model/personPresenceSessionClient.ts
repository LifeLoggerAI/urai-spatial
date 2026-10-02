'use client'

import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/client'

export type PersonPresenceMode='HISTORICAL_AS_OF'|'ARCHIVE_PRESENT'|'SIMULATION_PRESENT'

export async function preparePersonPresenceSession(input:{
  bundleId:string
  mode:PersonPresenceMode
}){
  const callable=httpsCallable<typeof input & {interactivePresenceConsent:true},{
    sessionId:string
    personId:string
    bundleId:string
    mode:PersonPresenceMode
    knowledgeCutoff:string|null
    presentationClass:'SIMULATED'
    historicalSourceAuthority:false
    syntheticOutputMayBecomeHistoricalSource:false
  }>(functions,'preparePersonPresenceSession')
  const result=await callable({...input,interactivePresenceConsent:true})
  if(result.data.historicalSourceAuthority!==false || result.data.syntheticOutputMayBecomeHistoricalSource!==false){
    throw new Error('PERSON_PRESENCE_TRUTH_BOUNDARY_FAILED')
  }
  return result.data
}

export async function closePersonPresenceSession(sessionId:string){
  const callable=httpsCallable<{sessionId:string},{sessionId:string;state:'closed'}>(functions,'closePersonPresenceSession')
  return (await callable({sessionId})).data
}
