#!/usr/bin/env node
/** Non-release, fail-closed Wave 41: original Next LoginClient + Firebase emulator. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import admin from 'firebase-admin'
const requireTier1=createRequire(new URL('../urai-tier1/package.json',import.meta.url))
const {chromium}=requireTier1('playwright')
const project='demo-urai-auth-journey', origin='http://127.0.0.1:4173'
const out=path.resolve('artifacts/authenticated-full-journey')
const sha=process.env.URAI_EXACT_HEAD||''
const result={schema:'urai-real-app-emulator-journey-v2',sourceSha:sha,
 authDiagnostics:null,
 classification:'NON_RELEASE_PARTIAL_EMULATOR_PROOF',status:'FAIL_CLOSED',
 milestones:[],screenshots:[],errors:[],firstFailure:null,
 authenticMedia:false,deviceCertified:false,finalWorldArt:false}
let app,server,browser,disposableAuth,disposableDb
const disposableUsers=[]
const disposableDocs=[]
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const mark=(name,data={})=>result.milestones.push({name,...data})
async function screenshot(page,name){
 const image=await page.screenshot({path:path.join(out,name+'.png'),timeout:90000})
 result.screenshots.push({name,sha256:createHash('sha256').update(image).digest('hex')})
}
async function login(page,email,password,expected){
 await page.goto(origin+'/login',{waitUntil:'domcontentloaded'})
 await page.getByTestId('urai-e2e-login-form').waitFor({state:'visible',timeout:90000})
 await page.getByTestId('urai-e2e-email').fill(email)
 await page.getByTestId('urai-e2e-password').fill(password)
 await page.getByTestId('urai-e2e-submit').click()
 try {
  await page.getByTestId('urai-e2e-auth-uid').getByText(expected,{exact:true}).waitFor({timeout:16000})
 } catch (error) {
  result.authDiagnostics = {
   state: await page.getByTestId('urai-e2e-auth-error').textContent().catch(()=>null),
   status: await page.getByRole('status').first().textContent().catch(()=>null),
   formVisible: await page.getByTestId('urai-e2e-login-form').isVisible().catch(()=>false),
   pathname: new URL(page.url()).pathname
  }
  await screenshot(page,'J2-real-auth-failed').catch(()=>{})
  throw new Error('J2 real Firebase Auth failed: '+JSON.stringify(result.authDiagnostics))
 }
 assert.equal((await page.getByTestId('urai-e2e-auth-uid').innerText()).trim(),expected)
}
await mkdir(out,{recursive:true})
try{
 assert.match(sha,/^[a-f0-9]{40}$/)
 for(const [key,value] of Object.entries({GCLOUD_PROJECT:project,FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',NEXT_PUBLIC_FIREBASE_PROJECT_ID:project,NEXT_PUBLIC_URAI_AUTH_JOURNEY_EMULATOR:'true'}))assert.equal(process.env[key],value,'isolated '+key)
 assert.equal(process.env.NODE_ENV||'development','development')
 app=admin.initializeApp({projectId:project},'journey-wave41')
 const auth=app.auth(),db=app.firestore()
 disposableAuth=auth;disposableDb=db
 const accounts=[{uid:'fictional-urai-a',email:'fictional-a@example.invalid',password:'Test_Only_A_2026!'},{uid:'fictional-urai-b',email:'fictional-b@example.invalid',password:'Test_Only_B_2026!'}]
 for(const user of accounts){await auth.createUser(user);disposableUsers.push(user.uid);const userDoc='users/'+user.uid;disposableDocs.push(userDoc);await db.doc(userDoc).set({ownerId:user.uid,accountStatus:'active',deleted:false})}
 // Isolate client transport failures from backend fixture/seeding failures.
 const probe=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fictional-emulator-key',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({email:accounts[0].email,password:accounts[0].password,returnSecureToken:true})
 })
 assert.equal(probe.status,200,'Auth emulator rejects seeded fictional account A')
 result.authDiagnostics={backendSeededAccountLogin:'emulator-200-no-token-recorded'}
 disposableDocs.push('users/fictional-urai-a/memories/fictional-memory-a')
 await db.doc('users/fictional-urai-a/memories/fictional-memory-a').set({
  ownerId:'fictional-urai-a',title:'Fictional Lake',occurredAt:'1988-08-01T12:00:00.000Z',
  summary:'Fictional emulator data only',emotionalState:'calm',deleted:false,demo:false,consentState:'granted',privacy:'private',
  sourceMedia:[],star:{id:'fictional-star-a',position:[0,0,-4],scale:1},replayManifest:{id:'fictional-manifest-a',version:1,durationMs:10000,segments:['memory','emotion','pattern','return'].map((id,i)=>({id,label:id,caption:'Fictional',narratorLine:'Fictional',startsAtMs:i*2500,durationMs:2500}))}
 })
 const domain=()=>({mode:'limited',retentionDays:365,precise:false,replayVisible:true,lifeMapVisible:true,modelContext:false,sharingEnabled:false,automationEnabled:false,likenessEnabled:false})
 const privacyPolicy={version:2,revision:1,ownerId:'fictional-urai-a',
  domains:{memory:{...domain(),mode:'granted',modelContext:true},location:domain(),
   models:{...domain(),modelContext:true},exports:{...domain(),mode:'denied'},
   workforce:{...domain(),mode:'paused'},identity:domain()},
  enforcement:{state:'fully-enforced',jobId:null,affectedTargets:[],providerState:'not-applicable'}}
 const policyPath='users/fictional-urai-a/privacyPolicy/current'
 disposableDocs.push(policyPath)
 await db.doc(policyPath).set(privacyPolicy)
 disposableDocs.push('users/fictional-urai-a/lifeMapEvents/fictional-star-a')
 await db.doc('users/fictional-urai-a/lifeMapEvents/fictional-star-a').set({userId:'fictional-urai-a',type:'memory',title:'Fictional Lake',memoryId:'fictional-memory-a',sourceType:'manual_seed',occurredAt:'1988-08-01T12:00:00.000Z',replayAvailable:true})
 server=spawn('pnpm',['--dir','urai-tier1','exec','next','dev','--hostname','127.0.0.1','--port','4173'],{env:{...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore'})
 let live=false
 for(let i=0;i<110;i++){if(server.exitCode!==null)throw Error('Next server exited');try{let r=await fetch(origin+'/login',{signal:AbortSignal.timeout(3500)});if(r.ok){live=true;break}}catch{}await wait(1500)}
 assert.ok(live,'Real Next application not ready')
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--disable-dev-shm-usage']})
 const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'})
 await context.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)?route.continue():route.abort()})
 const page=await context.newPage()
 page.on('pageerror',e=>result.errors.push(String(e).slice(0,300)))
 await page.goto(origin+'/login')
 await page.getByTestId('urai-e2e-login-form').waitFor({state:'visible'})
 mark('J1',{origin,project});await screenshot(page,'J1-real-login')
 await login(page,accounts[0].email,accounts[0].password,accounts[0].uid)
 mark('J2',{uid:accounts[0].uid,method:'real-LoginClient-Firebase-SDK'});await screenshot(page,'J2-signed-in')
 await page.getByRole('link',{name:'Open Home'}).click()
 await page.waitForURL(url=>url.pathname.replace(/\/$/,'')==='/home',{timeout:60000})
 const shell=page.getByTestId('urai-persistent-world-shell')
 await shell.waitFor({state:'visible',timeout:90000})
 assert.ok(!new URL(page.url()).searchParams.has('demo'))
 mark('J3',{route:'/home',scope:'authenticated-router-shell-not-orb'});await screenshot(page,'J3-home')
 // Verify signed-out user B cannot read A through real Firebase client.
 await page.goto(origin+'/login')
 await page.getByRole('button',{name:'Sign out'}).click()
 await page.getByTestId('urai-e2e-login-form').waitFor({state:'visible'})
 await login(page,accounts[1].email,accounts[1].password,accounts[1].uid)
 await page.getByTestId('urai-e2e-owner-read').click()
 await page.getByTestId('urai-e2e-owner-read-result').getByText('permission-denied').waitFor({timeout:30000})
 mark('J9-partial',{crossAccountFirestore:'permission-denied',consentRevocation:'not-yet-tested'})
 await screenshot(page,'J9-cross-account-denial')
 throw Error('NOT_YET_VERIFIED: physical Orb, owner Life Map, Focus, Replay, return and revocation in one authenticated session')
}catch(e){result.firstFailure=String(e);process.exitCode=1}
finally{
 // Zero permanent records or identities: clean tracked disposable emulator data
 // before the emulator shuts down; failure to clean is also failure to accept.
 if(browser)await browser.close().catch(()=>{})
 if(server)server.kill('SIGTERM')
 const errors=[]
 if(disposableDb)for(const item of [...disposableDocs].reverse())try{await disposableDb.doc(item).delete()}catch(e){errors.push('record:'+item+':'+String(e).slice(0,80))}
 if(disposableAuth)for(const uid of [...disposableUsers].reverse())try{await disposableAuth.deleteUser(uid)}catch(e){errors.push('identity:'+uid+':'+String(e).slice(0,80))}
 result.cleanup={disposableDocumentCount:disposableDocs.length,disposableIdentityCount:disposableUsers.length,errors}
 if(errors.length){result.errors.push(...errors);process.exitCode=1}
 result.status='FAIL_CLOSED'
 if(app)await app.delete().catch(()=>{})
 await writeFile(path.join(out,'receipt.json'),JSON.stringify(result,null,2))
}
