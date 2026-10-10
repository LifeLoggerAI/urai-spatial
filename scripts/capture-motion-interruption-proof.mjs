import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { chromiumLaunchOptions } from './playwright-runtime-helpers.mjs'
import { installMotionProofObserver, markMotionProof, summarizeMotionProof } from './motion-proof-observer.mjs'

const require = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = require('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const output = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/motion-interruptions')
const exactHead = String(process.env.URAI_EXACT_HEAD || '')
const viewportMatch = /^(\d{3,4})x(\d{3,4})$/.exec(process.env.URAI_PROOF_VIEWPORT || '1280x800')
assert.ok(viewportMatch,'URAI_PROOF_VIEWPORT must be WIDTHxHEIGHT')
const viewport = { width:Number(viewportMatch[1]),height:Number(viewportMatch[2]) }
const emulatedCores = process.env.URAI_PROOF_EMULATED_CORES ? Number(process.env.URAI_PROOF_EMULATED_CORES) : null
assert.ok(emulatedCores === null || (Number.isInteger(emulatedCores) && emulatedCores > 0 && emulatedCores <= 128),'Invalid emulated core count')
assert.match(exactHead, /^[0-9a-f]{40}$/)
await mkdir(output, { recursive: true })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const shell = page => page.getByTestId('urai-persistent-world-shell')
const home = page => shell(page).locator('[data-home-primary-owner="asset-driven"]')
const map = page => page.getByTestId('urai-true-3d-life-map')
const focus = page => shell(page).getByTestId('urai-final-focus-chamber')
const replay = page => shell(page).getByTestId('cinematic-replay-client')
const demoQuery = 'demo=1&memoryId=demo%3Aquiet-reset&node=quiet-reset&manifestId=replay-recovery-thread'
const renderedBox=locator=>locator.evaluateAll(nodes=>{
  if(nodes.length!==1)return null
  const rect=nodes[0].getBoundingClientRect()
  return{x:rect.x,y:rect.y,width:rect.width,height:rect.height}
})

async function waitAttribute(locator, name, expected, timeout = 60_000) {
  const started = Date.now()
  let last = null
  while (Date.now() - started < timeout) {
    try { last = await locator.evaluateAll((nodes,name)=>nodes[0]?.getAttribute(name)??null,name); if (last === expected) return } catch {}
    await pause(100)
  }
  throw new Error(`Expected ${name}=${expected}; last=${JSON.stringify(last)}`)
}
async function waitPath(page, expected, timeout = 45_000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if ((new URL(page.url()).pathname.replace(/\/+$/, '') || '/') === expected) return
    await pause(100)
  }
  throw new Error(`Expected pathname ${expected}; received ${page.url()}`)
}
async function settledWorld(page) { await waitAttribute(shell(page), 'data-world-transition', 'idle') }
async function openRealm(page, realm) {
  const url = realm === 'home' ? '/home/?demo=1' : realm === 'life-map' ? '/life-map/?demo=1' : `/${realm}/?${demoQuery}`
  assert.ok((await page.goto(base + url, {waitUntil:'domcontentloaded',timeout:60_000}))?.ok(), 'Demo realm did not return2xx')
  if (realm === 'home') {
    await waitAttribute(home(page),'data-home-assets-ready','true',90_000)
    await waitAttribute(home(page),'data-home-scene-phase','HOME')
    await waitAttribute(home(page),'data-home-input-locked','false')
  } else if (realm === 'life-map') {
    await waitAttribute(map(page),'data-life-map-source','explicit-demo')
    await waitAttribute(map(page),'data-life-map-render-ready','true')
  } else if (realm === 'focus') {
    await waitAttribute(focus(page),'data-memory-id','demo:quiet-reset')
    await waitAttribute(focus(page),'data-webgl-state','ready')
    await waitAttribute(focus(page).locator('canvas'),'data-focus-first-frame','true')
    await waitAttribute(focus(page),'data-focus-input-ready','true')
  } else {
    await waitAttribute(replay(page),'data-memory-id','demo:quiet-reset')
    await waitAttribute(replay(page),'data-replay-media-ready','true')
    await waitAttribute(replay(page).locator('canvas'),'data-replay-first-frame','true')
    const arrival=await replay(page).evaluateAll(nodes=>nodes[0]?.getAttribute('data-replay-arrival-ready')??null)
    if(arrival!==null){await waitAttribute(replay(page),'data-replay-arrival-ready','true');await waitAttribute(replay(page),'data-replay-interaction-ready','true')}
  }
  await settledWorld(page)
}
async function selectMemory(page, waitForArrival = true) {
  await page.locator('.life-map-search-trigger').first().click()
  const region = page.getByRole('region',{name:'Search and filter Life Map',exact:true})
  await region.locator('button[data-life-map-semantic-result]').filter({hasText:'The Quiet Reset'}).first().click()
  if (waitForArrival) {
    await waitAttribute(map(page),'data-life-map-phase','arrival')
    await waitAttribute(map(page),'data-life-map-render-ready','true')
    // Real actionability waits for the product's finite settled camera gate.
    await map(page).getByRole('button',{name:/Enter Focus$/}).waitFor({state:'visible'})
  }
}
async function escapeBurst(page, count = 4) {
  // Playwright marks subsequent down() calls on the held key as native repeat.
  // A complete press() on a stalled renderer can arrive after a committed return
  // and legitimately start the next unwind; that would not be a repeated-key test.
  try{
    for (let index=0;index<count;index++) { await page.keyboard.down('Escape'); if (index<count-1) await pause(30) }
  }finally{await page.keyboard.up('Escape')}
}
async function identity(locator) {
  await waitAttribute(locator,'data-memory-id','demo:quiet-reset')
  await waitAttribute(locator,'data-star-id','quiet-reset')
  await waitAttribute(locator,'data-manifest-id','replay-recovery-thread')
}
async function holdStable(page, expected, milliseconds = 2000) {
  await waitPath(page, expected)
  await settledWorld(page)
  const started = Date.now()
  while (Date.now()-started < milliseconds) {
    assert.equal((new URL(page.url()).pathname.replace(/\/+$/, '') || '/'),expected,'a stale transition changed the settled destination')
    await pause(150)
  }
}

