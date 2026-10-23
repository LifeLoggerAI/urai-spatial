#!/usr/bin/env node
// Browser-art evidence for real original UrAi Home, never a production approval.
// Requires exact, locally staged Poly Haven CC0 source, signed-in Home when needed.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { readFile, readdir, lstat, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const HOME_CC0_EXPECTED = [
  'ground/color.jpg','ground/normal.jpg','ground/roughness.jpg',
  'path/color.jpg','path/normal.jpg','path/roughness.jpg',
  'shrub/shrub_03_1k.gltf','shrub/shrub_03.bin',
  'shrub/textures/shrub_03_arm_1k.jpg','shrub/textures/shrub_03_diff_1k.jpg',
  'shrub/textures/shrub_03_nor_gl_1k.jpg',
]
const prefix='/assets/urai/home-production/cc0-review/'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const manifestPath=join(root,'operations/assets/candidates/home-polyhaven-cc0-dev-review-1.json')
const stageDir=join(root,'urai-tier1/public/assets/urai/home-production/cc0-review')
export const hash=(bytes)=>createHash('sha256').update(bytes).digest('hex')
export function parseReviewArgs(args) {
  const options={port:3107,ack:false}
  for(const arg of args) {
    if(arg==='--acknowledge-nonproduction') options.ack=true
    else if(/^--port=[0-9]{4,5}$/.test(arg)) options.port=Number(arg.slice(7))
    else throw Error('UNAUTHORIZED_REVIEW_ARGUMENT:'+arg)
  }
  if(!options.ack) throw Error('NONPRODUCTION_ACKNOWLEDGEMENT_REQUIRED')
  if(!Number.isSafeInteger(options.port)||options.port<1024||options.port>65535) throw Error('INVALID_REVIEW_PORT')
  return options
}
export function validateReviewManifest(m) {
  assert.equal(m.schema,'urai-home-polyhaven-cc0-dev-review-1')
  assert.equal(m.classification,'NONPRODUCTION_CANDIDATE_UNAPPROVED')
  assert.equal(m.license,'CC0-1.0')
  assert.equal(m.releaseApproved,false)
  assert.equal(m.reviewApproved,false)
  assert.deepEqual(m.files.map(f=>f.path),HOME_CC0_EXPECTED)
  for(const f of m.files) {
    assert.match(f.url,/^https:\/\/dl\.polyhaven\.org\/file\/ph-assets\//)
    assert.match(f.md5,/^[0-9a-f]{32}$/)
    assert.ok(Number.isSafeInteger(f.bytes)&&f.bytes>0&&f.bytes<=5000000)
  }
}
export function authorizedResource(url,origin) {
  try {
    const u=new URL(url)
    if(u.origin!==origin||u.search||u.hash||u.username||u.password) return null
    if(!u.pathname.startsWith(prefix)) return null
    const rel=u.pathname.slice(prefix.length)
    return HOME_CC0_EXPECTED.includes(rel)?rel:null
  } catch { return null }
}
async function validateStage(manifest) {
  const directory=await lstat(stageDir)
  assert.ok(directory.isDirectory()&&!directory.isSymbolicLink())
  const names=[]
  async function walk(p,relative='') {
    for(const item of await readdir(p,{withFileTypes:true})) {
      const rel=relative+item.name, loc=join(p,item.name)
      if(item.isSymbolicLink()) throw Error('REVIEW_STAGE_SYMLINK:'+rel)
      if(item.isDirectory()) await walk(loc,rel+'/')
      else if(item.isFile()) names.push(rel)
      else throw Error('INVALID_STAGE_ENTRY:'+rel)
    }
  }
  await walk(stageDir)
  assert.deepEqual(names.sort(),[...HOME_CC0_EXPECTED].sort(),'Missing/extra staged CC0 binaries')
  const receipt=[]
  for(const item of manifest.files) {
    const loc=join(stageDir,...item.path.split('/'))
    const bytes=await readFile(loc)
    if(bytes.length!==item.bytes||createHash('md5').update(bytes).digest('hex')!==item.md5) throw Error('CC0_BYTES_MISMATCH:'+item.path)
    receipt.push({path:item.path,bytes:bytes.length,sha256:hash(bytes),md5:item.md5})
  }
  return receipt
}
export function evidenceGate(home,assets,errors,pixels) {
  const reasons=[]
  if(!home?.originalOwner||home.ready!=='true'||home.frameCount<4||!home.gl) reasons.push('ORIGINAL_HOME_WEBGL_NOT_PROVEN')
  if(home?.binding!=='scene-bound-candidate'||home.ground<1||home.paths<3||home.shrubs<1) reasons.push('VISIBLE_PHOTO_SCENE_BINDING_NOT_PROVEN')
  if(!Number.isFinite(home?.yaw)||!Number.isFinite(home?.pitch)) reasons.push('CAMERA_EVIDENCE_ABSENT')
  for(const file of HOME_CC0_EXPECTED) {
    if(!assets.some(x=>x.path===file&&x.status===200&&x.md5Verified)) reasons.push('UNVERIFIED_BROWSER_BINARY:'+file)
  }
  if(errors.length) reasons.push('BROWSER_RUNTIME_ERRORS')
  if(!pixels||pixels.byteLength<4096) reasons.push('RENDERED_PNG_NOT_PROVEN')
  return {passed:reasons.length===0,reasons}
}
export function movementGate(a,b,before,after,kind) {
  if(!before||!after||hash(before)===hash(after)) return false
  if(kind==='yaw'||kind==='pitch') return Number.isFinite(a?.[kind])&&Number.isFinite(b?.[kind])&&Math.abs(a[kind]-b[kind])>=.025
  if(kind==='walk') return Number.isFinite(a?.x)&&Number.isFinite(a?.z)&&Number.isFinite(b?.x)&&Number.isFinite(b?.z)&&Math.hypot(a.x-b.x,a.z-b.z)>=.08
  return false
}
async function dom(page) {
  return page.evaluate(()=>{
    const e=document.querySelector('[data-home-primary-owner="asset-driven"]')
    const canvas=e?.querySelector('canvas')
    let gl=false
    try { gl=Boolean(canvas?.getContext('webgl2')||canvas?.getContext('webgl')) } catch {}
    const num=(attribute)=> { const value=e?.getAttribute(attribute);return value===null?NaN:Number(value) }
    return {
      originalOwner:Boolean(e),ready:e?.getAttribute('data-home-assets-ready'),
      frameCount:num('data-home-rendered-frames'),gl,
      binding:e?.getAttribute('data-home-cc0-scene-binding'),
      ground:num('data-home-cc0-photo-ground-meshes'),
      paths:num('data-home-cc0-photo-path-meshes'),
      shrubs:num('data-home-cc0-photo-shrub-meshes'),
      yaw:num('data-home-cc0-actual-yaw'),pitch:num('data-home-cc0-actual-pitch'),
      x:num('data-home-player-x'),z:num('data-home-player-z'),
      pathname:location.pathname,phase:e?.getAttribute('data-home-scene-phase'),
      sceneReasons:e?.getAttribute('data-home-cc0-scene-reasons'),
    }
  })
}
async function runViewport(browser,item,origin,dir,manifest) {
  const ctx=await browser.newContext({viewport:item.size,deviceScaleFactor:1,reducedMotion:item.reduce?'reduce':'no-preference'})
  const page=await ctx.newPage()
  const errors=[],pending=[]
  const mapped=new Map(manifest.files.map(f=>[f.path,f]))
  page.on('pageerror',e=>errors.push('PAGEERROR:'+String(e.message)))
  page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE:'+m.text())})
  page.on('crash',()=>errors.push('PAGE_CRASH'))
  page.on('response',r=>{
    const rel=authorizedResource(r.url(),origin)
    if(!rel)return
    pending.push((async()=>{
      try {
        const bytes=await r.body(), expected=mapped.get(rel)
        return {path:rel,status:r.status(),length:bytes.length,md5Verified:r.status()===200&&bytes.length===expected.bytes&&createHash('md5').update(bytes).digest('hex')===expected.md5}
      } catch(e){return {path:rel,status:r.status(),md5Verified:false,error:String(e)}}
    })())
  })
  const report={mode:item.name,reducedMotion:!!item.reduce,size:item.size,finalArtApproved:false,releaseApproved:false}
  try {
    try { await page.goto(origin+'/home/?homeAssetReview=1',{waitUntil:'domcontentloaded',timeout:45000}) }
    catch(e) { report.navigationError=String(e) }
    try {
      await page.locator('[data-home-primary-owner="asset-driven"][data-home-assets-ready="true"][data-home-cc0-scene-binding="scene-bound-candidate"]').waitFor({timeout:55000})
    } catch { /* A failed auth or rendering gate must remain blocked. */ }
    await page.waitForTimeout(600)
    const home=await dom(page)
    const assets=await Promise.all(pending)
    const before=await page.screenshot({path:join(dir,item.name+'.png'),timeout:45000}).catch(()=>null)
    report.home=home;report.assets=assets;report.errors=errors
    report.screenshot=before?{name:item.name+'.png',bytes:before.length,sha256:hash(before)}:null
    report.resource=evidenceGate(home,assets,errors,before)
    if(item.name==='desktop'&&report.resource.passed) {
      const box=await page.locator('[data-home-primary-owner="asset-driven"] canvas').first().boundingBox()
      if(box) {
        await page.mouse.move(box.x+box.width*.25,box.y+box.height*.45)
        await page.mouse.down()
        await page.mouse.move(box.x+box.width*.70,box.y+box.height*.45,{steps:12})
        await page.mouse.up()
        await page.waitForTimeout(550)
        const rotated=await dom(page),rotatedPNG=await page.screenshot({path:join(dir,'desktop-look.png')})
        const yawPassed=movementGate(home,rotated,before,rotatedPNG,'yaw')
        await page.keyboard.down('w')
        await page.waitForTimeout(850)
        await page.keyboard.up('w')
        await page.waitForTimeout(200)
        const walked=await dom(page),walkPNG=await page.screenshot({path:join(dir,'desktop-walk.png')})
        const walkPassed=movementGate(rotated,walked,rotatedPNG,walkPNG,'walk')
        await page.mouse.move(box.x+box.width*.34,box.y+box.height*.75)
        await page.mouse.down()
        await page.mouse.move(box.x+box.width*.34,box.y+box.height*.18,{steps:12})
        await page.mouse.up()
        await page.waitForTimeout(550)
        const sky=await dom(page),skyPNG=await page.screenshot({path:join(dir,'desktop-sky.png')})
        const skyPassed=movementGate(walked,sky,walkPNG,skyPNG,'pitch')
        report.movement={yawPassed,walkPassed,skyPassed,
          before:home,afterLook:rotated,afterWalk:walked,afterSky:sky,
          pictures:['desktop-look.png','desktop-walk.png','desktop-sky.png']}
      }
      if(!report.movement?.yawPassed||!report.movement?.walkPassed||!report.movement?.skyPassed) report.resource={passed:false,reasons:[...report.resource.reasons,'REAL_PLAYER_AND_CAMERA_MOVEMENT_NOT_PROVEN']}
    }
  }catch(e){report.browserError=String(e?.stack??e)}
  await ctx.close()
  if (report.navigationError || errors.length) {
    const reasons = [...(report.resource?.reasons ?? [])]
    if (report.navigationError) reasons.push('ORIGINAL_HOME_NAVIGATION_FAILED')
    if (errors.length) reasons.push('BROWSER_RUNTIME_ERRORS_AFTER_CAPTURE')
    report.resource = { passed:false, reasons:[...new Set(reasons)] }
  }
  report.passed=Boolean(report.resource?.passed&&!report.browserError&&!report.navigationError)
  return report
}
export async function runHomeCC0BrowserProof(options) {
  const date=new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14)
  // A fresh isolated clone has no artifacts/ directory. Create it before
  // opening the evidence receipt, but do not overwrite an existing run.
  const evidenceRoot=join(root,'artifacts')
  await mkdir(evidenceRoot,{recursive:true})
  const folder=join(evidenceRoot,'home-cc0-proof-'+date+'-'+process.pid)
  await mkdir(folder,{recursive:false})
  const git=(...args)=>{try{return execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim()}catch{return 'UNAVAILABLE'}}
  const report={schema:'urai-home-cc0-real-browser-proof-v2',recordedAt:new Date().toISOString(),sourceHead:git('rev-parse','HEAD'),sourceBranch:git('branch','--show-current'),status:'BLOCKED_NO_ART_APPROVAL',releaseApproved:false,founderApproved:false,providerSpend:false,views:[]}
  try {
    // Manifest and staged asset failures MUST be caught and recorded in JSON;
    // they are not reasons to abort without a useful receipt.
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'))
    validateReviewManifest(manifest)
    report.staged=await validateStage(manifest)
    const {chromium}=createRequire(join(root,'urai-tier1/package.json'))('playwright')
    const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
    try {
      const origin='http://127.0.0.1:'+options.port
      for(const item of [
        {name:'desktop',size:{width:1440,height:900}},
        {name:'mobile-portrait',size:{width:390,height:844}},
        {name:'mobile-landscape',size:{width:844,height:390}},
        {name:'reduced-motion',size:{width:1440,height:900},reduce:true},
      ]) report.views.push(await runViewport(browser,item,origin,folder,manifest))
    }finally{await browser.close()}
    if(report.views.length===4&&report.views.every(x=>x.passed)) report.status='BROWSER_RESOURCE_PASS__HUMAN_ART_APPROVAL_PENDING'
  }catch(e){report.error=String(e?.stack??e)}
  report.receipt=join(folder,'receipt.json')
  await writeFile(report.receipt,JSON.stringify(report,null,2))
  return report
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let options
  try{options=parseReviewArgs(process.argv.slice(2))}catch(e){console.error(String(e));process.exit(2)}
  const receipt=await runHomeCC0BrowserProof(options)
  console.log('URAI_HOME_CC0_BROWSER_RECEIPT='+receipt.receipt)
  console.log('URAI_HOME_CC0_STATUS='+receipt.status)
  console.log('FINAL_ART_APPROVED=false RELEASE=NO-GO')
  if(receipt.status!=='BROWSER_RESOURCE_PASS__HUMAN_ART_APPROVAL_PENDING')process.exitCode=1
}
