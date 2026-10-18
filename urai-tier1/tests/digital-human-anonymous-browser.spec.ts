import {test,expect} from '@playwright/test'
const origin=process.env.URAI_PROOF_BASE_URL || 'http://127.0.0.1:4290'
test.use({viewport:{width:1280,height:800},reducedMotion:'reduce'})
type Region={cx:number;cy:number;rx:number;ry:number}
type CanvasCaptureBounds={
 clip:{x:number;y:number;width:number;height:number}
 offsetX:number;offsetY:number
}
async function measureCanvasViewport(canvas:any):Promise<CanvasCaptureBounds>{
 // Read the real renderer element's geometry without locator screenshot actionability waits.
 return canvas.evaluate((element:HTMLCanvasElement)=>{
  const rect=element.getBoundingClientRect()
  const left=Math.max(0,Math.floor(rect.left)),top=Math.max(0,Math.floor(rect.top))
  const right=Math.min(window.innerWidth,Math.ceil(rect.right))
  const bottom=Math.min(window.innerHeight,Math.ceil(rect.bottom))
  if(!Number.isFinite(rect.width)||!Number.isFinite(rect.height)||right-left<80||bottom-top<80)
   throw new Error('original-webgl-canvas-not-visible-in-fixed-viewport')
  return {
   clip:{x:left+window.scrollX,y:top+window.scrollY,width:right-left,height:bottom-top},
   offsetX:left-rect.left,offsetY:top-rect.top
  }
 })
}
async function captureOriginalWebGLFrame(page:any,bounds:CanvasCaptureBounds){
 // The screenshot is of the actual Chromium page, explicitly cropped to the
 // original WebGL canvas. Unlike locator.screenshot it does not scroll or wait
 // for a continuously rendered canvas to become element-actionability-stable.
 const began=Date.now()
 const bytes:Buffer=await page.screenshot({
  clip:bounds.clip,scale:'css',animations:'allow',timeout:7000
 })
 return {bytes,elapsedMs:Date.now()-began}
}

