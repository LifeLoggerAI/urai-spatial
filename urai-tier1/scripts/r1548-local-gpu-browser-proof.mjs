import { chromium } from 'playwright'
import { compareChromiumPngRegion } from '../tests/digital-human-png-comparison.mjs'
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const base=process.env.URAI_PROOF_BASE_URL || 'http://127.0.0.1:4398'
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error('LOCALHOST_ONLY_REVIEW_PROOF')
const result={schema:'urai-r1548-native-browser-v1',mode:'isolated-local-review',base,home:{},council:{},errors:[],production:false}
const browser=await chromium.launch({executablePath:process.env.URAI_BROWSER_EXECUTABLE || undefined,headless:true,args:['--no-sandbox','--use-angle=vulkan','--enable-features=Vulkan','--disable-software-rasterizer','--ignore-gpu-blocklist']})
const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'})
page.on('pageerror',e=>result.errors.push('pageerror:'+e.message))
page.on('console',m=>{if(m.type()==='error')result.errors.push('console:'+m.text().slice(0,160))})
const resources=[]
page.on('response',r=>{if(r.url().includes('.splat')||r.url().includes('anonymous-face-morph-v1.glb'))resources.push({path:new URL(r.url()).pathname,status:r.status()})})
function sha(buf){return createHash('sha256').update(buf).digest('hex')}
async function gpuInfo(){return page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return {canvas:false};const gl=c.getContext('webgl2')||c.getContext('webgl');if(!gl)return {canvas:true,gl:false};const x=gl.getExtension('WEBGL_debug_renderer_info');return {canvas:true,gl:true,renderer:x?gl.getParameter(x.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)}})}
try {
await page.goto(base+'/home',{waitUntil:'domcontentloaded',timeout:25000})
await page.waitForTimeout(2200)
result.home={route:await page.title(),gpu:await gpuInfo(),webglWorld:await page.locator('[data-home-primary-owner="asset-driven"]').count(),canvas:await page.locator('canvas').count(),splatResponses:[...resources]}
const home=await page.screenshot({path:'/tmp/urai-r1548-home.png'})
result.home.screenshotSha256=sha(home)
await page.goto(base+'/council?anonymousFaceLab=1',{waitUntil:'domcontentloaded',timeout:25000})
await page.getByTestId('anonymous-facial-calibration').waitFor({state:'visible',timeout:18000})
await page.waitForTimeout(1500)
const telemetry=page.getByTestId('calibration-telemetry')
result.council.before={gpu:await gpuInfo(),avatarNodes:await page.locator('canvas').count(),morphBindings:await telemetry.getAttribute('data-morph-bindings'),faceVisible:await telemetry.getAttribute('data-face-visible'),resources:[...resources]}
const faceRegion=await page.evaluate(()=>{
 const el=document.querySelector('[data-testid="calibration-telemetry"]')
 const canvas=document.querySelector('[data-spatial-realm="council"] canvas')||document.querySelector('canvas')
 const rect=canvas?.getBoundingClientRect()
 const v=(n)=>Number(el?.getAttribute('data-face-'+n)||0)
 return {cx:v('cx')+(rect?.left||0),cy:v('cy')+(rect?.top||0),rx:v('rx'),ry:v('ry')}
})
result.council.faceRegion=faceRegion
const neutral=await page.screenshot({path:'/tmp/urai-r1548-face-neutral.png'})
await page.getByTestId('calibration-play').click()
await page.waitForFunction(()=>Number(document.querySelector('[data-testid="calibration-telemetry"]')?.getAttribute('data-max-weight')||0)>.32,null,{timeout:13000})
result.council.during={weight:await telemetry.getAttribute('data-max-weight'),time:await telemetry.getAttribute('data-time'),playing:await telemetry.getAttribute('data-playing'),faceVisible:await telemetry.getAttribute('data-face-visible'),resources:[...resources]}
const active=await page.screenshot({path:'/tmp/urai-r1548-face-active.png'})
result.council.screenshotSha256={neutral:sha(neutral),active:sha(active)}
result.council.pixelComparison=compareChromiumPngRegion(neutral,active,faceRegion)
await page.getByTestId('calibration-stop').click()
await page.waitForFunction(()=>Number(document.querySelector('[data-testid="calibration-telemetry"]')?.getAttribute('data-max-weight')||0)===0,null,{timeout:9000})
result.council.after={weight:await telemetry.getAttribute('data-max-weight')}
result.council.proof=result.council.before.gpu?.gl===true&&Number(result.council.before.morphBindings)>0&&Number(result.council.during.weight)>.32&&result.council.during.playing==='true'&&result.council.pixelComparison.changed>20&&result.council.pixelComparison.meanRgbDelta>1&&result.council.after.weight==='0'
}catch(e){result.failure=String(e)}
finally{await browser.close();writeFileSync('/tmp/urai-r1548-native-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result))}
