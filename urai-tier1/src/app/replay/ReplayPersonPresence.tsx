'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { preparePersonPresenceSession, closePersonPresenceSession, getPersonPresenceCapabilities, type PersonPresenceMode } from '@/spatial/life-model/personPresenceSessionClient'
import { PersonPresenceError, requestPersonPresence, type PersonPresenceMessage } from '@/spatial/life-model/personPresenceClient'
import { requestPersonPresenceVoice } from '@/spatial/life-model/personPresenceVoiceClient'

type PersonChoice={bundleId:string;personId:string;label:string;asOf:string;knowledgeCutoff:string|null}

export function ReplayPersonPresence({people,sceneTruthPacketId}:{people:PersonChoice[];sceneTruthPacketId:string}){
  const [selected,setSelected]=useState<PersonChoice|null>(null)
  const [mode,setMode]=useState<PersonPresenceMode>('HISTORICAL_AS_OF')
  const [sessionId,setSessionId]=useState<string|null>(null)
  const [aiConsent,setAiConsent]=useState(false)
  const [message,setMessage]=useState('')
  const [messages,setMessages]=useState<PersonPresenceMessage[]>([])
  const [streamed,setStreamed]=useState('')
  const [status,setStatus]=useState('Choose a person to start an evidence-grounded simulation.')
  const [busy,setBusy]=useState(false)
  const [voiceAvailable,setVoiceAvailable]=useState(false)
  const [voiceEnabled,setVoiceEnabled]=useState(false)
  const aborter=useRef<AbortController|null>(null)
  const audioRef=useRef<HTMLAudioElement|null>(null)
  const audioUrlRef=useRef<string|null>(null)

  const stop=()=>{
    aborter.current?.abort()
    aborter.current=null
    audioRef.current?.pause()
    audioRef.current=null
    if(audioUrlRef.current){URL.revokeObjectURL(audioUrlRef.current);audioUrlRef.current=null}
    setBusy(false)
    setStreamed('')
    setStatus('Stopped.')
  }

  useEffect(()=>()=>{aborter.current?.abort();audioRef.current?.pause();if(audioUrlRef.current)URL.revokeObjectURL(audioUrlRef.current)},[])

  const start=async(person:PersonChoice)=>{
    stop()
    if(sessionId) await closePersonPresenceSession(sessionId).catch(()=>undefined)
    const chosenMode:PersonPresenceMode=person.knowledgeCutoff?'HISTORICAL_AS_OF':'ARCHIVE_PRESENT'
    setMode(chosenMode)
    setSelected(person)
    setMessages([])
    setAiConsent(false)
    setStatus('Starting governed simulation...')
    try{
      const session=await preparePersonPresenceSession({bundleId:person.bundleId,sceneTruthPacketId,mode:chosenMode})
      setSessionId(session.sessionId)
      const capabilities=await getPersonPresenceCapabilities(session.sessionId).catch(()=>null)
      setVoiceAvailable(capabilities?.voice===true)
      setVoiceEnabled(false)
      setStatus('Simulation ready for '+person.label+'. Enable AI processing to converse.')
    }catch(error){
      setSessionId(null)
      setStatus(error instanceof Error?error.message:'Simulation could not start.')
    }
  }

  const close=async()=>{
    stop()
    const current=sessionId
    setSessionId(null)
    setSelected(null)
    setMessages([])
    setAiConsent(false)
    setVoiceAvailable(false)
    setVoiceEnabled(false)
    if(current) await closePersonPresenceSession(current).catch(()=>undefined)
    setStatus('Simulation closed.')
  }

  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    const text=message.trim()
    if(!sessionId||!selected||!text||!aiConsent||busy)return
    const controller=new AbortController()
    aborter.current=controller
    const prior=messages.slice(-10)
    setMessages(current=>[...current,{role:'user',content:text}])
    setMessage('')
    setStreamed('')
    setBusy(true)
    setStatus('Reconstructing from evidence...')
    try{
      const result=await requestPersonPresence({
        sessionId,
        message:text,
        context:prior,
        locale:typeof navigator==='undefined'?'en-US':navigator.language,
        aiProcessingConsent:true,
        signal:controller.signal,
        onEvent:(evt)=>{if(evt.type==='delta')setStreamed(current=>current+evt.text)},
      })
      setMessages(current=>[...current,{role:'assistant',content:result.caption}])
      setStreamed('')
      if(voiceEnabled&&voiceAvailable){
        const voice=await requestPersonPresenceVoice({sessionId,text:result.caption,externalProcessingConsent:true,signal:controller.signal})
        if(voice.blob){
          if(audioUrlRef.current)URL.revokeObjectURL(audioUrlRef.current)
          const url=URL.createObjectURL(voice.blob);audioUrlRef.current=url
          const audio=new Audio(url);audioRef.current=audio
          void audio.play().catch(()=>undefined)
        }else if(voice.errorCode==='ACCEPTED_PERSON_VOICE_NOT_READY'){
          setVoiceAvailable(false);setVoiceEnabled(false)
        }
      }
      setStatus(result.uncertainty?'Simulation · '+result.uncertainty:'Simulation response grounded in current evidence.')
    }catch(error){
      if(controller.signal.aborted)setStatus('Stopped.')
      else setStatus(error instanceof PersonPresenceError?error.message:'Simulation response failed.')
    }finally{
      if(aborter.current===controller)aborter.current=null
      setBusy(false)
    }
  }

  if(!people.length)return null

  return <section className="replayPersonPresence" aria-label="People in this memory" data-person-presence={sessionId?'active':'available'}>
    <details open={Boolean(selected)}>
      <summary>People</summary>
      {!selected?<div className="replayPersonChoices">{people.map(person=><button key={person.bundleId} type="button" onClick={()=>void start(person)}>{person.label}<small>{person.asOf?'As of '+person.asOf:'Evidence-grounded state'}</small></button>)}</div>:
      <div className="replayPersonSession">
        <header><div><strong>{selected.label}</strong><small>{mode==='HISTORICAL_AS_OF'?'Historical simulation · knowledge cutoff '+selected.knowledgeCutoff:'Archive-present simulation'}</small></div><button type="button" onClick={()=>void close()}>Close</button></header>
        <p className="truthLabel">Simulation — generated replies are not historical speech or testimony.</p>
        <label className="presenceConsent"><input type="checkbox" checked={aiConsent} onChange={event=>setAiConsent(event.currentTarget.checked)} /> Allow this conversation to use the configured AI provider with the authorized evidence context.</label>
        {voiceAvailable?<label className="presenceConsent"><input type="checkbox" checked={voiceEnabled} onChange={event=>setVoiceEnabled(event.currentTarget.checked)} /> Use this person's accepted private voice for generated simulation replies. Text remains available if voice fails.</label>:<p className="voiceFallback">Accepted private voice is not available for this person/time state. Text simulation remains available.</p>}
        <div className="presenceTranscript" aria-live="polite">{messages.map((item,index)=><p key={item.role+'-'+index} data-role={item.role}><strong>{item.role==='user'?'You':selected.label}</strong>{item.content}</p>)}{streamed?<p data-role="assistant"><strong>{selected.label}</strong>{streamed}</p>:null}</div>
        <form onSubmit={event=>void submit(event)}><label htmlFor="person-presence-message">Message</label><textarea id="person-presence-message" value={message} maxLength={2500} onChange={event=>setMessage(event.currentTarget.value)} disabled={!sessionId||busy}/><div><button type="button" onClick={stop} disabled={!busy}>Stop</button><button type="submit" disabled={!sessionId||!aiConsent||busy||message.trim().length===0}>Send</button></div></form>
        <p role="status">{status}</p>
      </div>}
    </details>
    <style>{css}</style>
  </section>
}

