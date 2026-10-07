'use client'

import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/client'

export type PersonPresenceMode='HISTORICAL_AS_OF'|'ARCHIVE_PRESENT'|'SIMULATION_PRESENT'

export async function preparePersonPresenceSession(input:{
  bundleId:string
  sceneTruthPacketId:string
  mode:PersonPresenceMode
}){
  const callable=httpsCallable<typeof input & {interactivePresenceConsent:true},{
    sessionId:string
    personId:string
    bundleId:string
    sceneTruthPacketId:string
    authorityDigest:string
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


export async function getPersonPresenceCapabilities(sessionId:string){
  const callable=httpsCallable<{sessionId:string},{
    sessionId:string;bundleId:string;voice:boolean;visual:boolean;motion:boolean;providerIdentifiersExposed:false
  }>(functions,'getPersonPresenceCapabilities')
  const result=(await callable({sessionId})).data
  if(result.providerIdentifiersExposed!==false)throw new Error('PERSON_PRESENCE_CAPABILITY_BOUNDARY_FAILED')
  return result
}
