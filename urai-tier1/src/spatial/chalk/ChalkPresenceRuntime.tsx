'use client'
import {useEffect,useRef,useState,type FormEvent,type CSSProperties} from 'react'
import {usePathname} from 'next/navigation'
import {onAuthStateChanged,type User} from 'firebase/auth'
import {getUraiAuth,firebasePublicEnvReady} from '@/lib/firebase/client'
import {chalkIntent,chalkDiagnostic} from './chalkSpatialContract.mjs'
import {readChalkEmulatorJobs,submitChalkEmulatorDiagnostic} from './chalkJobsEmulatorClient'
import {makeChalkEngineeringIntakeProposal} from './chalkEngineeringIntakeProposal.mjs'
import type {ChalkEngineeringIntakeProposal} from './chalkEngineeringIntakeProposal.mjs'
type Line={speaker:string;text:string}
export default function ChalkPresenceRuntime(){
 const route=usePathname()||'/'
 const permitted=['/','/home','/ascent','/life-map','/focus','/replay'].includes(route)
 const [user,setUser]=useState<User|null>(null),[access,setAccess]=useState('checking')
 const [open,setOpen]=useState(false),[input,setInput]=useState(''),[lines,setLines]=useState<Line[]>([])
 const [status,setStatus]=useState('Engineering preview. No autonomous execution.'),[busy,setBusy]=useState(false)
 const [speechConsent,setSpeechConsent]=useState(false),[listening,setListening]=useState(false)
 const [report,setReport]=useState(''),[jobs,setJobs]=useState<Array<{jobId:string;status:string}>>([])
 const [pending,setPending]=useState<{proposal:ChalkEngineeringIntakeProposal;ownerUid:string;epoch:number}|null>(null)
 const generation=useRef(0),recognition=useRef<{abort():void}|null>(null),closeRef=useRef<HTMLButtonElement>(null)
 const stop=()=>{recognition.current?.abort();recognition.current=null;setListening(false)}
 useEffect(()=>{if(!firebasePublicEnvReady){setAccess('unavailable');return}
  let disposed=false;const auth=getUraiAuth()
  const unsubscribe=onAuthStateChanged(auth,async current=>{
   const epoch=++generation.current;recognition.current?.abort();recognition.current=null
   setListening(false);setUser(null);setLines([]);setJobs([]);setReport('');setPending(null);setBusy(false);setInput('');setSpeechConsent(false)
   if(!current){setAccess('denied');return}
   setAccess('checking')
   try{const token=await current.getIdTokenResult(true);const c=token.claims as Record<string,unknown>
    if(disposed||generation.current!==epoch||auth.currentUser!==current)return
    const roles=Array.isArray(c.roles)?c.roles:[]
    if(!(c.role==='admin'||c.role==='operator'||c.uraiJobsAdmin===true||roles.includes('admin')||roles.includes('operator'))){setAccess('denied');return}
    setUser(current);setAccess('permitted')
   }catch{if(!disposed&&generation.current===epoch)setAccess('denied')}
  },()=>{generation.current++;setAccess('denied');setUser(null)})
  return()=>{disposed=true;generation.current++;unsubscribe();recognition.current?.abort()}
 },[])
 useEffect(()=>{setReport('');setPending(null)},[route])
 useEffect(()=>{if(open)closeRef.current?.focus()},[open])
 if(!permitted)return null
 const active=(saved:User,epoch:number)=>generation.current===epoch&&getUraiAuth().currentUser===saved
 const add=(speaker:string,text:string)=>setLines(prev=>[...prev.slice(-9),{speaker,text}])
 const send=async(e:FormEvent)=>{
  e.preventDefault();const text=input.trim();if(!text||busy||!user||access!=='permitted')return
  const saved=user,epoch=generation.current;stop();setInput('');add('You',text);setBusy(true)
  try{const intent=chalkIntent(text)
   if(intent==='READ_JOBS'){
    try {
      const actual=await readChalkEmulatorJobs()
      if(!active(saved,epoch))return
      setJobs(actual.map(j=>({jobId:j.jobId,status:j.admission==='HELD_UNQUEUED'?'HELD_UNQUEUED':j.status})))
      add('Chalk',actual.length+' authorized engineering job records returned by the protected Jobs emulator. Held requests are not running.')
      setStatus('Emulator-only readback verified for this session.')
    } catch {
      if(active(saved,epoch)){
        setJobs([])
        add('Chalk','Jobs readback unavailable. Separate emulator authentication and approved binding are required. No results were invented.')
        setStatus('Engineering Jobs unavailable or access denied.')
      }
    }
   }else if(intent==='DIAGNOSTIC'){
    const component=route==='/'?'home':route.slice(1)
    const sourceSha=process.env.NEXT_PUBLIC_URAI_BUILD_SHA||''
    // Never infer private selection from query strings, the scene DOM or model text.
    // Authorized memory reference and server submission require a separate future gate.
    const deltas:number[]=[]
    if(document.visibilityState==='visible')await new Promise<void>(resolve=>{
     let prior=0,frame=0,done=false
     const finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);clearTimeout(deadline);resolve()}
     const deadline=setTimeout(finish,2500)
     const tick=(t:number)=>{if(done)return;if(prior)deltas.push(t-prior);prior=t;if(deltas.length>=24)finish();else frame=requestAnimationFrame(tick)}
     frame=requestAnimationFrame(tick)
    })
    if(!active(saved,epoch))return
    const diagnostic=chalkDiagnostic({route,component,sourceSha,actorUid:saved.uid,frames:deltas})
    setReport(JSON.stringify(diagnostic,null,2))
    const proposal=makeChalkEngineeringIntakeProposal({requestId:crypto.randomUUID(),sourceSha,route,diagnostic,issue:/choppy|lag|stutter|slow|jitter|transition/i.test(text)?'performance':'interaction'})
    setPending({proposal,ownerUid:saved.uid,epoch})
    add('Chalk','Local scene diagnostic captured. It is NOT a submitted engineering job; no private Star or source media was read.')
   }else add('Chalk','That engineering action is not connected or approved. No action was taken.')
  }catch{if(active(saved,epoch))add('Chalk','The protected capability or exact source identity is unavailable. No job or approval was changed.')}
  finally{if(active(saved,epoch))setBusy(false)}
 }
 const submitPending=async()=>{
  const selected=pending,saved=user
  if(!selected||!saved||busy||access!=='permitted'||!active(saved,selected.epoch)||
     selected.ownerUid!==saved.uid||selected.proposal.route!==route)return
  setBusy(true)
  try{
   const result=await submitChalkEmulatorDiagnostic({problem:selected.proposal.problem,
    requestId:selected.proposal.requestId,diagnostic:selected.proposal.diagnostic,
    sourceSha:selected.proposal.sourceSha})
   if(!active(saved,selected.epoch)||selected.proposal.route!==route)return
   setPending(null)
   add('Chalk','Jobs emulator acknowledged held engineering request '+result.jobId+'. No worker was dispatched.')
   setStatus('HELD_UNQUEUED · awaiting separate human-governed worker approval')
  }catch{
   if(active(saved,selected.epoch)){
    add('Chalk','Protected intake unavailable or permission denied. No submission receipt was obtained.')
    setStatus('Submission unverified. Request remains local for explicit retry.')
   }
  }finally{if(active(saved,selected.epoch))setBusy(false)}
 }
 const voice=()=>{if(!speechConsent||!user||busy)return
  const scope=window as unknown as {SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any}
  const C=scope.SpeechRecognition||scope.webkitSpeechRecognition
  if(!C){setStatus('Browser speech input unavailable. Type instead.');return}
  stop();const r=new C(),saved=user,epoch=generation.current
  r.continuous=false;r.interimResults=false;r.lang='en-US'
  r.onresult=(ev:{results:ArrayLike<{0:{transcript:string}}>})=>{if(recognition.current===r&&active(saved,epoch))setInput(Array.from(ev.results).map(v=>v[0]?.transcript||'').join(' ').slice(0,1200))}
  r.onend=()=>{if(recognition.current===r){recognition.current=null;setListening(false)}}
  r.onerror=r.onend;recognition.current=r;setListening(true)
  try{r.start()}catch{stop();setStatus('Voice recognition could not start.')}
 }
 const button:CSSProperties={minHeight:48,borderRadius:12,padding:'8px 14px',border:'1px solid #708995',background:'#20313c',color:'#f4fbff',cursor:'pointer'}
 return <>
  {!open?<button data-urai-chalk-launcher="true" onClick={()=>setOpen(true)} style={{...button,position:'fixed',right:12,bottom:90,zIndex:1901}} aria-label="Open Chalk engineering presence">Chalk</button>:
  <aside data-urai-chalk-presence="restricted-v1" aria-label="Chalk engineering presence" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();stop();setOpen(false)}}} style={{position:'fixed',right:12,bottom:12,zIndex:2147483602,width:'min(410px,calc(100vw - 24px))',maxHeight:'min(650px,calc(100dvh - 24px))',overflowY:'auto',boxSizing:'border-box',background:'rgba(8,17,26,.97)',border:'1px solid #5c7889',borderRadius:22,padding:16,color:'#f3faff',font:'14px/1.5 system-ui',boxShadow:'0 20px 60px #0009'}}>
   <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><div><strong>Chalk · Engineering</strong><div style={{fontSize:12,opacity:.8}}>Separate from ADAM and Council</div></div><button ref={closeRef} style={button} onClick={()=>{stop();setOpen(false)}}>Close</button></header>
   <p style={{fontSize:12,color:'#f1d9af'}}>Restricted preview. No live worker, provider spend, private media or engineering command dispatch.</p>
   {access!=='permitted'?<p role="status">{access==='checking'?'Checking current operator identity…':access==='unavailable'?'Firebase authentication unavailable.':'Engineering access denied or signed out.'}</p>:
   <><div role="log" aria-live="polite" style={{maxHeight:170,overflowY:'auto',padding:8,background:'#071019',borderRadius:12}}>
    {lines.length?lines.map((line,i)=><p key={i}><strong>{line.speaker}: </strong>{line.text}</p>):<p>Ask about governed engineering Jobs or describe something wrong in this world.</p>}
   </div>
   <form onSubmit={send} style={{display:'grid',gap:9,marginTop:12}}>
    <textarea aria-label="Message Chalk" maxLength={1200} rows={3} value={input} onChange={e=>setInput(e.target.value)} placeholder="Chalk, this transition feels choppy…" style={{width:'100%',boxSizing:'border-box',background:'#14242e',color:'white',padding:12,border:'1px solid #738994',borderRadius:12}}/>
    <label style={{fontSize:12,display:'flex',gap:9}}><input type="checkbox" checked={speechConsent} onChange={e=>{setSpeechConsent(e.target.checked);if(!e.target.checked)stop()}}/>Allow this browser’s speech recognition for input</label>
    <div style={{display:'flex',flexWrap:'wrap',gap:8}}><button style={button} type="submit" disabled={!input.trim()||busy}>Send</button><button style={button} type="button" disabled={!speechConsent||busy} onClick={voice}>{listening?'Listening…':'Voice'}</button><button style={button} type="button" disabled={!listening} onClick={stop}>Stop</button></div>
   </form>
   <p role="status" style={{fontSize:12}}>{status}</p>
   {jobs.length?<ul aria-label="Engineering job status">{jobs.map((j,i)=><li key={j.jobId||i}>{j.jobId}: {j.status}</li>)}</ul>:null}
   {pending?<section aria-label="Engineering diagnostic review" style={{padding:10,border:'1px solid #718997',borderRadius:12}}><p>Nonprivate scene diagnostic prepared for held engineering review. Nothing has been submitted.</p><p>{pending.proposal.problem}</p><div style={{display:'flex',gap:8}}><button type="button" style={button} disabled={busy} onClick={submitPending}>Submit held diagnostic (emulator only)</button><button type="button" style={button} disabled={busy} onClick={()=>setPending(null)}>Discard</button></div></section>:null}
   {report?<section><strong>Local diagnostic — NOT SUBMITTED</strong><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:11}}>{report}</pre></section>:null}
   </>}
   <small>Source review and a deployed protected Jobs callable are required before real task readback. Never treat client diagnostics as server evidence.</small>
  </aside>}
 </>}
