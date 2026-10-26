#!/usr/bin/env node
/** Non-release, fail-closed Wave 41: original Next LoginClient + Firebase emulator. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { connect as connectTcp } from 'node:net'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import admin from 'firebase-admin'
import { assertHomeAscentArrival } from './home-sky-ascent-proof.mjs'
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
 authenticMedia:false,deviceCertified:false,finalWorldArt:false,
 journey:{home:null,orb:null,ascent:null,privateMemory:null,focus:null,replay:null,return:null,privacy:null}}
let app,server,browser,disposableAuth,disposableDb
const disposableUsers=[]
const disposableDocs=[]
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const mark=(name,data={})=>result.milestones.push({name,...data})

async function assertFourIsolatedEmulators() {
 const endpoints=[['auth',9099],['firestore',8080],['functions',5001],['storage',9199]]
 const hubAddress=process.env.FIREBASE_EMULATOR_HUB
 if(hubAddress && !['127.0.0.1:4400','localhost:4400'].includes(hubAddress))
  throw Error('Refusing nonlocal Firebase Emulator Hub: '+JSON.stringify(hubAddress))
 const hubResponse=await fetch('http://127.0.0.1:4400/emulators',{
  signal:AbortSignal.timeout(5000)
 })
 assert.equal(hubResponse.ok,true,'Expected a live Firebase Emulator Hub on localhost:4400')
 const registry=await hubResponse.json()
 for(const [name,port] of endpoints){
  const declared=registry?.[name]
  assert.ok(declared && typeof declared==='object' && !Array.isArray(declared),
   'Firebase Emulator Hub does not advertise '+name)
  assert.equal(declared.port,port,'Wrong Firebase '+name+' emulator port')
  assert.ok(['127.0.0.1','localhost'].includes(declared.host),
   'Refusing nonlocal Firebase '+name+' emulator host')
  await new Promise((resolve,reject)=>{
   const socket=connectTcp({host:'127.0.0.1',port})
   socket.setTimeout(5000,()=>socket.destroy(Error(name+' emulator TCP timeout')))
   socket.once('error',()=>reject(Error(name+' emulator unavailable on 127.0.0.1:'+port)))
   socket.once('connect',()=>{socket.end();resolve()})
  })
 }
 mark('J0-four-isolated-emulators',{
  project,hub:'127.0.0.1:4400',registryValidated:true,transport:'127.0.0.1',
  services:endpoints.map(([service,port])=>({service,port})),productionFallbackAllowed:false
 })
}

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


async function routeIsPage(page, expected){
 await page.waitForURL(url=>url.pathname.replace(/\/+$/,'')===expected,{timeout:90000})
 assert.equal(new URL(page.url()).searchParams.has('demo'),false,'Demo mode forbidden in authenticated journey')
}
async function readyHome(page){
 const world=page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
 await world.waitFor({state:'visible',timeout:90000})
 try{
  await page.waitForFunction(()=>{
   const e=document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
   return e?.dataset.homeReady==='true'&&e?.dataset.homeInteractionReady==='true'&&
    e?.dataset.homeAssetsReady==='true'&&e?.dataset.homeScenePhase==='HOME'&&
    e?.dataset.homeInputLocked==='false'&&e?.dataset.homeCameraMode==='embodied-first-person'&&
    Number.isFinite(Number.parseFloat(e?.dataset.homePlayerX||''))&&
    Number.isFinite(Number.parseFloat(e?.dataset.homePlayerZ||''))&&
    Number(e.dataset.homeCameraHeight)>1.4
  },null,{timeout:120000,polling:200})
 }catch(error){
  result.journey.home=await world.evaluate(e=>({assets:e.dataset.homeAssetsReady,
   interaction:e.dataset.homeInteractionReady,ready:e.dataset.homeReady,
   input:e.dataset.homeInputReady,frames:e.dataset.homeRenderedFrames,
   phase:e.dataset.homeScenePhase,locked:e.dataset.homeInputLocked,
   camera:e.dataset.homeCameraHeight})).catch(()=>({worldMissing:true}))
  await screenshot(page,'J3-world-not-ready').catch(()=>{})
  throw Error('J3 real Home not interactive: '+JSON.stringify(result.journey.home))
 }
 assert.equal(await world.getAttribute('data-home-world001-preview'),'off','Research World001 preview is forbidden')
 const guide=page.locator('aside.uraiV2OnboardingCard[data-home-guide="true"]')
 let dismissed=false
 if(await guide.isVisible().catch(()=>false)){
  const skip=guide.getByRole('button',{name:'Skip',exact:true})
  await skip.waitFor({state:'visible',timeout:15000})
  const target=await skip.boundingBox()
  assert.ok(target&&target.width>=48&&target.height>=48,'Accessible first-run Skip target too small')
  await skip.click({timeout:15000})
  await guide.waitFor({state:'hidden',timeout:15000})
  dismissed=true
 }
 const height=Number(await world.getAttribute('data-home-camera-height'))
 assert.ok(height<2.5&&height>1.4,'Original first-person camera height invalid')
 result.journey.home={world:'asset-driven',ready:true,preview:'off',height,guideDismissed:dismissed}
 mark('J3',{state:'interactive',...result.journey.home})
 await screenshot(page,'J3-interactive-production-home')
 return world
}
async function proveOrbToMap(page,world){
 const startUrl=page.url()
 const read=async()=>world.evaluate(e=>({x:Number(e.dataset.homePlayerX),z:Number(e.dataset.homePlayerZ),
   distance:Number(e.dataset.homeDistanceOrb),nearby:e.dataset.homeNearby,
   phase:e.dataset.homeScenePhase,cameraHeight:Number(e.dataset.homeCameraHeight)}))
 const start=await read()
 assert.ok(Number.isFinite(start.x)&&Number.isFinite(start.z),'No real Home player telemetry')
 await page.evaluate(()=>{
  window.__uraiWave44OrbEvents=0
  window.addEventListener('urai:world-orb-open',()=>{window.__uraiWave44OrbEvents++})
 })
 // The canonical courtyard has genuine collidable benches and stone bodies.
 // Holding W for 80 seconds follows the obstruction into the southwest bound.
 // Steer by production source coordinates with real WASD keys, following the
 // clear center aisle rather than setting player coordinates or bypassing physics.
 // Read the user's true movement basis from controlled keyboard pulses.
 // Wave45 real browser receipt proved each 270ms strafe overshot by ~1.49m:
 // X alternated between 0.0646 and 1.5528 indefinitely at waypoint 2.
 // We must measure actual yaw-relative directions and scale pulse duration
 // to remaining projected travel, rather than treating WASD as world axes.
 const calibrate=async key=>{
  const before=await read()
  await holdActualKey(page,key,140)
  await page.waitForTimeout(170)
  const after=await read()
  const dx=after.x-before.x,dz=after.z-before.z
  const metres=Math.hypot(dx,dz)
  assert.ok(metres>.12,'J4 real input basis calibration failed: '+key)
  return {key,metres,dx,dz,unit:{x:dx/metres,z:dz/metres}}
 }
 const forward=await calibrate('KeyW')
 const right=await calibrate('KeyD')
 const orthogonality=forward.unit.x*right.unit.x+forward.unit.z*right.unit.z
 assert.ok(Math.abs(orthogonality)<.75,'J4 measured WASD basis is incoherent')
 const speedEstimate=(forward.metres+right.metres)/.28
 assert.ok(Number.isFinite(speedEstimate)&&speedEstimate>.5&&speedEstimate<25,
  'J4 actual calibrated movement speed outside safe bounds')
 const basis={
  KeyW:forward.unit,KeyS:{x:-forward.unit.x,z:-forward.unit.z},
  KeyD:right.unit,KeyA:{x:-right.unit.x,z:-right.unit.z}
 }
 const measuredYawRadians=Math.atan2(-forward.unit.x,-forward.unit.z)
 // Center aisle belongs to the original authored sanctuary; waypoint targets
 // are navigation goals, never player-state mutation or collision overrides.
 const waypoints=[
  {x:.7,z:5},{x:.7,z:0},{x:.7,z:-4.2},
  {x:.8,z:-7.7},{x:1.25,z:-9.1}
 ]
 const trace=[]
 let waypoint=0,inside=false,failure=null,stalled=0
 for(let step=0;step<140;step++){
  const before=await read()
  const realDistance=Math.hypot(before.x-1.8,before.z+9.5)
  if(!Number.isFinite(realDistance)||!Number.isFinite(before.distance)){
   failure='Nonfinite production player or Orb coordinates';break
  }
  if(realDistance<2.2&&before.distance<2.2&&before.nearby==='orb'){
   inside=true;break
  }
  if(before.phase!=='HOME'){failure='Unexpected real scene phase '+before.phase;break}
  while(waypoint<waypoints.length){
   const goal=waypoints[waypoint]
   if(Math.abs(before.x-goal.x)>.92||Math.abs(before.z-goal.z)>.92)break
   waypoint++
  }
  const goal=waypoints[Math.min(waypoint,waypoints.length-1)]
  const dx=goal.x-before.x,dz=goal.z-before.z
  const choices=Object.entries(basis).map(([key,v])=>({
   key,projection:dx*v.x+dz*v.z
  })).sort((a,b)=>b.projection-a.projection)
  const chosen=choices[stalled>2?1:0]
  if(!chosen||chosen.projection<=0){
   failure='No positive measured keyboard direction toward waypoint '+waypoint;break
  }
  const durationMs=Math.max(65,Math.min(205,Math.round(chosen.projection/speedEstimate*650)))
  await holdActualKey(page,chosen.key,durationMs)
  await page.waitForTimeout(125)
  const after=await read()
  const moved=Math.hypot(after.x-before.x,after.z-before.z)
  trace.push({
   waypoint,key:chosen.key,durationMs,
   projectedMetres:Number(chosen.projection.toFixed(3)),
   beforeX:before.x,beforeZ:before.z,x:after.x,z:after.z,
   moved:Number(moved.toFixed(3)),distanceOrb:after.distance,nearby:after.nearby
  })
  stalled=moved<.05?stalled+1:0
  if(stalled>=6){
   failure='Real input/collision stall on measured heading at waypoint '+waypoint;break
  }
  if(after.z<=-17.8||after.x<=-13.8||after.x>=13.8){
   failure='Physical player reached original world bounds';break
  }
 }
 const arrival=await read()
 const distance=Math.hypot(arrival.x-1.8,arrival.z+9.5)
 if(!inside&&!failure)failure='Measured-basis movement budget exhausted before Orb'
 result.journey.orb={
  starting:start,arrival,waypointsCompleted:waypoint,
  movementPulses:trace.length,approachTrace:trace.slice(-40),
  measuredDistance:distance,radiusMetres:2.4,
  calibration:{forward,right,measuredYawRadians,orthogonality,speedEstimate},
  input:'genuine-WASD-calibrated-on-original-player',failure
 }
 if(failure||distance>=2.4||arrival.nearby!=='orb'){
  await screenshot(page,'J4-orb-approach-failure').catch(()=>{})
  throw Error('J4 actual calibrated physical approach failed: '+JSON.stringify({
   arrival,waypoint,pulses:trace.length,calibration:result.journey.orb.calibration,
   last:trace.slice(-10),failure
  }).slice(0,2500))
 }

 await page.waitForFunction(()=>{
  const e=document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
  return e?.dataset.homeNearby==='orb'&&Number(e.dataset.homeDistanceOrb)<2.4
 },null,{timeout:10000})
 assert.ok(arrival.distance<2.4&&result.journey.orb.measuredDistance<2.4)
 await screenshot(page,'J4-physical-orb-proximity')
 await page.keyboard.press('Enter')
 await page.waitForFunction(()=>window.__uraiWave44OrbEvents===1,null,{timeout:20000})
 const companion=page.locator('aside.urai-world-companion[data-open="true"]')
 await companion.waitFor({state:'visible',timeout:20000})
 result.journey.orb.openEvents=1
 await screenshot(page,'J4-real-orb-menu')
 const beforeHeight=arrival.cameraHeight
 await world.evaluate(e=>{
  window.__uraiWave44Ascent=[]
  const take=()=>{
   window.__uraiWave44Ascent.push({phase:e.dataset.homeScenePhase,
    sequence:e.dataset.homePortalSequence,height:Number(e.dataset.homeCameraHeight),
    progress:Number(e.dataset.homeAscentProgress),locked:e.dataset.homeInputLocked,
    camera:e.dataset.homeCameraMode})
  }
  window.__uraiWave44AscentObserver=new MutationObserver(take)
  window.__uraiWave44AscentObserver.observe(e,{attributes:true,
   attributeFilter:['data-home-scene-phase','data-home-portal-sequence','data-home-camera-height','data-home-ascent-progress','data-home-input-locked','data-home-camera-mode']})
  take()
 })
 const choose=companion.locator('nav[aria-label="Travel through the URAI world"] button[data-world-target="life-map"]')
 await choose.waitFor({state:'visible',timeout:15000})
 assert.ok(await choose.isEnabled(),'Original Orb Life Map choice disabled')
 await choose.click({timeout:15000})
 await page.waitForFunction(h=>window.__uraiWave44Ascent?.some(s=>s.phase==='ASCENT'&&
  s.camera==='ascent'&&s.locked==='true'&&s.height>h+0.1&&s.progress>0),
  beforeHeight,{timeout:45000,polling:80})
 const observed=await page.evaluate(()=>window.__uraiWave44Ascent||[])
 assert.ok(observed.some(s=>s.phase==='ASCENT'&&s.height>beforeHeight+0.1))
 result.journey.ascent={realCameraLift:true,samples:observed.length,
  highestCameraMetres:Math.max(...observed.map(s=>s.height).filter(Number.isFinite))}
 await screenshot(page,'J4-camera-ascent').catch(()=>{})
 await routeIsPage(page,'/life-map')
 assertHomeAscentArrival(startUrl,page.url())
 mark('J4',{orb:result.journey.orb,ascent:result.journey.ascent,lifeMap:'/life-map'})
 await screenshot(page,'J4-arrived-original-life-map')
}
async function proveMapFocusReplayReturn(page,uid){
 const map=page.getByTestId('urai-true-3d-life-map')
 await map.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>document.querySelector('[data-testid="urai-true-3d-life-map"]')?.dataset.lifeMapSource==='private',
  null,{timeout:90000})
 await page.getByTestId('life-map-semantic-trigger').click({timeout:15000})
 const star=page.locator('#life-map-navigator button[data-life-map-node-id="fictional-star-a"]')
 await star.waitFor({state:'visible',timeout:60000})
 await star.click({timeout:15000})
 await page.waitForFunction(()=>{
  const p=new URLSearchParams(location.search)
  return p.get('node')==='fictional-star-a'&&p.get('memoryId')==='fictional-memory-a'&&
   p.get('manifestId')==='fictional-manifest-a'
 },null,{timeout:60000})
 await page.waitForFunction(()=>document.querySelector('[data-testid="urai-true-3d-life-map"]')?.dataset.lifeMapPhase==='arrival',
  null,{timeout:60000})
 result.journey.privateMemory={uid,event:'fictional-star-a',memory:'fictional-memory-a',
  manifest:'fictional-manifest-a',source:'private',notDemo:true}
 mark('J5',result.journey.privateMemory)
 await screenshot(page,'J5-private-memory-star')
 // The selected star's actual in-world threshold owns Focus navigation. The
 // semantic inspector is optional and closes after search selection, so its
 // hidden button is not evidence that Focus is unavailable.
 const focusButton=page.locator('.life-map-thresholds button.focus-threshold')
 await focusButton.waitFor({state:'visible',timeout:20000})
 assert.ok(await focusButton.isEnabled(),'Private Focus threshold unavailable')
 const href=await focusButton.getAttribute('data-destination-href')
 assert.ok(href,'Original Life Map Focus action has no destination contract')
 const focusTarget=new URL(href,page.url())
 assert.equal(focusTarget.origin,new URL(page.url()).origin)
 assert.equal(focusTarget.pathname,'/focus')
 assert.equal(focusTarget.searchParams.get('node'),'fictional-star-a')
 assert.equal(focusTarget.searchParams.get('memoryId'),'fictional-memory-a')
 assert.equal(focusTarget.searchParams.get('manifestId'),'fictional-manifest-a')
 assert.equal(focusTarget.searchParams.get('from'),'life-map')
 assert.equal(focusTarget.searchParams.get('demo'),null,'Private Focus must not gain demo authority')
 await focusButton.click({timeout:15000})
 await routeIsPage(page,'/focus')
 const focus=page.getByTestId('urai-final-focus-chamber')
 await focus.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.memoryStatus==='ready',null,{timeout:90000})
 assert.equal(await focus.getAttribute('data-memory-id'),'fictional-memory-a')
 assert.equal(await focus.getAttribute('data-manifest-id'),'fictional-manifest-a')
 assert.equal(await focus.getAttribute('data-star-id'),'fictional-star-a')
 result.journey.focus={memory:'fictional-memory-a',manifest:'fictional-manifest-a',status:'ready'}
 mark('J6',result.journey.focus)
 await screenshot(page,'J6-original-stellar-focus')
 await focus.locator('nav.focusControls button.primary').click({timeout:15000})
 await routeIsPage(page,'/replay')
 const replay=page.getByTestId('cinematic-replay-client')
 await replay.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.memoryStatus==='ready',
   null,{timeout:90000})
 assert.equal(await replay.getAttribute('data-memory-id'),'fictional-memory-a')
 assert.equal(await replay.getAttribute('data-manifest-id'),'fictional-manifest-a')
 const media=await replay.getAttribute('data-replay-media-status')
 assert.equal(media,'absent','Fictional no-media fixture must not masquerade as recorded source')
 result.journey.replay={memory:'fictional-memory-a',manifest:'fictional-manifest-a',
  media:'absent',classification:'neutral-authorized-archive-not-authentic-media'}
 mark('J7',result.journey.replay)
 await screenshot(page,'J7-real-replay-neutral-fallback')
 await replay.locator('button.unwind').click({timeout:15000})
 await routeIsPage(page,'/focus')
 await focus.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.memoryStatus==='ready',
   null,{timeout:60000})
 await focus.locator('nav.focusControls button.unwind').click({timeout:15000})
 await routeIsPage(page,'/life-map')
 await map.waitFor({state:'visible',timeout:90000})
 const resumedMode=await map.getAttribute('data-life-map-phase')
 if (resumedMode !== 'overview') {
  await map.getByRole('button',{name:'Return to Life Map overview'}).click({timeout:15000})
 }
 await page.waitForFunction(()=>document.querySelector('[data-testid="urai-true-3d-life-map"]')?.dataset.lifeMapPhase==='overview',
   null,{timeout:30000})
 await map.locator('button[data-life-map-overview-home-return="true"]').click({timeout:15000})
 await routeIsPage(page,'/home')
 await readyHome(page)
 result.journey.return={path:'Replay->Focus->Life Map->Home',throughOriginalControls:true}
 mark('J8',result.journey.return)
 await screenshot(page,'J8-real-control-return-home')
}
/** One actual Next Council UI request held by a fictional HTTP interceptor.
 * This verifies client publication races across live Firebase auth/consent.
 * It is NOT a paid provider call or backend provider-delivery acceptance.
 */
