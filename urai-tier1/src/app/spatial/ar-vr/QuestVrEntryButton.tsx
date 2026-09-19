'use client'

import { useEffect, useState } from 'react'

export type XrMode = 'immersive-vr' | 'immersive-ar'
type QuestSession = { end?: () => Promise<void>; addEventListener?: (type: string, listener: () => void, options?: { once?: boolean }) => void }
type QuestXrNavigator = Navigator & {
  xr?: {
    isSessionSupported?: (mode: XrMode) => Promise<boolean>
    requestSession?: (mode: XrMode, init?: { requiredFeatures?: string[]; optionalFeatures?: string[] }) => Promise<QuestSession>
  }
}
type Props = {
  memoryMode?: boolean
  onModeRequested?: (mode: XrMode) => void
  onSessionRequested?: (session: QuestSession) => Promise<void> | void
  onSessionEnded?: () => void
}
const idleCopy = (memoryMode: boolean) => memoryMode
  ? 'Enter this memory in immersive VR or place its recorded moment into your space with AR when WebXR supports it.'
  : 'Enter the live 3D world in VR or AR on a compatible WebXR browser.'

export default function QuestVrEntryButton({ memoryMode = false, onModeRequested, onSessionRequested, onSessionEnded }: Props) {
  const [copy,setCopy]=useState(()=>idleCopy(memoryMode))
  const [busyMode,setBusyMode]=useState<XrMode|null>(null)
  const [activeMode,setActiveMode]=useState<XrMode|null>(null)
  useEffect(()=>{ if(!busyMode&&!activeMode)setCopy(idleCopy(memoryMode)) },[activeMode,busyMode,memoryMode])

  async function enterXr(mode:XrMode){
    setBusyMode(mode)
    onModeRequested?.(mode)
    setCopy(mode==='immersive-ar'?'Checking immersive AR support…':'Checking immersive VR support…')
    const xr=(navigator as QuestXrNavigator).xr
    if(!xr?.requestSession){setBusyMode(null);setCopy('No WebXR session API is available here. The non-XR experience remains available.');return}
    let requestedSession:QuestSession|null=null
    try{
      const supported=await xr.isSessionSupported?.(mode).catch(()=>false)
      if(supported===false){setCopy(mode==='immersive-ar'?'This browser does not report immersive AR support.':'This browser does not report immersive VR support.');return}
      const session=await xr.requestSession(mode,mode==='immersive-vr'
        ?{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor','hand-tracking']}
        :{optionalFeatures:['local-floor','hit-test','hand-tracking']})
      requestedSession=session
      let sessionEnded=false
      session.addEventListener?.('end',()=>{sessionEnded=true;setActiveMode(null);setCopy('Immersive session ended safely. The experience remains available.');onSessionEnded?.()},{once:true})
      await onSessionRequested?.(session)
      if(sessionEnded){onSessionEnded?.();return}
      setActiveMode(mode)
      setCopy(memoryMode?(mode==='immersive-ar'?'AR memory active.':'VR memory active.'):(mode==='immersive-ar'?'Immersive AR active.':'Immersive VR active.'))
    }catch{
      await requestedSession?.end?.().catch(()=>undefined)
      setActiveMode(null)
      setCopy('Immersive entry was cancelled or rejected. The non-XR experience is still active.')
    }finally{setBusyMode(null)}
  }
  const busy=busyMode!==null,active=activeMode!==null
  return <div className="urai-xr-portal__quest-entry" data-testid="urai-quest-vr-entry-control" data-xr-active-mode={activeMode??'none'}>
    <button type="button" onClick={()=>void enterXr('immersive-vr')} disabled={busy||active}>{busyMode==='immersive-vr'?'Entering VR…':activeMode==='immersive-vr'?'VR active':'Enter VR in Quest'}</button>
    <button type="button" onClick={()=>void enterXr('immersive-ar')} disabled={busy||active}>{busyMode==='immersive-ar'?'Entering AR…':activeMode==='immersive-ar'?'AR active':'Enter AR'}</button>
    <p aria-live="polite">{copy}</p>
  </div>
}
