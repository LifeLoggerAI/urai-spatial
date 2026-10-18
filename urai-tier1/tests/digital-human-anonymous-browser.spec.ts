import {test,expect} from '@playwright/test'
const origin=process.env.URAI_PROOF_BASE_URL || 'http://127.0.0.1:4290'
test.use({viewport:{width:1280,height:800},reducedMotion:'reduce'})
type Region={cx:number;cy:number;rx:number;ry:number}
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
 const neutral=await canvas.screenshot()
 await page.getByTestId('calibration-play').click()
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-max-weight')),{timeout:12000}).toBeGreaterThan(.32)
 const mediaTime=Number(await telemetry.getAttribute('data-time'))
 expect(mediaTime).toBeGreaterThan(.18)
 const animated=await canvas.screenshot()
 const diff=await compareRenderedFace(page,neutral,animated,face)
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
 const frozenNeutral=await canvas.screenshot()
 await page.getByTestId('calibration-play').click()
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-time')),{timeout:12000}).toBeGreaterThan(.25)
 await expect(telemetry).toHaveAttribute('data-playing','true')
 await expect.poll(async()=>Number(await telemetry.getAttribute('data-max-weight'))).toBe(0)
 const frozenPlaying=await canvas.screenshot()
 const negative=await compareRenderedFace(page,frozenNeutral,frozenPlaying,face)
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
 await info.attach('anonymous-face-render-proof.json',{body:JSON.stringify({classification:'ORIGINAL_COUNCIL_WEBGL_ANONYMOUS_TONE_ONLY_NOT_SPEECH',head:process.env.URAI_EXACT_HEAD??'unknown',face,mediaTime,diff,negative,errors}),contentType:'application/json'})
 expect(errors).toEqual([])
})
test('production route omits fixture without explicit URL opt-in',async({page})=>{
 await page.goto(new URL('/council',origin).href,{waitUntil:'domcontentloaded',timeout:45000})
 await expect(page.locator('[data-spatial-realm="council"]')).toBeVisible({timeout:45000})
 await expect(page.getByTestId('anonymous-facial-calibration')).toHaveCount(0)
})
