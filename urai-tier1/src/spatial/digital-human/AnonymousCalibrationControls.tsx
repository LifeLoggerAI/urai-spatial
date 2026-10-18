'use client'
import { useEffect,useRef,useState } from 'react'
import { makeToneWav } from './anonymousCalibration.mjs'

import type { AnonymousRenderFrame } from './AnonymousFacialFixture'
type Frame = AnonymousRenderFrame
export default function AnonymousCalibrationControls({onMedia,onMute,onFreeze,onFrame}:{onMedia:(media:HTMLAudioElement|null)=>void;onMute:(muted:boolean)=>void;onFreeze:(frozen:boolean)=>void;onFrame:Frame|null}) {
 const audioRef=useRef<HTMLAudioElement|null>(null)
 const urlRef=useRef<string|null>(null)
 const [ready,setReady]=useState(false)
 const [muted,setMuted]=useState(false)
 const [playbackRate,setPlaybackRate]=useState(1)
 const [frozen,setFrozen]=useState(false)
 const [playing,setPlaying]=useState(false)
 useEffect(()=>{
  const wav=makeToneWav('capture')
  const url=URL.createObjectURL(new Blob([new Uint8Array(wav)],{type:'audio/wav'}))
  const audio=new Audio(url)
  audio.preload='auto';urlRef.current=url;audioRef.current=audio
  const ended=()=>setPlaying(false)
  audio.addEventListener('ended',ended)
  onMedia(audio);setReady(true)
  return ()=>{audio.removeEventListener('ended',ended);audio.pause();audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);onMedia(null)}
 },[onMedia])
 const play=async()=>{
  const a=audioRef.current;if(!a)return
  try{await a.play();setPlaying(true)}catch{setPlaying(false)}
 }
 const stop=()=>{const a=audioRef.current;if(!a)return;a.pause();a.currentTime=0;setPlaying(false)}
 return <aside data-testid="anonymous-facial-calibration" data-identity="anonymous-nonproduction-not-founder"
 className="pointer-events-auto absolute right-4 top-16 z-30 max-w-72 rounded-lg border border-amber-300/50 bg-black/85 p-3 text-white"
 aria-label="Anonymous technical facial calibration">
 <strong className="text-sm">Anonymous facial animation lab</strong>
 <p className="text-xs">Nine-second non-speech capture tone and anonymous face only. Not Adam, not a Council provider, not production. Facial motion uses the real media clock; optional 0.1x playback allows genuine WebGL screenshots.</p>
 <div className="flex flex-wrap gap-2">
 <button type="button" data-testid="calibration-play" disabled={!ready} onClick={play}>Play test tone</button>
 <button type="button" data-testid="calibration-slow" aria-pressed={playbackRate!==1} onClick={()=>{const next=playbackRate===1 ? 0.1 : 1; if(audioRef.current)audioRef.current.playbackRate=next;setPlaybackRate(next)}}>{playbackRate===1?'Slow audio-clock capture (0.1x)':'Restore normal audio speed'}</button>
 <button type="button" data-testid="calibration-pause" onClick={()=>{audioRef.current?.pause();setPlaying(false)}}>Pause</button>
 <button type="button" data-testid="calibration-stop" onClick={stop}>Stop</button>
 <button type="button" data-testid="calibration-mute" aria-pressed={muted} onClick={()=>{const next=!muted;setMuted(next);onMute(next);if(audioRef.current)audioRef.current.muted=next}}>{muted?'Unmute':'Mute'}</button>
 <button type="button" data-testid="calibration-freeze" aria-pressed={frozen} onClick={()=>{const next=!frozen;setFrozen(next);onFreeze(next)}}>{frozen?'Unfreeze face':'Freeze facial morphs (negative control)'}</button>
 </div>
 <label className="block text-xs">Seek position
  <input aria-label="Calibration audio seek" className="w-full" type="range" min="0" max="9" step=".01" defaultValue="0" onChange={e=>{if(audioRef.current)audioRef.current.currentTime=Number(e.target.value)}}/>
 </label>
 <p aria-live="polite" className="text-xs" data-testid="calibration-status">Audio {playing?'playing':'stopped'}; sample clock {onFrame?.time.toFixed(3)??'0.000'} seconds; geometry weight {onFrame?.max.toFixed(3)??'0.000'}.</p>
 <span data-testid="calibration-telemetry" data-audio-playback-rate={playbackRate} data-morphs-frozen={frozen?'true':'false'} data-playing={onFrame?.playing?'true':'false'} data-max-weight={onFrame?.max??0} data-time={onFrame?.time??0} data-morph-bindings={onFrame?.written??0} data-face-measurement-basis={onFrame?.face.source??'unavailable'} data-face-visible={onFrame?.face.visible?'true':'false'} data-face-cx={onFrame?.face.cx??0} data-face-cy={onFrame?.face.cy??0} data-face-rx={onFrame?.face.rx??0} data-face-ry={onFrame?.face.ry??0} hidden />
 </aside>
}
