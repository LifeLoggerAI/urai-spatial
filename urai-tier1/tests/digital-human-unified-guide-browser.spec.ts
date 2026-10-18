import {test,expect} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
import {dirname} from 'node:path'
import {createHash} from 'node:crypto'
import {compareChromiumPngRegion} from './digital-human-png-comparison.mjs'

const origin=process.env.URAI_PROOF_BASE_URL||'http://127.0.0.1:4290'
type Region={cx:number;cy:number;rx:number;ry:number}
type Frame={
 name:string;bytes:Buffer;sha256:string
 beforeSeconds:number;afterSeconds:number;beforeWeight:number;afterWeight:number
 cameraX:string|null;cameraZ:string|null
}
const sha256=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')
test.use({viewport:{width:1280,height:800},reducedMotion:'no-preference'})

test('original Council v4 single skinned Guide renders real body clips, projected face deformation and frozen negative control',async({page},info)=>{
 // Full original application, seven live compositor captures, and real media time.
 test.setTimeout(480000)
 const errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 const receipt:Record<string,unknown>={
  schema:'urai.original-council.v4-unified-skinned-character.visual-evidence.v2',
  classification:'NONPRODUCTION_ANONYMOUS_SKINNED_GUIDE_NOT_FOUNDER_NOT_SPEECH',
  sourceCommit:process.env.URAI_EXACT_HEAD??'unknown',
  phase:'starting',images:[] as Array<{name:string;sha256:string;bytes:number;beforeSeconds:number;afterSeconds:number}>,
  audioAuthority:'nine-second non-speech development waveform, not Council voice',
  approval:{facialVisual:false,fullHuman:false,founderLikeness:false,voice:false,production:false}
 }
 const persist=()=>{
  const path=info.outputPath('unified-original-guide-visual-evidence-partial.json')
  mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(receipt,null,2)+'\n')
 }
 persist()
 await page.goto(new URL('/council?unifiedGuideLab=1',origin).href,{waitUntil:'domcontentloaded',timeout:45000})
 const realm=page.locator('[data-spatial-realm="council"]')
 await expect(realm).toBeVisible({timeout:45000})
 await expect(realm).toHaveAttribute('data-council-unified-guide-lab','true')
 await expect(realm).toHaveAttribute('data-digital-human-integration','original-guide-skinned-head-morph-dev-only-not-approved')
 await expect(realm.locator('canvas')).toBeVisible()
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-morph-bindings')),{timeout:45000}).toBeGreaterThan(0)
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-skinned-owners'))).toBeGreaterThan(0)
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-morph-owners'))).toBeGreaterThan(0)
 await expect(realm).toHaveAttribute('data-council-unified-guide-head-parent','neck')
 // These are the REAL retained Council telemetry keys (without a hyphen before 0).
 await expect.poll(async()=>realm.getAttribute('data-council-idle-active0'),{timeout:20000}).toBe('true')
 await expect.poll(async()=>realm.getAttribute('data-council-listening-active0'),{timeout:20000}).toBe('true')
 await expect(page.getByLabel('Council provider')).toBeVisible()
 await expect(page.locator('[data-provider]')).toHaveAttribute('data-provider','idle')
 const lab=page.getByTestId('anonymous-facial-calibration')
 await expect(lab).toBeVisible()
 await expect(lab).toContainText('NOT Council speech')
 const fetchModel=await page.request.get(new URL('/__digital-human-dev/council-guide-v4-unified-face-receipt.json',origin).href)
 expect(fetchModel.ok()).toBe(true)
 const model=await fetchModel.json()
 expect(model.sourceSha256).toBe('fd71bed01e3216b2b60c88a34bb37465ecd49d331f089ccba830e23df1446756')
 expect(model.oneExistingSkinnedMesh).toBe(true)
 expect(model.originalJoints).toBe(17)
 expect(model.originalClips).toBe(5)
 expect(model.originalMaterialPrimitives).toBe(4)
 expect(model.derivedMorphChannels).toHaveLength(10)
 expect(model.approvedForProduction).toBe(false)
 const glbResponse=await page.request.get(new URL('/__digital-human-dev/council-guide-v4-unified-face.glb',origin).href)
 expect(glbResponse.ok()).toBe(true)
 const glb=Buffer.from(await glbResponse.body())
 expect(sha256(glb)).toBe(model.derivedSha256)
 expect(glb.length).toBe(model.derivedBytes)
 expect(glb.toString('ascii',0,4)).toBe('glTF')
 const jsonLength=glb.readUInt32LE(12)
 const gltf=JSON.parse(glb.subarray(20,20+jsonLength).toString('utf8').trim())
 expect(gltf.meshes).toHaveLength(1)
 expect(gltf.nodes).toHaveLength(19)
 expect(gltf.skins[0].joints).toHaveLength(17)
 expect(gltf.animations).toHaveLength(5)
 expect(gltf.meshes[0].primitives).toHaveLength(4)
 expect(gltf.meshes[0].primitives.every((p:{targets?:unknown[]})=>p.targets?.length===10)).toBe(true)
 Object.assign(receipt,{sourceGlbSha256:model.sourceSha256,derivedGlbSha256:model.derivedSha256,
  derivedBytes:model.derivedBytes,originalNodes:19,originalSkinnedMeshes:1,originalJointCount:17,
  materialPrimitives:4,originalBodyClips:5,morphTargets:10})
 persist()

 const getTime=async()=>Number(await realm.getAttribute('data-council-unified-guide-audio-seconds'))
 const getWeight=async()=>Number(await realm.getAttribute('data-council-unified-guide-morph-max'))
 const capture=async(name:string):Promise<Frame>=>{
  // Capture the original Chromium compositor, with ONLY the development HUD hidden.
  // No synthetic renderer, detached viewer, frozen body frames or fabricated camera.
  const beforeSeconds=await getTime(),beforeWeight=await getWeight()
  const visibility=await lab.evaluate((el:HTMLElement)=>{const previous=el.style.visibility;el.style.visibility='hidden';return previous})
  let bytes:Buffer
  try{
   await page.waitForTimeout(80)
   const session=await page.context().newCDPSession(page)
   try{
    const result=await session.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})
    bytes=Buffer.from(result.data,'base64')
   }finally{await session.detach()}
  }finally{await lab.evaluate((el:HTMLElement,prior:string)=>{el.style.visibility=prior},visibility)}
  if(bytes.length<1000)throw new Error('empty-original-council-webgl-frame')
  const path=info.outputPath(name+'.png')
  mkdirSync(dirname(path),{recursive:true});writeFileSync(path,bytes)
  const frame:Frame={
   name,bytes,sha256:sha256(bytes),beforeSeconds,afterSeconds:await getTime(),
   beforeWeight,afterWeight:await getWeight(),
   cameraX:await realm.getAttribute('data-council-camera-x'),
   cameraZ:await realm.getAttribute('data-council-camera-z')
  }
  ;(receipt.images as Array<{name:string;sha256:string;bytes:number;beforeSeconds:number;afterSeconds:number}>).push({
   name,sha256:frame.sha256,bytes:bytes.length,beforeSeconds,afterSeconds:frame.afterSeconds})
  receipt.phase=name;persist()
  await info.attach(name,{path,contentType:'image/png'})
  return frame
 }
 const readFace=async()=>{
  const keys=['cx','cy','rx','ry']
  const values=await Promise.all(keys.map(key=>realm.getAttribute('data-council-unified-guide-face-'+key)))
  const region=Object.fromEntries(keys.map((key,i)=>[key,Number(values[i])])) as Region
  const visible=await realm.getAttribute('data-council-unified-guide-face-visible')
  const count=Number(await realm.getAttribute('data-council-unified-guide-face-sample-count'))
  const basis=await realm.getAttribute('data-council-unified-guide-face-basis')
  expect(basis).toBe('original-v4-skinned-head-front-vertex-projection')
  expect(count).toBeGreaterThan(40)
  expect(Object.values(region).every(Number.isFinite)).toBe(true)
  return {region,visible,count,basis}
 }

 const originalHead=await realm.getAttribute('data-council-head-x0')
 const neutralStanding=await capture('original-v4-full-body-standing')
 await page.waitForTimeout(700)
 const headAfterIdle=await realm.getAttribute('data-council-head-x0')
 const bodyListening=await capture('original-v4-body-idle-listening-head-motion')
 receipt.originalHeadPoseBefore=originalHead
 receipt.originalHeadPoseAfter=headAfterIdle
 receipt.bodyActionStates={
  idle:await realm.getAttribute('data-council-idle-active0'),
  listening:await realm.getAttribute('data-council-listening-active0')
 }
 receipt.standingSha256=neutralStanding.sha256
 receipt.listeningSha256=bodyListening.sha256
 persist()
 expect(receipt.bodyActionStates).toEqual({idle:'true',listening:'true'})
 // Move closer using ORIGINAL embodied WASD, then release the keys.
 // No test-only camera override: the character remains in the actual chamber.
 let measured=await readFace()
 for(let step=0;step<7&&(measured.visible!=='true'||measured.region.rx<16||measured.region.ry<16);step++){
  await page.keyboard.down('w')
  await page.waitForTimeout(900)
  await page.keyboard.up('w')
  await page.waitForTimeout(400)
  measured=await readFace()
 }
 expect(measured.visible).toBe('true')
 expect(measured.region.rx).toBeGreaterThan(15)
 expect(measured.region.ry).toBeGreaterThan(15)
 // Baseline and frozen face comparisons deliberately use reduced motion
 // to isolate vertex deformation from unrelated body/head animation.
 // Full-body idle/listening has already run and been recorded above.
 await page.emulateMedia({reducedMotion:'reduce'})
 await expect.poll(async()=>realm.getAttribute('data-council-idle-active0'),{timeout:15000}).toBe('false')
 await expect.poll(async()=>realm.getAttribute('data-council-listening-active0')).toBe('false')
 await page.waitForTimeout(700)
 const stable=await readFace()
 expect(stable.visible).toBe('true')
 const face:Region=stable.region
 const xOffset=Math.max(70,2.5*face.rx)
 const controlX=face.cx+xOffset+face.rx<1280?face.cx+xOffset:face.cx-xOffset
 const background:Region={...face,cx:controlX}
 receipt.faceRoi={...stable,background,method:'original live skinned head FRONT vertices including bone and morph transforms'}
 persist()
 const neutralFace=await capture('original-v4-face-neutral-for-geometry-comparison')
 await lab.getByTestId('calibration-slow').click()
 await lab.getByTestId('calibration-play').click()
 await expect.poll(getWeight,{timeout:20000}).toBeGreaterThan(.3)
 const activeFace=await capture('original-v4-one-body-head-audio-deforming')
 expect(activeFace.beforeSeconds).toBeGreaterThan(.18)
 expect(activeFace.afterSeconds).toBeGreaterThan(activeFace.beforeSeconds)
 expect(activeFace.afterSeconds).toBeLessThan(8)
 expect(activeFace.beforeWeight).toBeGreaterThan(.3)
 expect(activeFace.afterWeight).toBeGreaterThan(.3)
 const positive=await compareChromiumPngRegion(neutralFace.bytes,activeFace.bytes,face)
 const backgroundPositive=await compareChromiumPngRegion(neutralFace.bytes,activeFace.bytes,background)
 receipt.positiveFace=positive;receipt.positiveBackground=backgroundPositive;receipt.phase='positive-original-skinned-head-measured';persist()
 expect(positive.checked).toBeGreaterThan(400)
 expect(positive.changed).toBeGreaterThan(20)
 expect(positive.meanRgbDelta).toBeGreaterThan(1)
 expect(positive.meanRgbDelta).toBeGreaterThan(backgroundPositive.meanRgbDelta*1.2)
 // Pause and seek are still real HTMLAudioElement operations and must neutralize.
 await lab.getByTestId('calibration-pause').click()
 await expect.poll(getWeight).toBe(0)
 await lab.getByRole('slider',{name:'Calibration audio seek'}).fill('0.45')
 await lab.getByTestId('calibration-stop').click({force:true,timeout:12000})
 await expect.poll(getWeight).toBe(0)
 await lab.getByTestId('calibration-freeze').click()
 const frozenNeutral=await capture('original-v4-frozen-face-neutral')
 await lab.getByTestId('calibration-play').click()
 await expect.poll(getTime,{timeout:20000}).toBeGreaterThan(.3)
 await expect.poll(getWeight).toBe(0)
 const frozenDuring=await capture('original-v4-frozen-face-with-real-audio-advancing')
 expect(frozenDuring.afterSeconds).toBeGreaterThan(frozenDuring.beforeSeconds)
 expect(frozenDuring.beforeWeight).toBe(0)
 expect(frozenDuring.afterWeight).toBe(0)
 const negative=await compareChromiumPngRegion(frozenNeutral.bytes,frozenDuring.bytes,face)
 const backgroundFrozen=await compareChromiumPngRegion(frozenNeutral.bytes,frozenDuring.bytes,background)
 receipt.negativeFace=negative;receipt.negativeBackground=backgroundFrozen;receipt.phase='frozen-original-skinned-head-measured';persist()
 expect(negative.checked).toBeGreaterThan(400)
 expect(negative.changed).toBeLessThan(Math.max(20,positive.changed*.40))
 expect(negative.meanRgbDelta).toBeLessThan(Math.max(1,positive.meanRgbDelta*.40))
 await lab.getByTestId('calibration-mute').click()
 await expect.poll(getWeight).toBe(0)
 await lab.getByTestId('calibration-stop').click({force:true,timeout:12000})
 await lab.getByTestId('calibration-freeze').click()
 await expect.poll(getWeight).toBe(0)
 const stopped=await capture('original-v4-full-character-stopped-neutral')
 receipt.phase='passed-real-original-council-unified-visual-cleanup'
 receipt.stoppedFrameSha256=stopped.sha256
 receipt.errors=errors
 persist()
 await info.attach('unified-original-guide-browser-evidence',{
  body:JSON.stringify(receipt,null,2),contentType:'application/json'
 })
 expect(errors).toEqual([])
})