async function holdActualCouncilResponse(context, scenario) {
 const page=await context.newPage()
 const syntheticAnswer='FICTIONAL_LATE_COUNCIL_RESPONSE_MUST_NOT_RENDER_'+scenario
 let releaseRequest
 const held=new Promise(resolve=>{releaseRequest=resolve})
 let intercepted=0, released=false
 let interceptedReady
 const arrived=new Promise(resolve=>{interceptedReady=resolve})
 try {
  await page.route('**/api/urai/council/anthropic',async route=>{
   intercepted++
   interceptedReady()
   try {
    await held
    await route.fulfill({status:200,contentType:'application/json',
     headers:{'Cache-Control':'private, no-store, max-age=0'},
     body:JSON.stringify({provider:'anthropic',model:'fictional-browser-intercept',
      message:syntheticAnswer,caption:syntheticAnswer,
      disclosure:'Isolated fictional HTTP fixture; no model processed this request.',
      suggestedActions:[]})})
    released=true
   } catch { /* Browser abort is a permitted suppression path. */ }
  })
  await page.goto(origin+'/council?memoryId=fictional-memory-a',{waitUntil:'domcontentloaded'})
  const panel=page.locator('[data-testid="urai-council-route"] .councilConversation')
  await panel.waitFor({state:'visible',timeout:90000})
  await panel.getByText(/Selected Memory Star: Fictional Lake/).waitFor({timeout:90000})
  const options=await panel.locator('#urai-council-provider option').allTextContents()
  assert.ok(options.some(value=>/Anthropic/.test(value)),
   'The isolated client-only Anthropic request flag must be enabled for real Council UI proof')
  await panel.locator('#urai-council-provider').selectOption('anthropic')
  await panel.locator('#urai-council-message').fill('Which fictional lake was visited?')
  const checks=panel.locator('input[type="checkbox"]')
  assert.ok(await checks.count()>=4)
  await checks.nth(0).check()
  assert.equal(await panel.getByRole('button',{name:'Ask Council'}).isDisabled(),true)
  await checks.nth(3).check()
  assert.equal(await panel.getByRole('button',{name:'Ask Council'}).isEnabled(),true)
  const outbound=page.waitForRequest(request=>new URL(request.url()).pathname==='/api/urai/council/anthropic',{timeout:60000})
  await panel.getByRole('button',{name:'Ask Council'}).click()
  const request=await outbound
  await arrived
  const payload=request.postDataJSON()
  assert.equal(request.method(),'POST')
  assert.match(request.headers().authorization||'',/^Bearer /,
   'Real Firebase Auth must be attached to the synthetic request')
  assert.equal(payload.memorySelection,'fictional-memory-a')
  assert.equal(payload.graphShareConsent,true)
  assert.equal(payload.aiProcessingConsent,true)
  assert.deepEqual(payload.context,[],
   'Selected memory cannot leak unrelated preceding chat history')
  assert.equal(intercepted,1,'Exactly one held outbound request expected')
  return {
   page, panel, scenario,
   release:()=>releaseRequest(),
   async assertSuppressed(expectedNotice){
    if(expectedNotice)await panel.getByText(expectedNotice).waitFor({timeout:45000})
    releaseRequest()
    await page.waitForTimeout(400)
    assert.equal(intercepted,1)
    assert.equal(await panel.locator('.councilResponse').count(),0,
     'A formerly authorized response cannot reappear after the actor or policy changed')
    const visible=await page.locator('body').innerText()
    assert.ok(!visible.includes(syntheticAnswer),'Held private response leaked to original React app')
    assert.ok(!visible.includes('Selected Memory Star: Fictional Lake'),
     'Prior source title remained visible after authorization change')
    assert.equal(await panel.locator('input[type="checkbox"]').nth(0).isChecked(),false,
     'Processing consent must be reset')
    const graphChecks=panel.locator('input[type="checkbox"]')
    assert.equal(await graphChecks.nth(3).isChecked(),false,'Private disclosure consent must be reset')
    return {scenario,realNextCouncilUI:true,currentAuthFirestoreSubscribers:true,
     syntheticInterceptedCalls:intercepted,paidProviderCalls:0,replyRendered:false,
     networkReplyFulfilled:released,consentReset:true}
   },
   async close(){releaseRequest();await page.close()}
  }
 } catch(error){releaseRequest();await page.close().catch(()=>{});throw error}
}

