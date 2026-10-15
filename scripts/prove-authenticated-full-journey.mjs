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
 authTransport:[],
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
 // SSR visibility is not proof React hydrated or registered the form handler.
 // Wait for the real Firebase Auth observer to settle on signed-out.
 await page.waitForFunction(()=>
  document.querySelector('[data-testid="urai-e2e-login-form"]')?.getAttribute('data-emulator-auth-ready')==='true',
  null,{timeout:60000})

 await page.getByTestId('urai-e2e-email').fill(email)
 await page.getByTestId('urai-e2e-password').fill(password)
 assert.equal(await page.getByTestId('urai-e2e-email').inputValue(),email,'React email control lost its value')
 assert.equal(await page.getByTestId('urai-e2e-password').inputValue(),password,'React password control lost its value')
 const formValidity=await page.getByTestId('urai-e2e-login-form').evaluate(form=>({
   valid:form.checkValidity(),
   invalidKinds:[...form.querySelectorAll('input')].filter(input=>!input.validity.valid).map(input=>input.type)
 }))
 assert.ok(formValidity.valid,'Native browser blocked email/password submit: '+JSON.stringify(formValidity))
 await page.getByTestId('urai-e2e-submit').click()
 const delivered=await page.waitForFunction(()=>{
   const diag=document.querySelector('[data-testid="urai-e2e-auth-error"]')?.textContent
   return diag && diag!=='not-attempted'
 },null,{timeout:5000}).catch(()=>null)
 if(!delivered){
  result.authDiagnostics={...(result.authDiagnostics||{}),clientSubmitReached:false,formValidity}
  await screenshot(page,'J2-form-submit-not-delivered').catch(()=>{})
  throw Error('J2 browser submit never entered hydrated React handler')
 }
 try {
  await page.getByTestId('urai-e2e-auth-uid').waitFor({state:'visible',timeout:20000})
  await page.waitForFunction(uid=>
   document.querySelector('[data-testid="urai-e2e-auth-uid"]')?.textContent?.trim()===uid,
   expected,{timeout:20000})
 } catch (error) {
  result.authDiagnostics = {
   ...(result.authDiagnostics||{}),
   state: await page.getByTestId('urai-e2e-auth-error').textContent().catch(()=>null),
   status: await page.getByRole('status').first().textContent().catch(()=>null),
   formVisible: await page.getByTestId('urai-e2e-login-form').isVisible().catch(()=>false),
   pathname: new URL(page.url()).pathname
  }
  await screenshot(page,'J2-real-auth-failed').catch(()=>{})
  throw new Error('J2 real Firebase Auth failed: '+JSON.stringify(result.authDiagnostics))
 }
 assert.equal((await page.getByTestId('urai-e2e-auth-uid').innerText()).trim(),expected)
 assert.ok(result.authTransport.some(item=>item.status===200),
  'Real browser Firebase Auth sign-in had no successful emulator response')
}