async function compareRenderedFace(page:any,neutral:Buffer,animated:Buffer,region:Region){
 // Decode ACTUAL Chromium screenshots inside Chromium and compare pixels, not DOM/CSS.
 return page.evaluate(async({a,b,r}:{a:string;b:string;r:Region})=>{
  const decode=async(base64:string)=>{
   const blob=await (await fetch('data:image/png;base64,'+base64)).blob()
   const bmp=await createImageBitmap(blob)
   const cv=document.createElement('canvas');cv.width=bmp.width;cv.height=bmp.height
   const ctx=cv.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('no-2d-context')
   ctx.drawImage(bmp,0,0);return {data:ctx.getImageData(0,0,bmp.width,bmp.height).data,width:bmp.width,height:bmp.height}
  }
  const before=await decode(a),after=await decode(b)
  if(before.width!==after.width || before.height!==after.height)throw Error('screenshot-size-mismatch')
  const cx=r.cx,cy=r.cy
  const left=Math.max(0,Math.floor(cx-r.rx)),right=Math.min(before.width,Math.ceil(cx+r.rx))
  const top=Math.max(0,Math.floor(cy-r.ry)),bottom=Math.min(before.height,Math.ceil(cy+r.ry))
  if(right-left<28||bottom-top<28)throw Error('face-roi-not-visible')
  let changed=0,delta=0,checked=0
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
   const dx=(x-cx)/r.rx,dy=(y-cy)/r.ry
   if(dx*dx+dy*dy>1)continue
   const i=4*(y*before.width+x)
   const value=Math.abs(before.data[i]-after.data[i])+Math.abs(before.data[i+1]-after.data[i+1])+Math.abs(before.data[i+2]-after.data[i+2])
   delta+=value;checked++;if(value>42)changed++
  }
  return {changed,checked,meanRgbDelta:checked?delta/checked:0,roi:{left,top,right,bottom}}
 },{a:neutral.toString('base64'),b:animated.toString('base64'),r:region})
}
test('original Council WebGL visually changes actual anonymous facial mesh during audible media playback',async({page},info)=>{
 test.setTimeout(120000) // first Next cold boot plus four real Chromium captures
 const errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(new URL('/council?anonymousFaceLab=1',origin).href,{waitUntil:'domcontentloaded',timeout:45000})
 const realm=page.locator('[data-spatial-realm="council"]')
 await expect(realm).toBeVisible({timeout:45000})
 const canvas=realm.locator('canvas');await expect(canvas).toBeVisible({timeout:45000})
 const lab=page.getByTestId('anonymous-facial-calibration')
 await expect(lab).toBeVisible({timeout:45000})
 await expect(lab).toHaveAttribute('data-identity','anonymous-nonproduction-not-founder')
 const telemetry=page.getByTestId('calibration-telemetry')
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-morph-bindings')),{timeout:20000}).toBeGreaterThan(0)
 await expect(telemetry).toHaveAttribute('data-face-visible','true')
 // Actual 3D fixture remains in same camera viewport; no camera navigation during capture.
 await page.waitForTimeout(400)
 const face:Region={
  cx:Number(await telemetry.getAttribute('data-face-cx')),cy:Number(await telemetry.getAttribute('data-face-cy')),
  rx:Number(await telemetry.getAttribute('data-face-rx')),ry:Number(await telemetry.getAttribute('data-face-ry'))
 }
 const bounds=await measureCanvasViewport(canvas)
 const captureFace:Region={...face,cx:face.cx-bounds.offsetX,cy:face.cy-bounds.offsetY}
 // Slowing this non-speech fixture's real HTMLAudioElement playback rate keeps
 // the 0.18-0.63 second morph interval observable through macOS GPU screenshots.
 // The value below is the real browser audio playback rate, not fabricated time.
 await page.getByTestId('calibration-slow').click()
 await expect(telemetry).toHaveAttribute('data-audio-playback-rate','0.1')
 const playbackRate=Number(await telemetry.getAttribute('data-audio-playback-rate'))
 const neutralCapture=await captureOriginalWebGLFrame(page,bounds)
 const neutral=neutralCapture.bytes
 await page.getByTestId('calibration-play').click()
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-max-weight')),{timeout:12000}).toBeGreaterThan(.32)
 const mediaTime=Number(await telemetry.getAttribute('data-time'))
 expect(mediaTime).toBeGreaterThan(.18)
 const activeBefore={time:Number(await telemetry.getAttribute('data-time')),weight:Number(await telemetry.getAttribute('data-max-weight'))}
 const animatedCapture=await captureOriginalWebGLFrame(page,bounds)
 const animated=animatedCapture.bytes
 const activeAfter={time:Number(await telemetry.getAttribute('data-time')),weight:Number(await telemetry.getAttribute('data-max-weight'))}
 // A 2.3s actual audible sample must still be inside its non-neutral mouth interval
 // when captured. A late neutral frame cannot be misreported as animation.
 expect(activeBefore.weight).toBeGreaterThan(.32)
 expect(activeBefore.time).toBeGreaterThan(.18)
 expect(activeAfter.time).toBeLessThan(.73)
 const diff=await compareRenderedFace(page,neutral,animated,captureFace)
 // Actual screenshot region MUST change, not merely a reported morph weight.
 expect(diff.checked).toBeGreaterThan(400)
 expect(diff.changed).toBeGreaterThan(20)
 expect(diff.meanRgbDelta).toBeGreaterThan(1)
 await info.attach('anonymous-face-neutral-render.png',{body:neutral,contentType:'image/png'})
 await info.attach('anonymous-face-animated-render.png',{body:animated,contentType:'image/png'})
 // Negative control uses the SAME 2.3-second audible fixture with facial targets forced neutral.
 // This compares pixels from the ACTUAL Council WebGL canvas, not a synthetic DOM mock.
 await page.getByTestId('calibration-stop').click()
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-max-weight'))).toBe(0)
 await page.getByTestId('calibration-freeze').click()
 await expect(telemetry).toHaveAttribute('data-morphs-frozen','true')
 await page.waitForTimeout(250)
 const frozenNeutralCapture=await captureOriginalWebGLFrame(page,bounds)
 const frozenNeutral=frozenNeutralCapture.bytes
 await page.getByTestId('calibration-play').click()
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-time')),{timeout:12000}).toBeGreaterThan(.25)
 await expect(telemetry).toHaveAttribute('data-playing','true')
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-max-weight'))).toBe(0)
 const frozenBefore=Number(await telemetry.getAttribute('data-time'))
 const frozenPlayingCapture=await captureOriginalWebGLFrame(page,bounds)
 const frozenPlaying=frozenPlayingCapture.bytes
 const frozenAfter=Number(await telemetry.getAttribute('data-time'))
 expect(frozenBefore).toBeGreaterThan(.25)
 expect(frozenAfter).toBeLessThan(2.3)
 const negative=await compareRenderedFace(page,frozenNeutral,frozenPlaying,captureFace)
 expect(negative.checked).toBeGreaterThan(400)
 expect(negative.changed).toBeLessThan(Math.max(20,diff.changed*.40))
 expect(negative.meanRgbDelta).toBeLessThan(Math.max(1,diff.meanRgbDelta*.40))
 await info.attach('anonymous-face-frozen-neutral.png',{body:frozenNeutral,contentType:'image/png'})
 await info.attach('anonymous-face-frozen-playing.png',{body:frozenPlaying,contentType:'image/png'})
 await page.getByTestId('calibration-stop').click()
 await page.getByTestId('calibration-freeze').click()
 await expect(telemetry).toHaveAttribute('data-morphs-frozen','false')
 await page.getByTestId('calibration-mute').click()
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-max-weight'))).toBe(0)
 await page.getByTestId('calibration-mute').click()
 await page.getByTestId('calibration-pause').click()
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-max-weight'))).toBe(0)
 await page.getByLabel('Calibration audio seek').evaluate((element:HTMLInputElement)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;setter?.call(element,'1.36');element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}))})
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-time'))).toBeGreaterThan(1.3)
 await page.getByTestId('calibration-play').click()
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-max-weight')),{timeout:10000}).toBeGreaterThan(.05)
 await page.getByTestId('calibration-stop').click()
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-max-weight'))).toBe(0)
 await info.attach('anonymous-face-render-proof.json',{body:JSON.stringify({classification:'ORIGINAL_COUNCIL_WEBGL_ANONYMOUS_TONE_ONLY_NOT_SPEECH',head:process.env.URAI_EXACT_HEAD??'unknown',assetSha256:'3a6a44f9a2d7a666c15cb345852977c663d17f688eec8816def2237a53fd16bc',face,canvasCrop:bounds,captureFace,mediaTime,playbackRate,activeBefore,activeAfter,frozenBefore,frozenAfter,positiveCaptureMs:animatedCapture.elapsedMs,negativeCaptureMs:frozenPlayingCapture.elapsedMs,diff,negative,errors}),contentType:'application/json'})
 expect(errors).toEqual([])
})
test('production route omits fixture without explicit URL opt-in',async({page})=>{
 await page.goto(new URL('/council',origin).href,{waitUntil:'domcontentloaded',timeout:45000})
 await expect(page.locator('[data-spatial-realm="council"]')).toBeVisible({timeout:45000})
 await expect(page.getByTestId('anonymous-facial-calibration')).toHaveCount(0)
})