async function provePrivacyAfterJourney(page,accounts,db,policy){
 const actorSwitchCouncil=await holdActualCouncilResponse(page.context(),'cross-account')
 await page.goto(origin+'/login')
 await page.getByRole('button',{name:'Sign out'}).click()
 await page.getByTestId('urai-e2e-login-form').waitFor({state:'visible',timeout:30000})
 await login(page,accounts[1].email,accounts[1].password,accounts[1].uid)
 await page.getByTestId('urai-e2e-owner-read').click({timeout:15000})
 await page.getByTestId('urai-e2e-owner-read-result').getByText('permission-denied').waitFor({timeout:30000})
 const switchProof=await actorSwitchCouncil.assertSuppressed(/Selected Memory Star: Private memory consent authority is unavailable/)
 mark('J9-council-real-app-actor-switch',switchProof)
 await screenshot(actorSwitchCouncil.page,'J9-council-real-app-actor-switch')
 await actorSwitchCouncil.close()
 await page.goto(origin+'/life-map')
 const map=page.getByTestId('urai-true-3d-life-map')
 await map.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>{
  const mode=document.querySelector('[data-testid="urai-true-3d-life-map"]')?.dataset.lifeMapSource
  return mode==='private'||mode==='empty'
 },null,{timeout:90000})
 await page.getByTestId('life-map-semantic-trigger').click({timeout:15000})
 assert.equal(await page.locator('#life-map-navigator button[data-life-map-node-id="fictional-star-a"]').count(),0,
  'Account B must not observe account A constellation')
 await page.goto(origin+'/replay?memoryId=fictional-memory-a&manifestId=fictional-manifest-a')
 const replay=page.getByTestId('cinematic-replay-client')
 await replay.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>{
  const status=document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.memoryStatus
  return ['unavailable','unauthorized','deleted'].includes(status)
 },null,{timeout:90000})
 result.journey.privacy={actorB:accounts[1].uid,ownerRead:'permission-denied',
   accountAConstellationVisible:false,foreignReplayDenied:true}
 await screenshot(page,'J9-foreign-account-denied')
 await page.goto(origin+'/login')
 await page.getByRole('button',{name:'Sign out'}).click()
 await page.getByTestId('urai-e2e-login-form').waitFor({state:'visible',timeout:30000})
 await login(page,accounts[0].email,accounts[0].password,accounts[0].uid)
 const consentCouncil=await holdActualCouncilResponse(page.context(),'canonical-memory-consent-withdrawal')
 // Two REAL, authenticated browser tabs retain visible source in the
 // mounted Focus and Replay components during the original consent callable.
 // A fresh route after withdrawal alone would not establish live revocation.
 const ownerMemoryBefore=(await db.doc('users/'+accounts[0].uid+
  '/memories/fictional-memory-a').get()).data()
 assert.equal(ownerMemoryBefore?.consentState,'authorized',
  'Mounted withdrawal proof requires originally authorized unchanged source')
 const mountedFocus=await page.context().newPage()
 const mountedReplay=await page.context().newPage()
 const liveViews=[
  {name:'Focus',page:mountedFocus,route:'/focus?memoryId=fictional-memory-a&manifestId=fictional-manifest-a',
   selector:'[data-testid="urai-final-focus-chamber"]'},
  {name:'Replay',page:mountedReplay,route:'/replay?memoryId=fictional-memory-a&manifestId=fictional-manifest-a',
   selector:'[data-testid="cinematic-replay-client"]'}
 ]
 for(const view of liveViews){
  await view.page.goto(origin+view.route,{waitUntil:'domcontentloaded'})
  await view.page.waitForFunction(selector=>
   document.querySelector(selector)?.getAttribute('data-memory-status')==='ready',
   view.selector,{timeout:90000})
  assert.equal(await view.page.getByRole('heading',{name:'Fictional Lake',exact:true}).count(),1,
   'Mounted '+view.name+' did not actually render originally authorized title')
  await screenshot(view.page,'J9-mounted-'+view.name.toLowerCase()+'-before-withdrawal')
 }
 // Drive the existing production Consent Sanctuary and its real callable.
 // Admin patching this test record would not exercise consent authority and
 // must never be represented as equivalent to applyConsentPolicy.
 await page.goto(origin+'/privacy-controls',{waitUntil:'domcontentloaded'})
 const consent=page.locator('main[data-route-owner="consent-sanctuary"]')
 await consent.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>{
  const panel=document.querySelector('main[data-route-owner="consent-sanctuary"]')
  return panel?.dataset.privacySource==='private' &&
   panel?.dataset.enforcementState==='fully-enforced' &&
   panel.querySelector('.consentPanelHeading p')?.textContent?.includes('Revision 1')
 },null,{timeout:90000})
 await screenshot(page,'J9-canonical-consent-before')
 const memoryControls=consent.locator('#consent-controls')
 await memoryControls.getByRole('button',{name:'denied',exact:true}).click({timeout:15000})
 const confirm=page.getByRole('dialog',{name:'Confirm Memory'})
 await confirm.waitFor({state:'visible',timeout:15000})
 // The actual hydrated React button is type=button and confirmChange()
 // invokes a Firebase callable without scheduling navigation. In the previous
 // source-bound receipt Playwright DISPATCHED the pointer click successfully
 // but its locator.click() auto-wait hung on an unrelated scheduled navigation.
 // Exercise a genuine unobstructed mouse click, then separately prove the
 // real network callable, unchanged route and canonical server consequences.
 // Do not dispatch synthetic DOM events or weaken consent authority checks.
 const confirmationButton=confirm.getByRole('button',{name:'Confirm and request enforcement'})
 await confirmationButton.scrollIntoViewIfNeeded()
 assert.equal(await confirmationButton.getAttribute('type'),'button','Consent confirmation must not navigate or submit a form')
 assert.equal(await confirmationButton.isEnabled(),true,'Consent confirmation button is not actionable')
 const confirmationBox=await confirmationButton.boundingBox()
 assert.ok(confirmationBox&&confirmationBox.width>0&&confirmationBox.height>0,'Consent confirmation button is not on screen')
 const unobscured=await confirmationButton.evaluate(node=>{
  const bounds=node.getBoundingClientRect()
  const hit=document.elementFromPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2)
  return hit===node||node.contains(hit)
 })
 assert.equal(unobscured,true,'Another element obscures the consent confirmation button')
 const callableResponse=page.waitForResponse(response=>{
  try{
   const uri=new URL(response.url())
   return response.request().method()==='POST' && uri.hostname==='127.0.0.1'
    && uri.port==='5001' && uri.pathname.endsWith('/applyConsentPolicy')
  }catch{return false}
 },{timeout:60000})
 await page.mouse.click(confirmationBox.x+confirmationBox.width/2,confirmationBox.y+confirmationBox.height/2)
 const consentTransport=await callableResponse
 const consentEnvelope=await consentTransport.json().catch(()=>null)
 assert.equal(consentTransport.status(),200,'Consent confirmation did not reach original authenticated Firebase callable')
 assert.ok(consentEnvelope && typeof consentEnvelope.result==='object' && !consentEnvelope.error,
  'Consent callable did not return a successful result envelope')
 assert.equal(new URL(page.url()).pathname,'/privacy-controls',
  'Consent confirmation unexpectedly navigated away from the original Consent Sanctuary')
 mark('J9-canonical-consent-pointer-confirmation',{
  action:'real-unobscured-mouse-pointer',navigationExpected:false,
  routeRetained:true,firestoreAuthorityRequired:true,
  source:'original-hydrated-ConsentSanctuaryClient',callableTransportStatus:consentTransport.status()
 })
 // A request/pending state is not enforcement. Require the real trigger and
 // server-controlled revision/receipt to complete on this isolated project.
 await page.waitForFunction(()=>{
  const panel=document.querySelector('main[data-route-owner="consent-sanctuary"]')
  return panel?.dataset.privacySource==='private' &&
   panel.querySelector('.consentPanelHeading p')?.textContent?.includes('Revision 2')
 },null,{timeout:90000})
 await page.waitForFunction(()=>document.querySelector('main[data-route-owner="consent-sanctuary"]')?.dataset.enforcementState==='fully-enforced',
  null,{timeout:90000})
 const live=(await db.doc('users/fictional-urai-a/privacyPolicy/current').get()).data()
 assert.equal(live?.revision,2,'Canonical callable did not increment consent revision')
 assert.equal(live?.domains?.memory?.mode,'denied','Callable did not deny memory access')
 assert.equal(live?.domains?.memory?.replayVisible,true,
  'The user selected only the memory permission mode; do not fake unrelated toggle changes')
 assert.equal(live?.enforcement?.state,'fully-enforced','Canonical Functions job did not complete')
 const consentEnforcementJobId=live?.enforcement?.jobId
 assert.match(consentEnforcementJobId,/^[a-f0-9]{40}$/,'Canonical enforcement job missing')
 const consentEnforcementJob=(await db.doc('privacyEnforcementJobs/'+consentEnforcementJobId).get()).data()
 assert.equal(consentEnforcementJob?.state,'fully-enforced','Canonical enforcement job did not reach completion')
 const receipts=await db.collection('users/fictional-urai-a/privacyReceipts')
  .where('jobId','==',consentEnforcementJobId).limit(2).get()
 assert.equal(receipts.size,1,'Canonical consent receipt missing or duplicated')
 assert.equal(receipts.docs[0].get('result'),'fully-enforced','Consent receipt not completed')
 const projection=(await db.doc('users/fictional-urai-a/privacyRuntime/replay-visibility').get()).data()
 assert.equal(projection?.revision,2,'Replay consent projection is stale')
 assert.equal(projection?.mode,'denied','Replay consent projection is not denied')
 result.journey.privacy.revocation={
  revision:2,mode:'denied',jobId:consentEnforcementJobId,receipts:1,
  canonicalUserConsentCallableVerified:true,repositoryEnforcementVerified:true,
  councilAsyncContextInvalidationVerified:false,privateMediaTokensVerified:false,
  userInterface:'actual-consent-sanctuary'
 }
 mark('J9-canonical-callable',result.journey.privacy.revocation)
 await screenshot(page,'J9-canonical-consent-enforced')
 // This assertion observes the ALREADY mounted consumers, not re-created
 // components, across the original user-initiated consent revision.
 const mountedStates={}
 for(const view of liveViews){
  await view.page.waitForFunction(selector=>{
   const status=document.querySelector(selector)?.getAttribute('data-memory-status')
   return ['unavailable','unauthorized','deleted'].includes(status)
  },view.selector,{timeout:90000})
  mountedStates[view.name.toLowerCase()]=await view.page.locator(view.selector).getAttribute('data-memory-status')
  assert.equal(await view.page.getByRole('heading',{name:'Fictional Lake',exact:true}).count(),0,
   'Mounted '+view.name+' still displays revoked private title')
  await screenshot(view.page,'J9-mounted-'+view.name.toLowerCase()+'-withdrawn')
 }
 assert.deepEqual((await db.doc('users/'+accounts[0].uid+
  '/memories/fictional-memory-a').get()).data(),ownerMemoryBefore,
  'Revocation must not be simulated by changing the memory document')
 await wait(900)
 for(const view of liveViews){
  assert.ok(['unavailable','unauthorized','deleted'].includes(
   await view.page.locator(view.selector).getAttribute('data-memory-status')),
   'Late callback restored mounted '+view.name+' private memory')
  await view.page.reload({waitUntil:'domcontentloaded'})
  await view.page.waitForFunction(selector=>{
   const status=document.querySelector(selector)?.getAttribute('data-memory-status')
   return ['unavailable','unauthorized','deleted'].includes(status)
  },view.selector,{timeout:90000})
  assert.equal(await view.page.getByRole('heading',{name:'Fictional Lake',exact:true}).count(),0,
   'Browser reload restored withdrawn '+view.name+' content')
  await view.page.close()
 }
 result.journey.privacy.revocation.mounted={
  focus:mountedStates.focus,replay:mountedStates.replay,
  canonicalCallable:true,sourceUnchanged:true,privateTitlesRemoved:true,
  staleCallbackDenied:true,reloadDenied:true
 }
 mark('J9-mounted-Focus-Replay-withdrawal',result.journey.privacy.revocation.mounted)
 const withdrawCouncilProof=await consentCouncil.assertSuppressed(/Selected Memory Star: Memory access is not currently permitted/)
 await screenshot(consentCouncil.page,'J9-council-real-app-canonical-withdrawal')
 await consentCouncil.close()
 result.journey.privacy.revocation.councilAsyncContextInvalidationVerified=true
 result.journey.privacy.revocation.councilRealApp={actorSwitch:switchProof,canonicalWithdrawal:withdrawCouncilProof}
 mark('J9-council-real-app-canonical-withdrawal',withdrawCouncilProof)

 // Preserve one honest test of the existing Replay consumer after global
 // denial. Never mutate the memory's own consentState with Admin to make it pass.
 await page.goto(origin+'/replay?memoryId=fictional-memory-a&manifestId=fictional-manifest-a')
 await replay.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>{
  const status=document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.memoryStatus
  return status && status!=='loading'
 },null,{timeout:60000})
 const state=await replay.getAttribute('data-memory-status')
 result.journey.privacy.revocation.postWithdrawalReplayStatus=state
 await screenshot(page,'J9-canonical-replay-after-withdrawal')
 if(state==='ready')throw Error('J9_CANONICAL_MEMORY_DENIED_BUT_REPLAY_CONSUMER_REMAINED_READY')
 assert.ok(['unavailable','unauthorized','deleted'].includes(state),
  'J9 selected-memory access produced an unexpected state after revoked memory policy: '+state)
 mark('J9-partial',{...result.journey.privacy,staleReplayDenied:true})
 // Synthetic input exists to test the original product deletion. Preserve
 // unrelated ritual context while removing all owner-linked Memory Star nodes.
 const ritualPath='users/'+accounts[0].uid+'/lifeMapEvents/fictional-independent-ritual'
 const ritual={userId:accounts[0].uid,type:'ritual',title:'Fictional Independent Ritual',sourceType:'ritual',
  occurredAt:'1989-08-01T12:00:00.000Z',replayAvailable:false}
 disposableDocs.push(ritualPath)
 await db.doc(ritualPath).set(ritual)
 // This journey can exceed the server's five-minute reauthentication window.
 // Reauthenticate using the original LoginClient before destructive operations.
 const signInsBefore=result.authTransport.filter(item=>item.status===200).length
 await page.goto(origin+'/login',{waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Sign out'}).click({timeout:15000})
 await page.getByTestId('urai-e2e-login-form').waitFor({state:'visible',timeout:30000})
 await login(page,accounts[0].email,accounts[0].password,accounts[0].uid)
 assert.equal(result.authTransport.filter(item=>item.status===200).length,signInsBefore+1,
  'J9G owner reauthentication must create a fresh successful browser Auth response')
 mark('J9G-real-reauth',{source:'original-LoginClient-Firebase-SDK',signedOut:true,privilegeOverride:false})
 // Prove the original authenticated product deletion, not fixture teardown.
 // This deliberately does not remove the independent Council/media NO-GO gate.
 await page.goto(origin+'/privacy-controls',{waitUntil:'domcontentloaded'})
 await page.waitForFunction(()=>{
  const panel=document.querySelector('main[data-route-owner="consent-sanctuary"]')
  return panel?.dataset.privacySource==='private' &&
   panel?.dataset.enforcementState==='fully-enforced' &&
   panel.querySelector('.consentPanelHeading p')?.textContent?.includes('Revision 2')
 },null,{timeout:90000})
 await page.getByLabel('Deletion scope').selectOption('memories')
 await page.getByLabel('Type CONFIRM DELETE').fill('CONFIRM DELETE')
 const emittedRequest=page.waitForRequest(request=>
  request.method()==='POST' && request.url().includes('/createSpatialDeletionRequest'),{timeout:30000})
 const emittedResponse=page.waitForResponse(response=>
  response.request().method()==='POST' && response.url().includes('/createSpatialDeletionRequest'),{timeout:45000})
 await page.getByRole('button',{name:'Create deletion request'}).click({timeout:15000})
 const request=await emittedRequest
 // Never write Auth headers, bearer tokens or the raw operation ID to proof.
 const operationId=JSON.parse(request.postData()||'{}').data?.operationId
 assert.match(operationId,/^[A-Za-z0-9_-]{12,96}$/,'J9G must capture the actual original callable operation identity')
 const deletionJobId=createHash('sha256').update('deletion:'+accounts[0].uid+':'+operationId).digest('hex').slice(0,40)
 const deletionReceiptId=createHash('sha256').update('deletion-receipt:'+accounts[0].uid+':'+operationId).digest('hex').slice(0,40)
 const initialResponse=await emittedResponse
 const initialEnvelope=await initialResponse.json().catch(()=>null)
 const code=typeof initialEnvelope?.error?.status==='string' ? initialEnvelope.error.status.replace(/[^A-Z_]/g,'').slice(0,48) : null
 assert.equal(initialResponse.status(),200,'J9G current-owner deletion callable rejected: '+JSON.stringify({httpStatus:initialResponse.status(),code,
  recentAuthRequired:String(initialEnvelope?.error?.message||'')==='RECENT_REAUTHENTICATION_REQUIRED'}))
 const initialResult=initialEnvelope?.result ?? initialEnvelope?.data
 assert.equal(initialResult?.jobId,deletionJobId,'J9G actual server-issued job differs from bounded operation identity')
 assert.equal(initialResult?.receiptId,deletionReceiptId,'J9G initial server-issued receipt identity differs')
 assert.equal(initialResult?.state,'queued','J9G unexpected initial scoped deletion state')
 disposableDocs.push('deletionQueue/'+deletionJobId,'deletionReceipts/'+deletionReceiptId,
  'users/'+accounts[0].uid+'/deletionJobs/'+deletionJobId)
 await page.waitForFunction(()=>document.querySelector('.consentStatus')?.textContent?.includes('Deletion '),
  null,{timeout:45000})
 let deletionJob
 for(let i=0;i<100;i++){
  const current=await db.doc('users/'+accounts[0].uid+'/deletionJobs/'+deletionJobId).get()
  deletionJob=current.data()
  if(deletionJob && ['completed','failed','cancelled'].includes(String(deletionJob.state)))break
  await wait(800)
 }
 assert.equal(deletionJob?.state,'completed','J9G canonical memory deletion did not complete: '+String(deletionJob?.failureCode??deletionJob?.state))
 const queue=(await db.doc('deletionQueue/'+deletionJobId).get()).data()
 assert.equal(queue?.state,'completed','J9G deletionQueue did not report completion')
 const durable=(await db.doc('deletionReceipts/'+deletionReceiptId).get()).data()
 assert.equal(durable?.result,'completed','J9G durable server deletion receipt missing')
 assert.equal(durable?.receiptId,deletionReceiptId,'J9G durable receipt has wrong immutable identity')
 assert.equal(durable?.jobId,deletionJobId,'J9G durable receipt must name the actual server job')
 assert.equal(durable?.ownerDigest,createHash('sha256').update('urai-owner:'+accounts[0].uid).digest('hex'),
  'J9G durable receipt has wrong nonidentifying owner digest')
 assert.equal(durable?.scope,'memories','J9G deletion scope changed')
 assert.ok(durable?.removedMemoryStarEvents>=1,'J9G real Memory Star events were not removed')
 assert.equal((await db.doc('users/'+accounts[0].uid+'/memories/fictional-memory-a').get()).exists,false)
 assert.equal((await db.doc('users/'+accounts[0].uid+'/lifeMapEvents/fictional-star-a').get()).exists,false)
 assert.equal((await db.doc('users/'+accounts[0].uid+'/lifeMapEvents/fictional-orphan').get()).exists,false,
  'J9G orphan Memory Star survives scoped deletion')
 assert.deepEqual((await db.doc(ritualPath).get()).data(),ritual,
  'J9G unrelated ritual must survive memory-only deletion')
 assert.equal((await db.doc('users/'+accounts[1].uid+'/memories/fictional-memory-b').get()).exists,true,
  'J9G owner A deletion touched account B')
 // Retry with the same original app-issued operation. A second deletion job
 // must not be scheduled even after the first worker is terminal.
 const retryLogin=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fictional-emulator-key',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({email:accounts[0].email,password:accounts[0].password,returnSecureToken:true})})
 assert.equal(retryLogin.status,200)
 const retryToken=(await retryLogin.json()).idToken
 assert.ok(retryToken,'J9G could not obtain a disposable current Auth token for idempotency')
 const retry=await fetch('http://127.0.0.1:5001/'+project+'/us-central1/createSpatialDeletionRequest',{
  method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+retryToken},
  body:JSON.stringify({data:{scope:'memories',confirmation:'CONFIRM DELETE',operationId}})})
 // Observe the callable response without logging bearer tokens or credentials.
 // The raw HTTP protocol and SDK-compatible endpoints may use result/data.
 let retryEnvelope
 try { retryEnvelope=await retry.json() } catch { retryEnvelope=null }
 const retryRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
 const envelopeKeys=retryRecord(retryEnvelope)?Object.keys(retryEnvelope).sort():[]
 const envelopeKind=retryRecord(retryEnvelope?.result)?'result':
  retryRecord(retryEnvelope?.data)?'data':'missing'
 const retryResult=envelopeKind==='result'?retryEnvelope.result:
  envelopeKind==='data'?retryEnvelope.data:null
 const retryErrorCode=typeof retryEnvelope?.error?.status==='string'
  ?retryEnvelope.error.status.replace(/[^A-Z_]/g,'').slice(0,48):null
 const ownerJobs=await db.collection('users/'+accounts[0].uid+'/deletionJobs').get()
 const ownerQueues=await db.collection('deletionQueue').where('uid','==',accounts[0].uid).get()
 const ownerReceipts=await db.collection('users/'+accounts[0].uid+'/privacyReceipts')
  .where('kind','==','deletion').get()
 const persistedJob=(await db.doc('users/'+accounts[0].uid+'/deletionJobs/'+deletionJobId).get()).data()
 const retryEvidence={
  httpStatus:retry.status,envelopeKeys,envelopeKind,errorCode:retryErrorCode,
  returnedKeys:retryRecord(retryResult)?Object.keys(retryResult).sort():[],
  returnedJobId:typeof retryResult?.jobId==='string'?retryResult.jobId:null,
  returnedState:typeof retryResult?.state==='string'?retryResult.state:null,
  returnedReceiptId:typeof retryResult?.receiptId==='string'?retryResult.receiptId:null,
  originalJobId:deletionJobId,originalReceiptId:deletionReceiptId,
  ownerJobCount:ownerJobs.size,queueCount:ownerQueues.size,
  ownerReceiptCount:ownerReceipts.size,persistedJobState:persistedJob?.state??null,
 }
 result.journey.privacy.deletionRetry=retryEvidence
 mark('J9G-retry-observed',retryEvidence)
 assert.equal(retry.status,200,'J9G retry returned non-200 HTTP; redacted: '+JSON.stringify(retryEvidence))
 assert.equal(retryErrorCode,null,'J9G retry returned callable error; redacted: '+JSON.stringify(retryEvidence))
 assert.equal(retryResult?.jobId,deletionJobId,
  'J9G idempotent retry identity mismatched or response undecodable; redacted: '+JSON.stringify(retryEvidence))
 assert.equal(retryResult?.state,'completed','J9G retry did not return the completed existing job')
 assert.equal(retryResult?.receiptId,deletionReceiptId,'J9G retry changed receipt identity')
 assert.equal(persistedJob?.state,'completed','J9G retry modified completed deletion job state')
 assert.equal(ownerJobs.size,1,'J9G retry generated additional owner deletion jobs')
 assert.equal(ownerQueues.size,1,'J9G retry generated additional deletion queues')
 assert.equal(ownerReceipts.size,1,'J9G retry generated duplicate owner deletion receipts')
 await page.goto(origin+'/replay?memoryId=fictional-memory-a&manifestId=fictional-manifest-a')
 const deletedReplay=page.getByTestId('cinematic-replay-client')
 await deletedReplay.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>{
  const state=document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.memoryStatus
  return state && state!=='loading'
 },null,{timeout:60000})
 assert.ok(['unavailable','unauthorized','deleted'].includes(await deletedReplay.getAttribute('data-memory-status')),
  'J9G deleted memory became usable after browser navigation')
 // Original Focus and Replay must deny deleted memory before and after
 // browser recovery. No Admin deletions count toward this product proof.
 await page.goto(origin+'/focus?memoryId=fictional-memory-a&manifestId=fictional-manifest-a')
 const deletedFocus=page.getByTestId('urai-final-focus-chamber')
 await deletedFocus.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>{
  const status=document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.memoryStatus
  return status && status!=='loading'
 },null,{timeout:60000})
 assert.ok(['unavailable','unauthorized','deleted'].includes(await deletedFocus.getAttribute('data-memory-status')),
  'J9H original Focus recovered deleted private memory')
 await page.reload({waitUntil:'domcontentloaded'})
 await page.waitForFunction(()=>{
  const status=document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.memoryStatus
  return status && status!=='loading'
 },null,{timeout:90000})
 assert.ok(['unavailable','unauthorized','deleted'].includes(await deletedFocus.getAttribute('data-memory-status')),
  'J9H original Focus recovered deleted private memory after reload')
 // Browser back/forward is a real recovery path; never restore a stale
 // authorized scene from history or the prior selected-memory state.
 await page.goBack({waitUntil:'domcontentloaded'})
 await routeIsPage(page,'/replay')
 await page.waitForFunction(()=>{
  const status=document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.memoryStatus
  return ['unavailable','unauthorized','deleted'].includes(status)
 },null,{timeout:90000})
 await page.goForward({waitUntil:'domcontentloaded'})
 await routeIsPage(page,'/focus')
 await page.waitForFunction(()=>{
  const status=document.querySelector('[data-testid="urai-final-focus-chamber"]')?.dataset.memoryStatus
  return ['unavailable','unauthorized','deleted'].includes(status)
 },null,{timeout:90000})
 mark('J9H-history-restore-denied',{back:'Replay denied',forward:'Focus denied'})
 // Switching to owner B, then reauthenticating owner A, must not allow an
 // old browser, cached permission or selected manifest to restore authority.
 await page.goto(origin+'/login')
 await page.getByRole('button',{name:'Sign out'}).click({timeout:15000})
 await page.getByTestId('urai-e2e-login-form').waitFor({state:'visible',timeout:30000})
 await login(page,accounts[1].email,accounts[1].password,accounts[1].uid)
 await page.goto(origin+'/replay?memoryId=fictional-memory-a&manifestId=fictional-manifest-a')
 const foreignDeletedReplay=page.getByTestId('cinematic-replay-client')
 await foreignDeletedReplay.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>{
  const status=document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.memoryStatus
  return status && status!=='loading'
 },null,{timeout:60000})
 assert.ok(['unavailable','unauthorized','deleted'].includes(await foreignDeletedReplay.getAttribute('data-memory-status')),
  'J9H account B recovered deleted account A Replay')
 await page.goto(origin+'/login')
 await page.getByRole('button',{name:'Sign out'}).click({timeout:15000})
 await page.getByTestId('urai-e2e-login-form').waitFor({state:'visible',timeout:30000})
 await login(page,accounts[0].email,accounts[0].password,accounts[0].uid)
 await page.goto(origin+'/replay?memoryId=fictional-memory-a&manifestId=fictional-manifest-a')
 await page.reload({waitUntil:'domcontentloaded'})
 const reauthenticatedReplay=page.getByTestId('cinematic-replay-client')
 await reauthenticatedReplay.waitFor({state:'visible',timeout:90000})
 await page.waitForFunction(()=>{
  const status=document.querySelector('[data-testid="cinematic-replay-client"]')?.dataset.memoryStatus
  return status && status!=='loading'
 },null,{timeout:60000})
 assert.ok(['unavailable','unauthorized','deleted'].includes(await reauthenticatedReplay.getAttribute('data-memory-status')),
  'J9H owner reauthentication restored deleted private Replay')
 assert.equal((await db.doc('users/'+accounts[0].uid+'/memories/fictional-memory-a').get()).exists,false,
  'J9H old memory was resurrected after owner reauthentication')
 assert.deepEqual((await db.doc(ritualPath).get()).data(),ritual,
  'J9H unrelated ritual changed during owner recovery')
 await screenshot(page,'J9-canonical-memory-deletion')
 result.journey.privacy.deletion={scope:'memories',jobId:deletionJobId,receiptId:deletionReceiptId,
  canonicalUIRequest:true,serverWorkerCompleted:true,retainedDurableReceipt:true,
  removedMemoryStarEvents:durable.removedMemoryStarEvents,idempotentRetry:true,replayDenied:true,
  focusDenied:true,focusReloadDenied:true,crossOwnerReplayDenied:true,ownerReauthenticationDenied:true,
  unrelatedRitualPreservedAfterReauthentication:true}
 mark('J9G-canonical-deletion',result.journey.privacy.deletion)
 // Council now has its own original Next UI + canonical callable race proof.
 // The memory-media suite proves bounded source/HTTP revocation separately,
 // but this journey still lacks a single-source native positive Storage IAM
 // playback acceptance; do not silently convert a focused success into J9.
 assert.equal(result.journey.privacy.revocation.councilAsyncContextInvalidationVerified,true)
 mark('J9-council-async-client-accepted',{scenarios:2,providerCalls:0,scope:'original-app-browser-only'})
 throw Error('J9_INCOMPLETE: original-app Council client revocation proven; native positive private-media playback and combined admission remain unverified')
}