/** Real UI/SDK receipts only. A failed milestone never becomes a passing journey. */
const routeIs=route=>url=>url.pathname.replace(/\/+$/,'')===route
async function guardAttribute(page,selector,attribute,want,timeout=90000){
 await page.waitForFunction(({selector,attribute,want})=>document.querySelector(selector)?.getAttribute(attribute)===want,{selector,attribute,want},{timeout})
}
async function executeMilestone(page,name,action){
 try{
  const evidence=await action()
  result.milestones.push({name,passed:true,...evidence})
  await screenshot(page,name+'-passed')
  return true
 }catch(error){
  const reason=String(error).slice(0,950)
  result.milestones.push({name,passed:false,reason})
  result.errors.push(name+': '+reason)
  await screenshot(page,name+'-failed').catch(()=>{})
  return false
 }
}
async function holdActualKey(page,key,duration=450){
 await page.keyboard.down(key)
 try{await page.waitForTimeout(duration)}finally{await page.keyboard.up(key)}
}
async function activateNormalHomeOrb(page){
 const world=page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
 await world.waitFor({state:'visible',timeout:90000})
 await guardAttribute(page,'.urai-asset-home-world[data-home-primary-owner="asset-driven"]','data-home-assets-ready','true')
 assert.equal(await world.getAttribute('data-home-world001-preview'),'off','V3 development preview must not be used as an owner Home')
 const guide=page.locator('aside.uraiV2OnboardingCard[data-home-guide="true"]')
 let firstRunSkipped=false
 if(await guide.count()&&await guide.isVisible()){
  const skip=guide.getByRole('button',{name:'Skip',exact:true})
  const rectangle=await skip.boundingBox()
  assert.ok(rectangle&&rectangle.width>=48&&rectangle.height>=48,'Real first-run Skip fails minimum size')
  const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('button')?.textContent?.trim()||null,
    {x:rectangle.x+rectangle.width/2,y:rectangle.y+rectangle.height/2})
  assert.equal(hit,'Skip','First-run Skip is obstructed')
  await skip.click({timeout:15000})
  await guide.waitFor({state:'hidden',timeout:15000})
  firstRunSkipped=true
 }
 const position=()=>world.evaluate(el=>({
  x:Number(el.dataset.homePlayerX),z:Number(el.dataset.homePlayerZ),
  sourceDistance:Number(el.dataset.homeDistanceOrb),nearby:el.dataset.homeNearby,
  inputReady:el.dataset.homeInputReady,assetMode:el.dataset.homeAssetMode
 }))
 await guardAttribute(page,'.urai-asset-home-world[data-home-primary-owner="asset-driven"]','data-home-input-ready','true')
 const first=await position()
 assert.ok(Number.isFinite(first.x)&&Number.isFinite(first.z),'Home coordinates not present')
 await holdActualKey(page,'KeyW',850)
 const second=await position()
 assert.ok(Math.hypot(second.x-first.x,second.z-first.z)>.05,'No real keyboard locomotion')
 await page.evaluate(()=>{
  window.__uraiPrivateJourneyOrbOpens=0
  window.addEventListener('urai:world-orb-open',()=>{window.__uraiPrivateJourneyOrbOpens++})
 })
 const trace=[]
 let inside=false
 for(let i=0;i<80;i++){
  const state=await position()
  trace.push({x:state.x,z:state.z,distance:state.sourceDistance,nearby:state.nearby})
  const realDistance=Math.hypot(state.x-1.8,state.z+9.5)
  assert.ok(Number.isFinite(realDistance)&&Number.isFinite(state.sourceDistance),'Invalid Home Orb telemetry')
  if(realDistance<2.2&&state.sourceDistance<2.4&&state.nearby==='orb'){inside=true;break}
  const key=state.z>-9.3?'KeyW':state.x<1.8?'KeyD':'KeyA'
  await holdActualKey(page,key,550)
 }
 result.homeApproachTail=trace.slice(-12)
 assert.ok(inside,'Normal (not V3) Orb could not be approached by real input: '+JSON.stringify(trace.slice(-6)))
 await page.keyboard.press('Enter')
 await page.waitForFunction(()=>window.__uraiPrivateJourneyOrbOpens===1,null,{timeout:18000})
 await guardAttribute(page,'.urai-world-companion','data-open','true',18000)
 const arrived=await position()
 return {home:'normal-production-runtime-not-V3',firstRunSkipped,
  from:first,to:arrived,realInput:'keyboard',orbOpenEvents:1,physicalDeviceCertified:false}
}
async function enterOwnerLifeMap(page,orbActivated){
 if(orbActivated){
  const target=page.locator('#urai-world-companion-menu button[data-world-target="life-map"]')
  await target.waitFor({state:'visible',timeout:20000})
  await target.click({timeout:15000})
 }else{
  // Genuine accessible handoff keeps downstream checks executable while
  // recording that physical Orb continuity was NOT proven.
  const link=page.getByTestId('home-semantic-life-map')
  await link.waitFor({state:'visible',timeout:25000})
  await link.focus()
  await page.keyboard.press('Enter')
 }
 await page.waitForURL(routeIs('/life-map'),{timeout:90000})
 await guardAttribute(page,'[data-testid="life-map-semantic-trigger"]','data-life-map-source','private')
 await page.getByTestId('life-map-semantic-trigger').click()
 const owner=page.locator('[data-life-map-node-id="fictional-star-a"]')
 await owner.waitFor({state:'visible',timeout:60000})
 assert.equal(await page.locator('[data-life-map-node-id="fictional-star-b"]').count(),0,'Cross-owner star leaked')
 const orphan=page.locator('[data-life-map-node-id="fictional-orphan"]')
 if(await orphan.count()){
  await orphan.click()
  assert.ok(await page.locator('.life-map-semantic-inspector .semantic-thresholds button').first().isDisabled(),
   'Orphan private event incorrectly unlocked Focus')
 }
 await owner.click()
 await page.locator('.life-map-semantic-inspector h2').getByText('Fictional Lake').waitFor({timeout:30000})
 assert.ok(await page.locator('.life-map-semantic-inspector .semantic-thresholds button').first().isEnabled(),
  'Owner-scoped real memory did not receive Focus authority')
 return {sourceMode:'private',nodeId:'fictional-star-a',memoryId:'fictional-memory-a',
   origin:orbActivated?'genuine-Orb-world-travel':'accessible-fallback-physical-Orb-NOT-PROVEN'}
}
async function verifyOwnerFocusReplayReturn(page){
 await page.locator('.life-map-semantic-inspector .semantic-thresholds button').first().click()
 await page.waitForURL(routeIs('/focus'),{timeout:90000})
 await guardAttribute(page,'[data-testid="urai-final-focus-chamber"]','data-memory-status','ready')
 const focus=page.getByTestId('urai-final-focus-chamber')
 assert.equal(await focus.getAttribute('data-memory-id'),'fictional-memory-a')
 assert.equal(await focus.getAttribute('data-manifest-id'),'fictional-manifest-a')
 await screenshot(page,'J6-real-owner-Focus')
 await focus.locator('.focusControls button.primary').click()
 await page.waitForURL(routeIs('/replay'),{timeout:90000})
 await guardAttribute(page,'[data-testid="cinematic-replay-client"]','data-memory-status','ready')
 const replay=page.getByTestId('cinematic-replay-client')
 assert.equal(await replay.getAttribute('data-memory-id'),'fictional-memory-a')
 assert.equal(await replay.getAttribute('data-manifest-id'),'fictional-manifest-a')
 assert.equal(await replay.getAttribute('data-replay-environment-fallback'),'neutral',
  'No fabricated source video/photo admitted from synthetic fixture')
 await screenshot(page,'J7-real-owner-Replay-neutral')
 await replay.locator('button.unwind').click()
 await page.waitForURL(routeIs('/focus'),{timeout:90000})
 await guardAttribute(page,'[data-testid="urai-final-focus-chamber"]','data-memory-status','ready')
 assert.equal(await page.getByTestId('urai-final-focus-chamber').getAttribute('data-memory-id'),'fictional-memory-a')
 await page.getByTestId('urai-final-focus-chamber').locator('button.unwind').click()
 await page.waitForURL(routeIs('/life-map'),{timeout:90000})
 return {memoryId:'fictional-memory-a',manifestId:'fictional-manifest-a',
  originalFocusToReplay:true,returnToFocusThenLifeMap:true,
  recordedMedia:false,cinematicAcceptance:false}
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

 // Second genuine Auth emulator account has its own canonical memory and
 // constellation star; the first owner's unresolved event has no Focus authority.
 const foreignMemory='users/fictional-urai-b/memories/fictional-memory-b'
 const foreignEvent='users/fictional-urai-b/lifeMapEvents/fictional-star-b'
 const orphanEvent='users/fictional-urai-a/lifeMapEvents/fictional-orphan'
 for(const p of [foreignMemory,foreignEvent,orphanEvent])disposableDocs.push(p)
 const template=(await db.doc('users/fictional-urai-a/memories/fictional-memory-a').get()).data()
 assert.ok(template,'Synthetic source record was not created')
 await db.doc(foreignMemory).set({...template,ownerId:'fictional-urai-b',title:'Foreign Fictional Lake',
   star:{id:'fictional-star-b',position:[0,0,-4],scale:1},
   replayManifest:{...template.replayManifest,id:'fictional-manifest-b'}})
 await db.doc(foreignEvent).set({userId:'fictional-urai-b',type:'memory',title:'Foreign Fictional Lake',
   memoryId:'fictional-memory-b',sourceType:'manual_seed',occurredAt:'1998-08-01T12:00:00.000Z',replayAvailable:true})
 await db.doc(orphanEvent).set({userId:'fictional-urai-a',type:'memory',title:'Unresolved Fictional Event',
   memoryId:'missing-fictional-memory',sourceType:'manual_seed',occurredAt:'1995-08-01T12:00:00.000Z',replayAvailable:true})

 server=spawn('pnpm',['--dir','urai-tier1','exec','next','dev','--hostname','127.0.0.1','--port','4173'],{env:{...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore'})
 let live=false
 for(let i=0;i<110;i++){if(server.exitCode!==null)throw Error('Next server exited');try{let r=await fetch(origin+'/login',{signal:AbortSignal.timeout(3500)});if(r.ok){live=true;break}}catch{}await wait(1500)}
 assert.ok(live,'Real Next application not ready')
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--disable-dev-shm-usage']})
 const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'})
 await context.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)?route.continue():route.abort()})
 const page=await context.newPage()
 page.on('response',response=>{
   try{
     const url=new URL(response.url())
     if(url.hostname==='127.0.0.1' && url.port==='9099' &&
        url.pathname.endsWith('/accounts:signInWithPassword')){
       result.authTransport.push({destination:'127.0.0.1:9099',operation:'accounts:signInWithPassword',
         status:response.status(),source:'browser-Firebase-client'})
     }
   }catch{}
 })
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

 // Each stage executes the original application and records native browser
 // observations, not a source-only assertion. Failure never implies release.
 const orb=await executeMilestone(page,'J4-real-canonical-Home-Orb',()=>activateNormalHomeOrb(page))
 const map=await executeMilestone(page,'J5-owner-Life-Map',()=>enterOwnerLifeMap(page,orb))
 const focusReplay=map&&await executeMilestone(page,'J6-J8-Focus-Replay-return',()=>verifyOwnerFocusReplayReturn(page))
 const revocation=await executeMilestone(page,'J9-live-private-memory-revocation',async()=>{
  await page.goto(origin+'/focus?memoryId=fictional-memory-a&manifestId=fictional-manifest-a')
  await guardAttribute(page,'[data-testid="urai-final-focus-chamber"]','data-memory-status','ready')
  await db.doc('users/fictional-urai-a/memories/fictional-memory-a').update({consentState:'revoked'})
  await guardAttribute(page,'[data-testid="urai-final-focus-chamber"]','data-memory-status','unauthorized')
  assert.equal(await page.getByTestId('urai-final-focus-chamber').getAttribute('data-memory-id'),null)
  await page.goto(origin+'/replay?memoryId=fictional-memory-a&manifestId=fictional-manifest-a')
  await guardAttribute(page,'[data-testid="cinematic-replay-client"]','data-memory-status','unauthorized')
  assert.equal(await page.getByTestId('cinematic-replay-client').getAttribute('data-memory-id'),null)
  return {revokedMemory:'fictional-memory-a',focusDenied:true,replayDenied:true,
   providerAndExternalPropagation:'NOT_TESTED'}
 })
 const accountSwitch=await executeMilestone(page,'J10-real-account-switch-isolation',async()=>{
  await page.goto(origin+'/login')
  await page.getByRole('button',{name:'Sign out'}).click()
  await page.getByTestId('urai-e2e-login-form').waitFor({state:'visible',timeout:30000})
  await login(page,accounts[1].email,accounts[1].password,accounts[1].uid)
  await page.getByTestId('urai-e2e-owner-read').click()
  await page.waitForFunction(()=>
   document.querySelector('[data-testid="urai-e2e-owner-read-result"]')?.textContent?.includes('permission-denied'),
   null,{timeout:30000})
  await page.goto(origin+'/life-map')
  await guardAttribute(page,'[data-testid="life-map-semantic-trigger"]','data-life-map-source','private')
  await page.getByTestId('life-map-semantic-trigger').click()
  await page.locator('[data-life-map-node-id="fictional-star-b"]').waitFor({state:'visible',timeout:60000})
  assert.equal(await page.locator('[data-life-map-node-id="fictional-star-a"]').count(),0,'Previous owner star leaked')
  await page.goto(origin+'/focus?memoryId=fictional-memory-a&manifestId=fictional-manifest-a')
  await guardAttribute(page,'[data-testid="urai-final-focus-chamber"]','data-memory-status','unavailable')
  return {actor:'fictional-urai-b',realBrowserLogin:true,foreignRead:'permission-denied',ownStar:true,priorOwnerMemoryHidden:true}
 })
 const deletion=await executeMilestone(page,'J11-owner-reentry-deletion',async()=>{
  await page.goto(origin+'/login')
  await page.getByRole('button',{name:'Sign out'}).click()
  await page.getByTestId('urai-e2e-login-form').waitFor({state:'visible',timeout:30000})
  await db.doc('users/fictional-urai-a/memories/fictional-memory-a').update({consentState:'granted'})
  await login(page,accounts[0].email,accounts[0].password,accounts[0].uid)
  await page.goto(origin+'/focus?memoryId=fictional-memory-a&manifestId=fictional-manifest-a')
  await guardAttribute(page,'[data-testid="urai-final-focus-chamber"]','data-memory-status','ready')
  await db.doc('users/fictional-urai-a/memories/fictional-memory-a').update({deleted:true})
  await guardAttribute(page,'[data-testid="urai-final-focus-chamber"]','data-memory-status','deleted')
  await db.doc('users/fictional-urai-a/memories/fictional-memory-a').delete()
  await guardAttribute(page,'[data-testid="urai-final-focus-chamber"]','data-memory-status','unavailable')
  return {originalOwnerReauthenticated:true,deletedAndMissingLocked:true}
 })
 result.authenticatedJourney=Boolean(orb&&map&&focusReplay&&revocation&&accountSwitch&&deletion)
 result.physicalNormalOrbVerified=Boolean(orb)
 result.realOwnerLifeMapVerified=Boolean(map)
 result.canonicalFocusReplayReturnVerified=Boolean(focusReplay)
 result.liveSyntheticRevocationVerified=Boolean(revocation)
 result.crossAccountIsolationVerified=Boolean(accountSwitch)
 result.deletionVerified=Boolean(deletion)
 result.recordedMediaCertified=false
 result.deviceCertified=false
 result.finalWorldArt=false
 if(!result.authenticatedJourney)throw Error('NOT_YET_VERIFIED: at least one executed normal private journey stage failed; see milestone receipts')
 result.classification='NON_RELEASE_SYNTHETIC_AUTHENTICATED_APP_JOURNEY'
 result.status='PASS_NONRELEASE_SYNTHETIC_JOURNEY'

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
 if(process.exitCode || errors.length || !result.authenticatedJourney)result.status='FAIL_CLOSED'
 if(app)await app.delete().catch(()=>{})
 await writeFile(path.join(out,'receipt.json'),JSON.stringify(result,null,2))
}
