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

const entry=[
 "import React,{useEffect,useState} from 'react'",
 "import {createRoot} from 'react-dom/client'",
 "import {getAuth,connectAuthEmulator,signInWithEmailAndPassword,signOut} from 'firebase/auth'",
 "import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore'",
 "import {app} from './src/lib/firebase/client'",
 "import CouncilConversationPanel from './src/spatial/council/CouncilConversationPanel'",
 "const auth=getAuth(app)",
 "connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true})",
 "connectFirestoreEmulator(getFirestore(app),'127.0.0.1',8080)",
 "const accounts=window.__uraiFictionalAccounts",
 "window.__uraiProofSignOut=()=>signOut(auth)",
 "window.__uraiProofOther=()=>signInWithEmailAndPassword(auth,accounts.other.email,accounts.other.password)",
 "const agent={id:'fictional-archivist',name:'The Archivist',role:'archivist',focus:'Fictional lake chronology'}",
 "function Shell(){const[state,setState]=useState('signing-in');useEffect(()=>{let alive=true;",
 " signInWithEmailAndPassword(auth,accounts.owner.email,accounts.owner.password).then(r=>{if(r.user.uid!==accounts.owner.uid)throw Error('WRONG_OWNER');if(alive)setState('ready')}).catch(()=>{if(alive)setState('failed')});",
 " return()=>{alive=false}},[]);return <main data-proof-auth={state}>{state==='ready'?<CouncilConversationPanel agent={agent}/>:<p role='status'>Authenticating fictional user</p>}</main>}",
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
   await page.getByText(/Selected memory could not be found/).waitFor({timeout:30000})
   assert.ok(!(await page.locator('body').innerText()).includes('Lake Beta 1996'))
   assert.equal(modelRequests.length,0,'No external AI request is permitted in this emulator proof')
   assert.deepEqual(errors,[],profile.name+' uncaught runtime errors')
   evidence.profiles.push({name:profile.name,passed:true,correctionInvalidatedConsent:true,foreignOwnerDenied:true,
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