await mkdir(out,{recursive:true})
try{
 assert.match(sha,/^[a-f0-9]{40}$/)
 for(const [key,value] of Object.entries({GCLOUD_PROJECT:project,FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_FUNCTIONS_EMULATOR_HOST:'127.0.0.1:5001',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199',NEXT_PUBLIC_FIREBASE_PROJECT_ID:project,NEXT_PUBLIC_URAI_AUTH_JOURNEY_EMULATOR:'true'}))assert.equal(process.env[key],value,'isolated '+key)
 assert.equal(process.env.NODE_ENV||'development','development')
  // The Admin project and browser Storage bucket must remain the fictional
  // suite's identity even when CI/runner inherited other Firebase variables.
  assert.equal(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,project+'.appspot.com',
   'Refusing non-fictional Firebase Storage bucket in journey test')
  if(process.env.FIREBASE_CONFIG){
   let parsed
   try{parsed=JSON.parse(process.env.FIREBASE_CONFIG)}
   catch{throw Error('Refusing unreadable Firebase Admin runtime config')}
   assert.equal(parsed?.projectId,project,'Refusing Firebase Admin runtime project mismatch')
   if(parsed?.storageBucket)assert.ok(String(parsed.storageBucket).startsWith(project+'.'),
    'Refusing non-fictional Firebase Admin storage bucket')
  }
 await assertFourIsolatedEmulators()
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
  summary:'Fictional emulator data only',emotionalState:'calm',deleted:false,demo:false,consentState:'authorized',privacy:'private',
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

 server=spawn('pnpm',['--dir','urai-tier1','exec','next','dev','--hostname','127.0.0.1','--port','4173'],{env:{...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_URAI_COUNCIL_ANTHROPIC_ENABLED:'true',URAI_COUNCIL_ANTHROPIC_ENABLED:'false'},stdio:'ignore'})
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
 await routeIsPage(page,'/home')
 const shell=page.getByTestId('urai-persistent-world-shell')
 await shell.waitFor({state:'visible',timeout:90000})
 mark('J3-route',{route:'/home',scope:'original-shell-not-interactive'})
 await screenshot(page,'J3-home-shell')
 const home=await readyHome(page)
 await proveOrbToMap(page,home)
 await proveMapFocusReplayReturn(page,accounts[0].uid)
 await provePrivacyAfterJourney(page,accounts,db,privacyPolicy)
}catch(e){result.firstFailure=String(e);process.exitCode=1}
finally{
 // Zero permanent records or identities: clean tracked disposable emulator data
 // before the emulator shuts down; failure to clean is also failure to accept.
 if(browser)await browser.close().catch(()=>{})
 if(server)server.kill('SIGTERM')
 const errors=[]
 // The canonical callable/trigger creates real emulator-only job and receipt
 // documents; track those too, even when the browser fails halfway through.
 if(disposableDb){
  for(const collectionPath of [
   'users/fictional-urai-a/privacyReceipts',
   'users/fictional-urai-a/privacyRuntime'
  ]){
   try{
    const found=await disposableDb.collection(collectionPath).limit(150).get()
    for(const doc of found.docs)disposableDocs.push(doc.ref.path)
   }catch(error){errors.push('cleanup-collection:'+collectionPath+':'+String(error).slice(0,80))}
  }
  try{
   const jobs=await disposableDb.collection('privacyEnforcementJobs')
    .where('uid','==','fictional-urai-a').limit(25).get()
   for(const doc of jobs.docs)disposableDocs.push(doc.ref.path)
  }catch(error){errors.push('cleanup-jobs:'+String(error).slice(0,80))}
 }
 if(disposableDb)for(const item of [...new Set(disposableDocs)].reverse())try{await disposableDb.doc(item).delete()}catch(e){errors.push('record:'+item+':'+String(e).slice(0,80))}
 if(disposableAuth)for(const uid of [...disposableUsers].reverse())try{await disposableAuth.deleteUser(uid)}catch(e){errors.push('identity:'+uid+':'+String(e).slice(0,80))}
 result.cleanup={disposableDocumentCount:disposableDocs.length,disposableIdentityCount:disposableUsers.length,errors}
 if(errors.length){result.errors.push(...errors);process.exitCode=1}
 if(process.exitCode || errors.length || !result.authenticatedJourney)result.status='FAIL_CLOSED'
 if(app)await app.delete().catch(()=>{})
 await writeFile(path.join(out,'receipt.json'),JSON.stringify(result,null,2))
}