const cases = [
  {id:'home-yawed-exploration', realm:'home', async run(page,result) {
    const canvas=home(page).locator('canvas').first(),box=await renderedBox(canvas)
    assert.ok(box && box.width>400)
    const before=await markMotionProof(page,'start-home-yawed-look')
    const distance=(Math.PI/3)/.0031
    const x=box.x+box.width*.70,y=box.y+box.height*.52
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-distance,y,{steps:30});await page.mouse.up()
    await pause(500)
    const looking=await markMotionProof(page,'start-home-forward-after-look')
    const startX=Number(looking.home?.['data-home-player-x']),startZ=Number(looking.home?.['data-home-player-z'])
    assert.ok(Number.isFinite(startX)&&Number.isFinite(startZ),'actual starting Home player position was unavailable')
    try{
      await page.keyboard.down('w')
      await page.waitForFunction(({startX,startZ})=>{
        const owner=document.querySelector('[data-home-primary-owner="asset-driven"]')
        const x=Number(owner?.getAttribute('data-home-player-x')),z=Number(owner?.getAttribute('data-home-player-z'))
        return owner&&Number.isFinite(x)&&Number.isFinite(z)&&Math.hypot(x-startX,z-startZ)>.02
      },{startX,startZ},{timeout:90_000})
    }finally{await page.keyboard.up('w')}
    await pause(1000)
    const after=await markMotionProof(page,'end-home-yawed-exploration')
    result.exploration={before,looking,after,physicalInput:'pointer drag + keyboard W; ~60deg relative drag from current orientation; no camera-state injection'}
    const attributes=looking?.home,final=after?.home
    const fields=['x','z','qx','qy','qz','qw']
    if(fields.every(field=>attributes?.[`data-home-camera-${field}`]!==undefined)&&['x','z'].every(field=>final?.[`data-home-camera-${field}`]!==undefined)){
      const [x,z,qx,qy,qz,qw]=fields.map(field=>Number(attributes[`data-home-camera-${field}`]))
      const dx=Number(final['data-home-camera-x'])-x,dz=Number(final['data-home-camera-z'])-z
      const forwardX=-2*(qx*qz+qw*qy),forwardZ=-(1-2*(qx*qx+qy*qy))
      const travel=Math.hypot(dx,dz),forwardLength=Math.hypot(forwardX,forwardZ)
      assert.ok([x,z,qx,qy,qz,qw,dx,dz,forwardLength].every(Number.isFinite),'Home look or movement telemetry was non-finite')
      assert.ok(travel>.0001,'no actual forward movement was observed after yawed keyboard input')
      const startPoseCosine=(dx*forwardX+dz*forwardZ)/(travel*forwardLength)
      const samples=await page.evaluate(({start,end})=>window.__uraiMotionProof?.snapshot().samples.filter(sample=>sample.realm==='home'&&sample.ms>start&&sample.ms<end)??[],{start:looking.ms,end:after.ms})
      const poses=[looking,...samples,after],steps=[]
      for(let index=1;index<poses.length;index++){
        const previous=poses[index-1].home,current=poses[index].home
        if(!fields.every(field=>current?.[`data-home-camera-${field}`]!==undefined)||!['x','z'].every(field=>previous?.[`data-home-camera-${field}`]!==undefined))continue
        const [x,z,qx,qy,qz,qw]=fields.map(field=>Number(current[`data-home-camera-${field}`]))
        const dx=x-Number(previous['data-home-camera-x']),dz=z-Number(previous['data-home-camera-z']),distance=Math.hypot(dx,dz)
        if(distance<=.0001)continue
        const viewX=-2*(qx*qz+qw*qy),viewZ=-(1-2*(qx*qx+qy*qy))
        const cosine=(dx*viewX+dz*viewZ)/(distance*Math.hypot(viewX,viewZ))
        assert.ok(Number.isFinite(cosine)&&cosine>.98,`forward walking diverged from its observed same-frame view: cosine=${cosine}`)
        steps.push({ms:poses[index].ms,distance,cosine})
      }
      assert.ok(steps.length,'no finite actual Home walking step was exposed')
      result.exploration.alignment={available:true,source:'actual-PlayerRig-position-and-quaternion-at-each-observed-physical-input-step',travel,startPoseCosine,minimumSameFrameCosine:Math.min(...steps.map(step=>step.cosine)),steps}
    }else result.exploration.alignment={available:false,reason:'baseline-does-not-expose-actual-camera-quaternion; video-and-player-fields-retained-without-inferred-pose'}
    await waitAttribute(home(page),'data-home-input-locked','false')
    assert.equal(new URL(page.url()).pathname.replace(/\/+$/,''),'/home')
  }},
  {id:'ascent-escape-burst',realm:'home',async run(page) {
    const canvas=home(page).locator('canvas').first(),box=await renderedBox(canvas)
    assert.ok(box)
    await page.mouse.click(box.x+box.width*.5,box.y+box.height*.12)
    await waitAttribute(home(page),'data-home-scene-phase','ASCENT',10_000)
    await markMotionProof(page,'active-ascent-before-escape')
    await escapeBurst(page)
    await waitAttribute(home(page),'data-home-scene-phase','HOME',15_000)
    await waitAttribute(home(page),'data-home-input-locked','false',15_000)
    await holdStable(page,'/home')
  }},
  {id:'star-acquisition-escape-burst',realm:'life-map',async run(page) {
    await selectMemory(page,false)
    await markMotionProof(page,'active-star-acquisition-before-escape')
    await escapeBurst(page)
    await waitAttribute(map(page),'data-life-map-phase','overview',20_000)
    await waitAttribute(map(page),'data-life-map-render-ready','true')
    await holdStable(page,'/life-map')
  }},
  {id:'life-map-focus-arrival-escape',realm:'life-map',async run(page,result) {
    await selectMemory(page)
    await markMotionProof(page,'selected-life-map-before-actual-focus-navigation')
    await map(page).getByRole('button',{name:/Enter Focus$/}).click()
    await waitPath(page,'/focus')
    await identity(focus(page))
    const arriving=await markMotionProof(page,'actual-focus-arrival-before-escape')
    result.arrivalInterruption={observed:arriving.focus?.['data-focus-input-ready']==='false',owner:arriving.focus?.['data-focus-camera-owner']??null,worldPhase:arriving.world?.['data-world-transition']??null,source:'real-selected-Map-button-navigation; no-injected-world-travel-event'}
    if(!result.arrivalInterruption.observed)result.arrivalInterruption.limitation='The first reachable Focus observation was already input-ready; this proves its settled return only, not cancellation during arrival.'
    await escapeBurst(page)
    await holdStable(page,'/life-map')
    await waitAttribute(map(page),'data-life-map-phase','arrival')
    await waitAttribute(map(page),'data-life-map-render-ready','true')
    assert.equal(new URL(page.url()).searchParams.get('node'),'quiet-reset')
    assert.equal(new URL(page.url()).searchParams.get('memoryId'),'demo:quiet-reset')
  }},
  {id:'focus-replay-departure-cancel',realm:'focus',async run(page) {
    await focus(page).getByRole('button',{name:'Open Replay for The Quiet Reset',exact:true}).click()
    await waitAttribute(shell(page),'data-world-transition','departing',10_000)
    await markMotionProof(page,'active-focus-replay-before-escape')
    await escapeBurst(page)
    await holdStable(page,'/focus')
    await identity(focus(page))
  }},
  {id:'focus-replay-cancel-then-new-trip',realm:'focus',async run(page,result) {
    const open=()=>focus(page).getByRole('button',{name:'Open Replay for The Quiet Reset',exact:true})
    await open().click()
    await waitAttribute(shell(page),'data-world-transition','departing',10_000)
    await markMotionProof(page,'first-replay-trip-before-cancellation')
    await escapeBurst(page)
    await holdStable(page,'/focus')
    await identity(focus(page))
    await waitAttribute(focus(page),'data-focus-input-ready','true')
    await markMotionProof(page,'new-replay-trip-after-cancellation')
    await open().click()
    await waitPath(page,'/replay')
    await identity(replay(page))
    await waitAttribute(replay(page),'data-replay-media-ready','true')
    await waitAttribute(replay(page).locator('canvas'),'data-replay-first-frame','true')
    const arrival=await replay(page).evaluateAll(nodes=>nodes[0]?.getAttribute('data-replay-arrival-ready')??null)
    if(arrival!==null)await waitAttribute(replay(page),'data-replay-interaction-ready','true')
    await holdStable(page,'/replay',3000)
    result.newTrip={source:'actual-Focus-control-after-native-Escape-cancellation',sameMemory:true,staleDestinationOverwritesObserved:false}
  }},
  {id:'life-map-focus-browser-back',realm:'life-map',async run(page,result) {
    await selectMemory(page)
    const selectedUrl=page.url()
    await map(page).getByRole('button',{name:/Enter Focus$/}).click()
    await waitPath(page,'/focus')
    await identity(focus(page))
    await waitAttribute(focus(page),'data-focus-input-ready','true')
    await markMotionProof(page,'actual-focus-before-browser-back')
    await page.goBack({waitUntil:'domcontentloaded',timeout:60_000})
    await holdStable(page,'/life-map')
    await waitAttribute(map(page),'data-life-map-phase','arrival')
    await waitAttribute(map(page),'data-life-map-render-ready','true')
    const returned=new URL(page.url()),selected=new URL(selectedUrl)
    for(const key of ['demo','node','memoryId','manifestId'])assert.equal(returned.searchParams.get(key),selected.searchParams.get(key),`native Back changed selected ${key}`)
    result.history={source:'native-browser-goBack-after-actual-Map-control',selectedUrl,returnedUrl:page.url(),selectionRestored:true}
  }},
  {id:'focus-responsive-resize',realm:'focus',async run(page,result) {
    const widths=[390,1024,640]
    result.resizes=[]
    for(const width of widths){
      await page.setViewportSize({width,height:width===390?844:400})
      await identity(focus(page))
      await waitAttribute(focus(page),'data-focus-input-ready','true')
      await waitAttribute(focus(page).locator('canvas'),'data-focus-first-frame','true')
      await markMotionProof(page,`focus-native-viewport-${width}`)
      await holdStable(page,'/focus',500)
      result.resizes.push({width,height:width===390?844:400,url:page.url()})
    }
    result.resizeClass='actual-browser-viewport-change; not-physical-device-acceptance'
  }},
  {id:'playing-replay-unwind-repeated-escape',realm:'replay',async run(page) {
    await replay(page).getByRole('button',{name:'Continue memory',exact:true}).click()
    await waitAttribute(replay(page),'data-playing','true')
    await pause(700)
    await markMotionProof(page,'playing-replay-before-escape')
    await escapeBurst(page)
    await holdStable(page,'/focus')
    await identity(focus(page))
    assert.equal(await replay(page).count(),0,'orphan Replay surface remained mounted')
  }},
  {id:'replay-pause-seek-unwind',realm:'replay',async run(page,result) {
    await replay(page).getByRole('button',{name:'Continue memory',exact:true}).click()
    await waitAttribute(replay(page),'data-playing','true')
    await pause(1000)
    await replay(page).getByRole('button',{name:'Pause memory',exact:true}).click()
    await waitAttribute(replay(page),'data-playing','false')
    const before=await markMotionProof(page,'replay-paused-before-frame-observation')
    await page.waitForFunction(ms=>window.__uraiMotionProof?.snapshot().samples.filter(sample=>sample.realm==='replay'&&sample.ms>ms).length>=4,before.ms,{timeout:90_000})
    const after=await markMotionProof(page,'replay-paused-after-frame-observation')
    assert.equal(after.replay?.['data-current-time-ms'],before.replay?.['data-current-time-ms'],'paused memory time continued advancing')
    const beforeCamera=before.canvas?.firstFrame,afterCamera=after.canvas?.firstFrame
    const fields=['data-replay-camera-position','data-replay-camera-quaternion','data-replay-camera-target','data-replay-camera-fov']
    const observed=fields.filter(field=>beforeCamera?.[field]!==undefined&&afterCamera?.[field]!==undefined)
    result.pausedCamera={available:observed.length>0,fields:observed,before,after,claim:observed.length ? 'measured-live-canvas-pose-across-four-browser-frame-observations' : 'baseline-does-not-expose-camera-tuples-no-frozen-camera-claim'}
    for(const field of observed){
      const first=beforeCamera[field].split(',').map(Number),last=afterCamera[field].split(',').map(Number)
      assert.ok(first.every(Number.isFinite)&&last.every(Number.isFinite),'Replay paused pose was non-finite')
      assert.ok(first.every((value,index)=>Math.abs(value-last[index])<=.005),`paused Replay camera drifted ${field}`)
    }
    const seek=replay(page).locator('input.memorySeek')
    await seek.focus()
    await seek.press('Home')
    for(let index=0;index<12;index++)await seek.press('ArrowRight')
    await waitAttribute(replay(page),'data-current-time-ms','1200')
    await waitAttribute(replay(page),'data-playing','false')
    result.seek=await markMotionProof(page,'replay-paused-after-real-keyboard-seek')
    // Preserve the adopted editable-input Escape exclusion. Leave the native
    // slider by real keyboard navigation before asking the realm to unwind.
    await seek.press('Tab')
    result.seekFocusRelease=await markMotionProof(page,'replay-seek-focus-released-by-native-tab')
    await page.keyboard.press('Escape')
    await holdStable(page,'/focus')
    await identity(focus(page))
    assert.equal(await replay(page).count(),0,'orphan Replay surface remained mounted after paused seek unwind')
  }},
  {id:'focus-life-map-unwind-repeated-escape',realm:'focus',async run(page) {
    await escapeBurst(page)
    await holdStable(page,'/life-map')
    await waitAttribute(map(page),'data-life-map-phase','arrival')
    assert.equal(new URL(page.url()).searchParams.get('node'),'quiet-reset')
    assert.equal(new URL(page.url()).searchParams.get('memoryId'),'demo:quiet-reset')
  }},
  {id:'life-map-home-return-repeated-escape',realm:'life-map',async run(page) {
    await escapeBurst(page)
    await holdStable(page,'/home')
    await waitAttribute(home(page),'data-home-assets-ready','true',90_000)
    await waitAttribute(home(page),'data-home-scene-phase','HOME')
    await waitAttribute(home(page),'data-home-input-locked','false')
    await waitAttribute(home(page),'data-home-camera-mode','embodied-first-person')
  }},
]
const selected = process.env.URAI_MOTION_CASES?.split(',').filter(Boolean)
const runCases = selected ? cases.filter(value=>selected.includes(value.id)) : cases
assert.ok(runCases.length,'No interruption cases selected')
const receipt={schemaVersion:'urai-motion-interruption-proof-1',exactHead,capturedAt:new Date().toISOString(),viewport,reducedMotion:process.env.URAI_MOTION_REDUCED==='1',evidenceClass:'genuine-local-application-with-disclosed-demo-fixture',setupClass:'each-scenario-enters-its-real-source-realm-directly-not-an-uninterrupted-journey',runtimeSetup:process.env.URAI_MOTION_RUNTIME_SETUP_JSON ? JSON.parse(process.env.URAI_MOTION_RUNTIME_SETUP_JSON) : null,cases:[]}
receipt.repeatedEscapeInput={source:'actual-browser-keyboard-down-events',count:4,firstEventRepeat:false,subsequentEventRepeat:true,keyup:'unconditional-finally',limitation:'Delivery follows the actual browser scheduler. This proves held-key repeats; fresh rapid-tap cancellation races are covered separately by mounted controller tests.'}
const browser=await chromium.launch({headless:true,...chromiumLaunchOptions(),args:['--enable-unsafe-swiftshader',...JSON.parse(process.env.URAI_CHROMIUM_ARGS_JSON || '[]')]})
receipt.browserVersion=browser.version()
receipt.hardwareConcurrencyOverride=emulatedCores===null?null:{source:'Chromium DevTools hardware-concurrency emulation',cores:emulatedCores,purpose:'exercise-existing-adaptive-low-tier-in-software-renderer',physicalDeviceClaim:false}
try {
  for (const item of runCases) {
    const result={id:item.id,sourceRealm:item.realm,passed:false}
    receipt.cases.push(result)
    const context=await browser.newContext({viewport,recordVideo:{dir:output,size:viewport},...(process.env.URAI_MOTION_REDUCED==='1'?{reducedMotion:'reduce'}:{})})
    await context.addInitScript(()=>{localStorage.setItem('urai:onboarding:v2:complete','1');localStorage.setItem('urai:onboarding:v3:setup-complete','1')})
    await context.addInitScript(installMotionProofObserver,{invocationId:`interruption-${randomUUID()}`,exactHead})
    const page=await context.newPage(),video=page.video(),errors=[]
    if(emulatedCores!==null){const session=await context.newCDPSession(page);await session.send('Emulation.setHardwareConcurrencyOverride',{hardwareConcurrency:emulatedCores})}
    page.on('pageerror',error=>errors.push(String(error)))
    try {
      await openRealm(page,item.realm)
      await markMotionProof(page,'scenario-start')
      await item.run(page,result)
      await markMotionProof(page,'scenario-end')
      result.passed=true
    } catch(error) {result.error=error?.stack || String(error)}
    finally {
      result.runtimeErrors=errors
      if(errors.length) result.passed=false
      const proof=await page.evaluate(()=>window.__uraiMotionProof?.stop()).catch(()=>null)
      if(proof) {
        result.telemetry=`${item.id}-telemetry.json`
        await writeFile(path.join(output,result.telemetry),JSON.stringify(proof)+'\n')
        result.motion=summarizeMotionProof(proof)
        if(result.motion.nonFiniteCameraSamples.length)result.passed=false
      }
      result.finalUrl=page.url()
      result.screenshot=`${item.id}.png`
      await page.screenshot({path:path.join(output,result.screenshot),timeout:60_000}).catch(error=>{result.screenshotError=String(error)})
      await context.close()
      if(video){result.video=`${item.id}.webm`;await video.saveAs(path.join(output,result.video))}
      await writeFile(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n')
      console.log(`${item.id}: ${result.passed?'PASS':'FAIL'} ${result.error?.split('\n')[0] || ''}`)
    }
  }
} finally {await browser.close()}
receipt.status=receipt.cases.every(item=>item.passed)?'passed':'failed'
await writeFile(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n')
if(receipt.status!=='passed')process.exitCode=1
