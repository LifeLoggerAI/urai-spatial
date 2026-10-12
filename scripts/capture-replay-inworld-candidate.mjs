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
const result={exactHead:sha,admission:false,results:[],failures:[]}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox']})
try {
 for(const profile of [{id:'desktop',width:1440,height:900,reduce:false,preview:true},{id:'mobile-reduced',width:390,height:844,reduce:true,preview:true},{id:'default',width:1440,height:900,reduce:false,preview:false}]){
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
    await page.waitForTimeout(1500)
    assert.equal(await scene.getAttribute('data-replay-candidate-model'),null)
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
  }catch(e){result.failures.push({profile:profile.id,error:String(e),pageErrors:errors})}
  finally{result.results.push(info);await context.close()}
 }
}finally{await browser.close()}
await writeFile(path.join(out,'receipt.json'),JSON.stringify(result,null,2)+'\n')
if(result.failures.length)process.exitCode=1