const css='.replayPersonPresence{position:absolute;z-index:12;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));width:min(440px,calc(100vw - 36px));color:#effaff}.replayPersonPresence>details>summary{width:max-content;min-height:48px;display:grid;place-items:center;padding:0 16px;border:1px solid #ffffff42;border-radius:999px;background:#020914d9;backdrop-filter:blur(16px);font-size:12px;font-weight:800;cursor:pointer}.replayPersonChoices,.replayPersonSession{margin-top:8px;padding:12px;border:1px solid #ffffff32;border-radius:18px;background:#020914f2;box-shadow:0 18px 70px #000}.replayPersonChoices{display:grid;gap:8px}.replayPersonChoices button{min-height:52px;text-align:left;padding:9px 13px;border:1px solid #ffffff30;border-radius:14px;background:#0a1d2a;color:#fff;font-weight:800}.replayPersonChoices small,.replayPersonSession small{display:block;margin-top:3px;color:#b9cedc;font-weight:500}.replayPersonSession header{display:flex;justify-content:space-between;gap:12px;align-items:start}.replayPersonSession button{min-height:48px;padding:0 14px;border:1px solid #ffffff30;border-radius:999px;background:#0a1d2a;color:#fff;font-weight:800}.truthLabel{padding:9px 11px;border-radius:12px;background:#492d0938;color:#ffe5b1;font-size:12px}.presenceConsent{display:flex;gap:9px;align-items:flex-start;font-size:12px;line-height:1.45}.presenceConsent input{width:20px;height:20px;flex:0 0 auto}.voiceFallback{color:#b9cedc;font-size:11px}.presenceTranscript{max-height:220px;overflow:auto;margin:10px 0}.presenceTranscript p{display:grid;gap:3px;margin:7px 0;padding:9px;border-radius:12px;background:#ffffff0b}.presenceTranscript p[data-role=user]{background:#78dff214}.replayPersonSession form label{display:block;font-size:12px;font-weight:800}.replayPersonSession textarea{box-sizing:border-box;width:100%;min-height:82px;margin-top:5px;padding:10px;border:1px solid #ffffff30;border-radius:12px;background:#06111d;color:#fff;resize:vertical}.replayPersonSession form>div{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}.replayPersonSession>p[role=status]{margin-bottom:0;color:#b9cedc;font-size:11px}.replayPersonPresence :is(summary,button,textarea,input):focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:700px){.replayPersonPresence{left:14px;bottom:max(76px,calc(env(safe-area-inset-bottom) + 70px));width:min(360px,calc(100vw - 28px))}.presenceTranscript{max-height:160px}}@media(prefers-reduced-motion:reduce){.replayPersonPresence>details>summary,.replayPersonChoices,.replayPersonSession{backdrop-filter:none}}'
