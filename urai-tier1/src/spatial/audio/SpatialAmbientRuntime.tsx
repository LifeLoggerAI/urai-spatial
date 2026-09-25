'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useUraiWorldState } from '@/spatial/world/WorldStateProvider'
import { useAudioController } from './useAudioController'
import type { SpatialAudioCue, SpatialAudioPhase } from './audioTypes'

const SESSION_KEY = 'urai:spatial-audio-consent-v1'
const MUTE_KEY = 'urai:spatial-audio-muted-v1'
const AMBIENT_CAPTIONS: Record<SpatialAudioPhase, string> = {
  HOME:'A soft filtered-noise bed with low sustained sanctuary tones.',
  GROUND:'A low filtered environmental bed with restrained sustained tones.',
  ASCENT:'A spacious filtered-noise field with layered harmonic tones.',
  LIFEMAP:'A spacious filtered-noise field with layered harmonic tones.',
  FOCUS:'A close, steady filtered-noise bed with stable low tones.',
  REPLAY:'A restrained filtered-noise cinematic bed with slow harmonic tones.',
  MIRROR:'A near-silent reflective room tone with two soft, steady low partials; no pulse or rhythmic cue.',
}
const SILENT_DESTINATION_CAPTIONS: Record<string, string> = {
  passport: 'Passport is silence-first; permission and identity controls remain available without ambient audio.',
  replay: 'Replay is source-audio-first. No generic ambient loop plays when an authorized memory source has no audio.',
}
const CUE_CAPTIONS: Record<SpatialAudioCue,string> = {
  transition:'Realm transition.',
  'orb-confirm':'Orb confirmed.',
  confirm:'Action confirmed.',
  permission:'Permission action acknowledged.',
  error:'Action could not be completed.',
}
function phaseForDestination(destination:string, transition:string): SpatialAudioPhase|null { if(transition==='ascending'||transition==='travelling') return 'ASCENT'; if(destination==='home') return 'HOME'; if(destination==='infrastructure-hub') return 'GROUND'; if(destination==='life-map') return 'LIFEMAP'; if(destination==='focus') return 'FOCUS'; if(destination==='replay') return null; if(destination==='mirror') return 'MIRROR'; return null }

export function SpatialAmbientRuntime(){
  const {world,phase}=useUraiWorldState(); const audio=useAudioController(); const [consented,setConsented]=useState(false); const [muted,setMuted]=useState(true); const [liveCaption,setLiveCaption]=useState(''); const previousTransition=useRef(phase); const spatialPhase=useMemo(()=>phaseForDestination(world.destination,phase),[phase,world.destination]);
  useEffect(()=>{ try{setConsented(sessionStorage.getItem(SESSION_KEY)==='true');setMuted(sessionStorage.getItem(MUTE_KEY)!=='false')}catch{setConsented(false);setMuted(true)} },[])
  useEffect(()=>{
    const handleConsent=(event:Event)=>{const enabled=Boolean((event as CustomEvent<{enabled?:boolean}>).detail?.enabled);setConsented(enabled);setMuted(!enabled);try{sessionStorage.setItem(SESSION_KEY,enabled?'true':'false');sessionStorage.setItem(MUTE_KEY,enabled?'false':'true')}catch{} if (!enabled) {audio.stopAllAudio();return} if(spatialPhase){setLiveCaption(AMBIENT_CAPTIONS[spatialPhase]);audio.setAmbientPhase(spatialPhase)}};
    const handleMute=(event:Event)=>{const nextMuted=Boolean((event as CustomEvent<{muted?:boolean}>).detail?.muted);setMuted(nextMuted);try{sessionStorage.setItem(MUTE_KEY,nextMuted?'true':'false')}catch{} if(nextMuted){audio.stopAmbient();return} if(consented&&spatialPhase)audio.setAmbientPhase(spatialPhase)};
    const handleCue=(event:Event)=>{const cue=(event as CustomEvent<{cue?:SpatialAudioCue}>).detail?.cue;if(!cue||!(cue in CUE_CAPTIONS))return;setLiveCaption(CUE_CAPTIONS[cue]);if(consented&&!muted&&(cue==='confirm'||cue==='permission'))audio.playCue(cue);if('vibrate' in navigator){if(cue==='error')navigator.vibrate([18,35,18]);else if(cue==='permission')navigator.vibrate(12);else if(cue==='confirm'||cue==='orb-confirm')navigator.vibrate(8)}};
    window.addEventListener('urai:audio-consent',handleConsent);window.addEventListener('urai:audio-mute',handleMute);window.addEventListener('urai:audio-cue',handleCue);return()=>{window.removeEventListener('urai:audio-consent',handleConsent);window.removeEventListener('urai:audio-mute',handleMute);window.removeEventListener('urai:audio-cue',handleCue)}
  },[audio,consented,muted,spatialPhase])
  useEffect(()=>{if(!spatialPhase){audio.stopAmbient();setLiveCaption(SILENT_DESTINATION_CAPTIONS[world.destination]??'');return}setLiveCaption(AMBIENT_CAPTIONS[spatialPhase]);if(consented&&!muted)audio.setAmbientPhase(spatialPhase);else audio.stopAmbient()},[audio,consented,muted,spatialPhase,world.destination])
  useEffect(()=>{if(phase!=='idle'&&previousTransition.current==='idle')setLiveCaption(CUE_CAPTIONS.transition);previousTransition.current=phase},[phase])
  return <span className="sr-only" role="status" aria-live="polite" data-urai-spatial-audio-runtime="production-opus-plus-governed-mirror-v3" data-audio-consent={consented?'granted':'not-granted'} data-audio-muted={muted?'true':'false'} data-audio-phase={spatialPhase??'none'} data-audio-silent-destination={SILENT_DESTINATION_CAPTIONS[world.destination]?'true':'false'}>{liveCaption}</span>
}
export default SpatialAmbientRuntime
