import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
const { chromium } = createRequire(new URL('../urai-tier1/package.json', import.meta.url))('playwright')
const sha=process.env.URAI_EXACT_HEAD||''
assert.match(sha,/^[a-f0-9]{40}$/)
const base=new URL('http://127.0.0.1:4173')
const out=path.resolve('artifacts/replay-inworld-candidate')
const manifest=JSON.parse(await readFile('operations/assets/launch-critical-assets.json','utf8'))
const receipts=JSON.parse(await readFile('operations/assets/generated-receipts/urai-final-glb-pack-v1.json','utf8'))
assert.equal(manifest.releasePolicy.candidateAssetsMayShip,false)
const asset=manifest.assets.find(x=>x.id==='replay-memory-environment-v1')
const receipt=receipts.assets.find(x=>x.fileName==='replay-memory-environment-v1.glb')
assert.equal(asset.releaseState,'pending-final-review')
assert.ok(receipt?.sha256)
await mkdir(out,{recursive:true})
const budgetSource=await readFile('urai-tier1/tests/accessibility-performance-metrics.spec.ts','utf8')
const desktopP95Budget=Number(budgetSource.match(/const DESKTOP_FRAME_P95_BUDGET_MS = ([0-9.]+)/)?.[1])
const mobileP95Budget=Number(budgetSource.match(/const MOBILE_FRAME_P95_BUDGET_MS = ([0-9.]+)/)?.[1])
assert.ok(Number.isFinite(desktopP95Budget)&&desktopP95Budget>0&&Number.isFinite(mobileP95Budget)&&mobileP95Budget>0)
const result={exactHead:sha,admission:false,budgets:{desktopP95Ms:desktopP95Budget,mobileP95Ms:mobileP95Budget,source:'urai-tier1/tests/accessibility-performance-metrics.spec.ts'},results:[],failures:[]}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']})
try {
 for(const profile of [{id:'desktop',width:1440,height:900,reduce:false,preview:true},{id:'mobile-reduced',width:390,height:844,reduce:true,preview:true},{id:'default',width:1440,height:900,reduce:false,preview:false},{id:'default-wide',width:2560,height:1440,reduce:false,preview:false},{id:'default-mobile-reduced',width:390,height:844,reduce:true,preview:false}]){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},reducedMotion:profile.reduce?'reduce':'no-preference'})
  const page=await context.newPage()
  const info={profile:profile.id,requests:[],screenshot:null,meshes:null,triangles:null}
  const pending=[]
  const errors=[]
  page.on('pageerror',e=>errors.push(String(e)))
  page.on('response',resp=>{
   if(new URL(resp.url()).pathname!=='/assets/urai/generated/models/replay-memory-environment-v1.glb')return
   pending.push((async()=>{const data=await resp.body();return {status:resp.status(),bytes:data.length,hash:createHash('sha256').update(data).digest('hex')}})())
  })
  await context.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url())
   if(url.origin===base.origin&&['GET','HEAD'].includes(req.method()))return route.continue()
   errors.push('Denied external or mutating request')
   return route.abort()
  })
  try {
   const url=new URL('/replay/?demo=1&memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread'+(profile.preview?'&candidateWorld=replay':''),base)
   const response=await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:90000})
   assert.equal(response?.status(),200)
   assert.equal(await page.locator('body').getAttribute('data-deployed-sha'),sha)
   const scene=page.locator('main.replayWorld[data-memory-status="demo"]')
   await scene.waitFor({state:'visible',timeout:90000})
   await scene.locator('canvas').waitFor({state:'visible',timeout:90000})
   if(profile.preview){
    await page.locator('main.replayWorld[data-replay-candidate-model="replay-memory-environment-v1"]').waitFor({state:'visible',timeout:90000})
    info.meshes=Number(await scene.getAttribute('data-replay-candidate-mesh-count'))
    info.triangles=Number(await scene.getAttribute('data-replay-candidate-triangle-count'))
    assert.ok(info.meshes>0&&info.triangles>0)
    assert.equal(await scene.getAttribute('data-replay-candidate-admission'),'unadmitted-development-only')
    info.framing = {
      projectedDepth: Number(await scene.getAttribute('data-replay-candidate-projected-depth')),
      cameraClearance: Number(await scene.getAttribute('data-replay-candidate-camera-clearance')),
      groundHeight: Number(await scene.getAttribute('data-replay-candidate-ground-y')),
      scale: Number(await scene.getAttribute('data-replay-candidate-scale'))
    }
    assert.ok(info.framing.projectedDepth >= 1.15 && info.framing.projectedDepth <= 2.5)
    assert.ok(info.framing.cameraClearance > 2.5)
    assert.ok(info.framing.scale > 0 && Number.isFinite(info.framing.groundHeight))
   }else{
    await page.waitForFunction(() => { const e=document.querySelector('main.replayWorld[data-memory-status="demo"]'); try{return JSON.parse(e?.getAttribute('data-replay-default-trail-evidence')||'{}').passed===true}catch{return false} },null,{timeout:90000})
    const evidence=JSON.parse(await scene.getAttribute('data-replay-default-trail-evidence'))
    assert.equal(evidence.kind,'real-default-replay-trail')
    assert.equal(evidence.sourceClass,'disclosed-demonstration')
    assert.equal(evidence.admitted,false)
    assert.equal(evidence.rayMisses,0)
    assert.equal(evidence.passed,true)
    assert.equal(await scene.getAttribute('data-replay-candidate-model'),null)
    // Geometry alone cannot certify playback or performance. Wait for the
    // actual demo texture decode result, then measure completed playback.
    await page.waitForFunction(() => {
      const e=document.querySelector('main.replayWorld[data-memory-status="demo"]')
      return e?.getAttribute('data-replay-media-ready')==='true' ||
        e?.getAttribute('data-replay-media-status')==='error'
    },null,{timeout:40_000})
    const mediaState=await scene.getAttribute('data-replay-media-status')
    assert.equal(mediaState,'ready','Replay demo media must decode or explicitly fail; screenshot of Loading is not acceptance')
    assert.equal(await scene.getAttribute('data-replay-media-ready'),'true')
    // Require a real, post-decoding WebGL frame on every device. Headless
    // software rasterization is valid capture evidence, never an FPS result:
    // only positively identified software may avoid the hardware-only
    // 90-sample performance proof. Unknown renderers retain the strict path.
    await page.waitForFunction(()=>{
      const e=document.querySelector('main.replayWorld[data-memory-status="demo"]')
      try {
        const p=JSON.parse(e?.getAttribute('data-replay-default-trail-pacing')||'{}')
        return p.samples>=1 && typeof p.renderer?.renderer==='string' && p.renderer.renderer.length>0
      } catch { return false }
    },null,{timeout:90_000})
    const initialPacing=JSON.parse(await scene.getAttribute('data-replay-default-trail-pacing')||'{}')
    const identity=[initialPacing.renderer?.vendor??'',initialPacing.renderer?.renderer??''].join(' ')
    const positivelySoftware=/swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render|mesa offscreen/i.test(identity)
    const targetSamples=profile.reduce||positivelySoftware?1:90
    await page.waitForFunction((target)=>{
      const e=document.querySelector('main.replayWorld[data-memory-status="demo"]')
      try{return JSON.parse(e?.getAttribute('data-replay-default-trail-pacing')||'{}').samples>=target}catch{return false}
    },targetSamples,{timeout:90_000})
    const pacing=JSON.parse(await scene.getAttribute('data-replay-default-trail-pacing')||'{}')
    const renderHardware=Boolean(pacing.renderer?.hardwareAcceleration)
    assert.ok(!positivelySoftware||!renderHardware,'Software WebGL must not be certified as hardware-accelerated')
    const performanceBudget=profile.reduce?null:desktopP95Budget
    const performanceStatus=profile.reduce?'REDUCED_MOTION_ON_DEMAND_NOT_FPS_BENCHMARK':renderHardware?'ENFORCED':'NOT_AVAILABLE_HARDWARE_RENDERER'
    if(performanceStatus==='ENFORCED'){
      assert.ok(Number.isFinite(pacing.frameP95Ms),'hardware frame p95 must exist')
      assert.ok(pacing.frameP95Ms<=performanceBudget,
        'hardware desktop p95 '+pacing.frameP95Ms+'ms exceeds existing '+performanceBudget+'ms budget')
    }
    info.defaultWorld={evidence,pacing,mediaState,performanceStatus,performanceBudget,captureMode:positivelySoftware?'SOFTWARE_WEBGL_POST_MEDIA_FRAME_NOT_FPS_CERTIFICATION':profile.reduce?'REDUCED_MOTION_ON_DEMAND':'HARDWARE_90_FRAME_BUDGET_ENFORCED',requiredFrameSamples:targetSamples}
    const started=Number(await scene.getAttribute('data-current-time-ms'))
    const play=page.getByRole('button',{name:'Continue memory',exact:true})
    await play.waitFor({state:'visible',timeout:15000})
    await play.focus()
    await play.press('Enter')
    await page.waitForFunction((start)=>{
      const e=document.querySelector('main.replayWorld[data-memory-status="demo"]')
      return e?.getAttribute('data-playing')==='true' && Number(e.getAttribute('data-current-time-ms'))>start+200
    },started,{timeout:15_000})
    const advanced=Number(await scene.getAttribute('data-current-time-ms'))
    const pause=page.getByRole('button',{name:'Pause memory',exact:true})
    await pause.focus()
    await pause.press('Enter')
    await page.waitForFunction(()=>document.querySelector('main.replayWorld[data-memory-status="demo"]')?.getAttribute('data-playing')==='false',null,{timeout:10_000})
    const paused=Number(await scene.getAttribute('data-current-time-ms'))
    await page.waitForTimeout(350)
    assert.equal(Number(await scene.getAttribute('data-current-time-ms')),paused,'pause must freeze actual memory progress')
    await play.focus()
    await play.press('Enter')
    await page.waitForFunction((stop)=>{
      const e=document.querySelector('main.replayWorld[data-memory-status="demo"]')
      return e?.getAttribute('data-playing')==='true'&&Number(e.getAttribute('data-current-time-ms'))>stop+100
    },paused,{timeout:10_000})
    const slider=page.getByRole('slider',{name:/Move through memory time/})
    // A real pointer seek is mandatory; keyboard-only evidence cannot establish
    // usable touch/mouse timeline controls in an immersive memory.
    const bounds=await slider.boundingBox()
    assert.ok(bounds && bounds.width>=100 && bounds.height>=48,'Replay seek control must have a real 48px hit target')
    await page.mouse.click(bounds.x + bounds.width * .45,bounds.y + bounds.height/2)
    await page.waitForFunction(()=>{
      const e=document.querySelector('main.replayWorld[data-memory-status="demo"]')
      const p=Number(e?.getAttribute('data-current-time-ms'))
      const d=Number(e?.getAttribute('data-duration-ms'))
      return d>0 && p>d*.3 && p<d*.65
    },null,{timeout:10_000})
    info.pointerSeekVerified=true
    await slider.focus()
    await slider.press('End')
    await page.waitForFunction(()=>{
      const e=document.querySelector('main.replayWorld[data-memory-status="demo"]')
      return e?.getAttribute('data-playing')==='false' &&
        Number(e.getAttribute('data-current-time-ms'))===Number(e.getAttribute('data-duration-ms'))
    },null,{timeout:10_000})
    info.playback={startedMs:started,advancedMs:advanced,pausedMs:paused,completedMs:Number(await scene.getAttribute('data-current-time-ms')),durationMs:Number(await scene.getAttribute('data-duration-ms')),pausedStable:true,actualCompletion:true}
    assert.ok(info.playback.advancedMs>info.playback.startedMs)
    assert.equal(info.playback.completedMs,info.playback.durationMs)
   }
   info.requests=await Promise.all(pending)
   if(profile.preview)assert.ok(info.requests.some(x=>x.status===200&&x.bytes===receipt.bytes&&x.hash===receipt.sha256))
   else assert.equal(info.requests.length,0)
   assert.equal(await scene.getAttribute('data-manifest-id'),'replay-recovery-thread')
   assert.deepEqual(errors,[])
   const png=await page.screenshot({fullPage:false,animations:'disabled'})
   assert.ok(png.length>15000)
   const filename='actual-replay-'+profile.id+'-'+sha.slice(0,12)+'.png'
   await writeFile(path.join(out,filename),png)
   info.screenshot={file:filename,hash:createHash('sha256').update(png).digest('hex'),width:png.readUInt32BE(16),height:png.readUInt32BE(20)}
   assert.equal(info.screenshot.width,profile.width)
   assert.equal(info.screenshot.height,profile.height)
  }catch(e){result.failures.push({profile:profile.id,error:String(e),pageErrors:errors})}
  finally{result.results.push(info);await context.close()}
 }
}finally{await browser.close()}
await writeFile(path.join(out,'receipt.json'),JSON.stringify(result,null,2)+'\n')
if(result.failures.length)process.exitCode=1
