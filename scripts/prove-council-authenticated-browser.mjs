/**
 * Real Council React UI + Firebase Auth/Firestore browser-emulator proof.
 * Synthetic owner data only. NO provider dispatch, secret, or public deploy.
 * NOT an accepted production Memory Star-to-Replay/staging journey.
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const project='demo-urai-council-browser'
for(const [name,want] of Object.entries({
  GCLOUD_PROJECT:project,FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080'
})) assert.equal(process.env[name],want,'Refuse non-isolated emulator: '+name)
assert.match(process.env.URAI_EXACT_HEAD??'',/^[a-f0-9]{40}$/)
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const dest=path.join(root,'artifacts/council-authenticated-browser')
await mkdir(dest,{recursive:true})
const require=createRequire(new URL('../urai-tier1/package.json',import.meta.url))
const {build}=require(createRequire(require.resolve('tsx/package.json')).resolve('esbuild'))
const {chromium}=require('playwright')
const owner={uid:'fictional-council-a',email:'fictional-council-a@example.invalid',password:'Emulator-Only-A-2026!'}
const other={uid:'fictional-council-b',email:'fictional-council-b@example.invalid',password:'Emulator-Only-B-2026!'}
const emulatorApp=admin.initializeApp({projectId:project},'urai-council-emulator-browser')
// The isolated named Admin app owns both emulator SDK clients; do not fall
// back to a default Firebase Admin app or production credentials.
const db=emulatorApp.firestore(),auth=emulatorApp.auth()
await auth.createUser(owner);await auth.createUser(other)
function memory(id,title,year){
  return {ownerId:owner.uid,title,occurredAt:year+'-08-01T12:00:00.000Z',
    summary:'Fictional memory only',emotionalState:'calm',deleted:false,demo:false,
    star:{id,position:[0,0,-4],scale:1},privacy:'private',sourceMedia:[],
    replayManifest:{id:'replay-'+id,version:1,durationMs:10000,segments:[
      {id:'memory',label:'Memory',caption:'Arrival',narratorLine:'Fictional arrival',startsAtMs:0,durationMs:2400},
      {id:'emotion',label:'Emotion',caption:'Feeling',narratorLine:'Fictional feeling',startsAtMs:2400,durationMs:2600},
      {id:'pattern',label:'Pattern',caption:'Pattern',narratorLine:'Fictional pattern',startsAtMs:5000,durationMs:2800},
      {id:'return',label:'Return',caption:'Return',narratorLine:'Fictional return',startsAtMs:7800,durationMs:2200},
    ]}}
}
const memoryA=db.doc('users/'+owner.uid+'/memories/memory-a')
await memoryA.set(memory('memory-a','Lake Alpha 1988','1988'))
await db.doc('users/'+owner.uid+'/memories/memory-b').set(memory('memory-b','Lake Beta 1996','1996'))
await db.doc('users/'+owner.uid+'/lifeMapEvents/star-a').set({userId:owner.uid,type:'memory',title:'Map label A',summary:'Fictional map event',memoryId:'memory-a',sourceType:'manual_seed',occurredAt:'1988-08-01T12:00:00.000Z',replayAvailable:true})
await db.doc('users/'+owner.uid+'/lifeMapEvents/star-b').set({userId:owner.uid,type:'memory',title:'Map label B',summary:'Fictional map event',memoryId:'memory-b',sourceType:'manual_seed',occurredAt:'1996-08-01T12:00:00.000Z',replayAvailable:true})
await db.doc('users/'+owner.uid+'/lifeMapEvents/orphan').set({userId:owner.uid,type:'memory',title:'Unresolved private event',summary:'Not a memory',memoryId:'no-such-memory',sourceType:'manual_seed',occurredAt:'1990-08-01T12:00:00.000Z',replayAvailable:true})
await db.doc('users/'+other.uid+'/lifeMapEvents/foreign').set({userId:other.uid,type:'memory',title:"Other owner private constellation",summary:'Other private data',sourceType:'manual_seed',occurredAt:'1999-08-01T12:00:00.000Z'})
const consentDomains=Object.fromEntries(['memory','location','models','exports','workforce','identity'].map(domain=>[domain,{
  mode:'granted',retentionDays:365,precise:false,replayVisible:true,lifeMapVisible:true,
  modelContext:false,sharingEnabled:false,automationEnabled:false,likenessEnabled:false,
}]))
await db.doc('users/'+owner.uid+'/privacyPolicy/current').set({
  version:2,revision:1,ownerId:owner.uid,domains:consentDomains,
  enforcement:{state:'fully-enforced',jobId:'council-browser-enforcement',affectedTargets:['memory'],providerState:'not-applicable'},
})

const entry=[
 "import React,{useEffect,useState} from 'react'",
 "import {createRoot} from 'react-dom/client'",
 "import {getAuth,connectAuthEmulator,signInWithEmailAndPassword,signOut} from 'firebase/auth'",
 "import {getFirestore,connectFirestoreEmulator,getDoc,doc} from 'firebase/firestore'",
 "import {app} from './src/lib/firebase/client'",
 "import CouncilConversationPanel from './src/spatial/council/CouncilConversationPanel'",
 "import {useLifeMapEvents} from './src/components/lifemap/useLifeMapEvents'", 
 "const auth=getAuth(app)",
 "connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true})",
 "connectFirestoreEmulator(getFirestore(app),'127.0.0.1',8080)",
 "const accounts=window.__uraiFictionalAccounts",
 "window.__uraiProofSignOut=()=>signOut(auth)",
 "window.__uraiProofOther=()=>signInWithEmailAndPassword(auth,accounts.other.email,accounts.other.password)",
 "window.__uraiProofOwner=()=>signInWithEmailAndPassword(auth,accounts.owner.email,accounts.owner.password)",
 "window.__uraiProofReadFirstOwnerMemory=async()=>{try{const snap=await getDoc(doc(getFirestore(app),'users',accounts.owner.uid,'memories','memory-a'));return {allowed:true,exists:snap.exists()}}catch(error){return {allowed:false,code:error.code||'unknown'}}}",
 "const agent={id:'fictional-archivist',name:'The Archivist',role:'archivist',focus:'Fictional lake chronology'}",
 "function MapObserver(){const [uid,setUid]=useState(auth.currentUser?.uid||null);useEffect(()=>auth.onAuthStateChanged(u=>setUid(u?.uid||null)),[]);const data=useLifeMapEvents(uid||undefined);return <output data-proof-map-mode={data.sourceMode} data-proof-map-nodes={JSON.stringify(data.nodes.map(n=>({id:n.id,title:n.title,authorized:n.authorizedMemory||false,locked:n.locked||false,manifest:n.replayManifestId||null})))} />}",
 "function Shell(){const[state,setState]=useState('signing-in');useEffect(()=>{let alive=true;",
 " signInWithEmailAndPassword(auth,accounts.owner.email,accounts.owner.password).then(r=>{if(r.user.uid!==accounts.owner.uid)throw Error('WRONG_OWNER');if(alive)setState('ready')}).catch(()=>{if(alive)setState('failed')});",
 " return()=>{alive=false}},[]);return <main data-proof-auth={state}>{state==='ready'?<CouncilConversationPanel agent={agent}/>:<p role='status'>Authenticating fictional user</p>}<MapObserver/></main>}",
 "createRoot(document.getElementById('root')).render(<Shell/>)"
].join('\n')
const bundled=(await build({
 stdin:{contents:entry,resolveDir:path.join(root,'urai-tier1'),loader:'tsx'},
 bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',logLevel:'error',
 banner:{js:'var process={env:{NODE_ENV:"test"}};'},
 define:{
  'process.env.NODE_ENV':'"test"',
  'process.env.NEXT_PUBLIC_FIREBASE_API_KEY':'"demo-key"',
  'process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN':'"demo-urai-council-browser.firebaseapp.com"',
  'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID':'"demo-urai-council-browser"',
  'process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET':'"demo-urai-council-browser.appspot.com"',
  'process.env.NEXT_PUBLIC_FIREBASE_APP_ID':'"1:123456789:web:council-emulator"',
  'process.env.NEXT_PUBLIC_URAI_COUNCIL_ANTHROPIC_ENABLED':'"true"',
  'process.env.NEXT_PUBLIC_URAI_COUNCIL_GEMINI_ENABLED':'"false"',
  'process.env.NEXT_PUBLIC_URAI_COUNCIL_XAI_ENABLED':'"false"',
  'process.env.NEXT_PUBLIC_URAI_COUNCIL_MISTRAL_ENABLED':'"false"'
 },
 plugins:[{name:'real-urai-source',setup(plugin){
   plugin.onResolve({filter:/^next\/navigation$/},()=>({path:'test-navigation',namespace:'test-next'}))
   plugin.onLoad({filter:/.*/,namespace:'test-next'},()=>({loader:'js',contents:"export const useRouter=()=>({push:(url)=>window.history.pushState({},'',url)});export const useSearchParams=()=>new URLSearchParams(window.location.search)"}))
   plugin.onResolve({filter:/^@\//},args=>{const base=path.join(root,'urai-tier1/src',args.path.slice(2))
     const found=[base,base+'.ts',base+'.tsx',path.join(base,'index.ts'),path.join(base,'index.tsx')].find(existsSync)
     if(!found)throw Error('Missing real module '+args.path);return {path:found}})
 }}]
})).outputFiles[0].text
const server=createServer((request,response)=>{
 if(request.url==='/bundle.js'){response.writeHead(200,{'content-type':'application/javascript','cache-control':'no-store'});response.end(bundled);return}
 if(request.url?.startsWith('/?')){response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="background:#090e14;color:#fff;font:16px system-ui"><div id="root"></div><script src="/bundle.js"></script></body></html>');return}
 response.writeHead(404);response.end('Not found')
})
let browser
const evidence={schema:'urai-council-authenticated-browser-v1',exactHead:process.env.URAI_EXACT_HEAD,project,
 classification:'SYNTHETIC_AUTH_FIRESTORE_EMULATOR_BROWSER_ONLY_NOT_STAGING_OR_PROVIDER_PROOF',
 productionCouncilComponent:true,realFirebaseAuthAndFirestoreEmulators:true,paidProviderCalls:0,profiles:[],errors:[],passed:false}
try{
 await new Promise(resolve=>server.listen(4176,'127.0.0.1',resolve))
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 for(const profile of [{name:'desktop',width:1280,height:800},{name:'mobile-reduced',width:390,height:844,motion:'reduce'}]){
  await memoryA.set(memory('memory-a','Lake Alpha 1988','1988'))
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},reducedMotion:profile.motion||'no-preference'})
  try{
   const page=await context.newPage(),errors=[],modelRequests=[]
   page.on('pageerror',error=>errors.push(String(error.message).slice(0,400)))
   page.on('request',request=>{if(/\/api\/urai\/(council|orb)\//.test(new URL(request.url()).pathname))modelRequests.push(request.url())})
   await page.addInitScript(value=>{window.__uraiFictionalAccounts=value},{owner,other})
   await page.goto('http://127.0.0.1:4176/?memoryId=memory-a',{waitUntil:'domcontentloaded'})
   await page.locator('[data-proof-auth="ready"]').waitFor({timeout:30000})
   await page.getByText(/Selected Memory Star: Lake Alpha 1988/).waitFor({timeout:30000})
   assert.ok(!(await page.locator('body').innerText()).includes('Lake Beta 1996'))
   const mapState=page.locator('[data-proof-map-nodes]')
   await page.waitForFunction(()=>{const out=document.querySelector('[data-proof-map-nodes]');if(!out)return false;const nodes=JSON.parse(out.getAttribute('data-proof-map-nodes')||'[]');return nodes.some(n=>n.id==='star-a'&&n.authorized&&n.manifest==='replay-memory-a')&&nodes.some(n=>n.id==='star-b'&&n.authorized&&n.manifest==='replay-memory-b')})
   const liveNodes=JSON.parse(await mapState.getAttribute('data-proof-map-nodes'))
   assert.ok(liveNodes.some(n=>n.id==='orphan'&&n.locked&&!n.authorized),'Orphan event must never become an authorized Focus route')
   assert.ok(liveNodes.every(n=>n.title!=="Other owner private constellation"),'Another account must not appear in owner Life Map')
   const checks=page.locator('.councilConversation input[type="checkbox"]')
   assert.ok(await checks.count()>=4)
   await page.locator('#urai-council-message').fill('Which lake was visited?')
   await checks.nth(0).check()
   assert.equal(await page.getByRole('button',{name:'Ask Council'}).isDisabled(),true,'Private disclosure must remain unapproved')
   await checks.nth(3).check()
   assert.equal(await page.getByRole('button',{name:'Ask Council'}).isEnabled(),true)
   const image=await page.screenshot({path:path.join(dest,profile.name+'.png'),animations:'disabled'})
   await memoryA.update({title:'Lake Alpha corrected 1988'})
   await page.getByText(/Selected Memory Star: Lake Alpha corrected 1988/).waitFor({timeout:30000})
   assert.equal(await page.locator('textarea').inputValue(),'')
   assert.equal(await checks.nth(0).isChecked(),false)
   assert.equal(await checks.nth(3).isChecked(),false)
   await page.evaluate(()=>window.history.pushState({},'','/?memoryId=memory-b'))
   await page.getByText(/Selected Memory Star: Lake Beta 1996/).waitFor({timeout:30000})
   assert.ok(!(await page.locator('body').innerText()).includes('Lake Alpha corrected 1988'))
   await page.evaluate(()=>window.__uraiProofSignOut())
   await page.getByText(/Sign in to open this private memory/).waitFor({timeout:30000})
   assert.ok(!(await page.locator('body').innerText()).includes('Lake Beta 1996'))
   await page.evaluate(()=>window.__uraiProofOther())
   await page.getByText(/Private memory consent authority is unavailable/).waitFor({timeout:30000})
   await page.waitForFunction(()=>{const el=document.querySelector('[data-proof-map-nodes]');return el&&JSON.parse(el.getAttribute('data-proof-map-nodes')||'[]').every(n=>n.id!=='star-a'&&n.id!=='star-b')})
   assert.ok(!(await page.locator('body').innerText()).includes('Lake Beta 1996'))
   // The UI must hide private data, but Firestore must also refuse a direct
   // cross-account read of the canonical owner document.
   const foreignRead=await page.evaluate(()=>window.__uraiProofReadFirstOwnerMemory())
   assert.deepEqual(foreignRead,{allowed:false,code:'permission-denied'},
     'Firestore security rules must deny an authenticated foreign owner')
   // Persistent correction is not proven by an in-memory React update. Sign
   // the original owner back in after a foreign actor, revisit the original
   // document, and verify the corrected version is still stored and displayed.
   await page.evaluate(()=>window.__uraiProofSignOut())
   await page.evaluate(()=>window.__uraiProofOwner())
   await page.evaluate(()=>window.history.pushState({},'','/?memoryId=memory-a'))
   await page.getByText(/Selected Memory Star: Lake Alpha corrected 1988/).waitFor({timeout:30000})
   await page.waitForFunction(()=>{const el=document.querySelector('[data-proof-map-nodes]');return el&&JSON.parse(el.getAttribute('data-proof-map-nodes')||'[]').some(n=>n.id==='star-a'&&n.title==='Lake Alpha corrected 1988'&&n.authorized)})
   assert.ok(!(await page.locator('body').innerText()).includes('Lake Alpha 1988'),
     'Superseded title must not reappear after owner reauthentication')
   const ownerRead=await page.evaluate(()=>window.__uraiProofReadFirstOwnerMemory())
   assert.equal(ownerRead.allowed,true,'Owner can read their persisted corrected memory')
   assert.equal(ownerRead.exists,true)
   const reauthChecks=page.locator('.councilConversation input[type="checkbox"]')
   assert.equal(await reauthChecks.nth(0).isChecked(),false,'Processing consent is not carried over between sessions')
   assert.equal(await reauthChecks.nth(3).isChecked(),false,'Evidence disclosure is not carried over between sessions')
   assert.equal(modelRequests.length,0,'No external AI request is permitted in this emulator proof')
   assert.deepEqual(errors,[],profile.name+' uncaught runtime errors')
   evidence.profiles.push({name:profile.name,passed:true,correctionInvalidatedConsent:true,foreignOwnerDenied:true,foreignOwnerFirestoreReadDenied:true,
     correctedMemoryPersistedAcrossActorSwitchAndReauthentication:true,
     screenshotBytes:image.length,screenshotSha256:createHash('sha256').update(image).digest('hex')})
  }finally{await context.close()}
 }
 evidence.passed=true
}catch(error){evidence.errors.push(String(error.stack||error).slice(0,2600))}
finally{
 await writeFile(path.join(dest,'receipt.json'),JSON.stringify(evidence,null,2)+'\n')
 await browser?.close()
 await new Promise(resolve=>server.close(resolve))
}
assert.equal(evidence.passed,true,JSON.stringify(evidence,null,2))
console.log(JSON.stringify({passed:evidence.passed,profiles:evidence.profiles.length}))
