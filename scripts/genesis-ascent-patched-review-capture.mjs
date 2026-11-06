#!/usr/bin/env node
/**
 * Review-only recording of genuine patched UrAi Home -> LifeMap sky Ascent.
 * Must run in an authorized browser capable of recording video, on a rebuilt
 * exact source checkout. Never routes around browser restrictions, or publishes.
 */
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, mkdir, copyFile, writeFile, lstat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beginAscentCameraSampler, bindAscentTelemetryToVideo } from './genesis-ascent-camera-sampler.mjs'

const exec = promisify(execFile)
const thisFile = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(thisFile), '..')
const args = process.argv.slice(2)
const get = name => args.includes(name) ? args[args.indexOf(name) + 1] : null
const output = get('--output')
const startUrl = get('--url')
const expectedCommit = get('--source-sha')
const chromiumPath = get('--chromium-path')
const preflightPython = process.env.URAI_GENESIS_PYTHON?.trim() || (process.platform === 'win32' ? 'python' : 'python3')

if (args.includes('--help')) {
  console.log('node scripts/genesis-ascent-patched-review-capture.mjs --url http://127.0.0.1:4173/home/?demo=1 --source-sha <40hex-corrected-build-commit> --output /PRIVATE/urai-genesis-ascent-HOLD [--chromium-path /path/to/authorized/chrome]')
  process.exit(0)
}

let browser, context
let destination
let destinationVerified = false
const receipt = { schema:'urai-genesis-ascent-native-patched-capture-hold/v1',
  release:'NO-GO/HOLD', publicPublishing:false,privateCustomerMedia:false,
  completed:false, errors:[],sourceAttribution:'DECLARED_AND_CHECKOUT_MATCH_ONLY_NOT_BUILD_ATTESTATION' }
try {
  if (!startUrl || !expectedCommit || !output) throw Error('EXPLICIT_LOCAL_URL_SOURCE_SHA_AND_PRIVATE_DESTINATION_REQUIRED')
  if (!/^[0-9a-f]{40}$/.test(expectedCommit) || expectedCommit==='94c8a2cf68a436a0c49e80b3a09578935df12d48') throw Error('NEW_CORRECTED_BUILD_REVISION_REQUIRED')
  // A Windows venv python.exe must be explicitly supplied by the local HOLD kit.
  // A relative env executable is rejected; no command interpreter or shell is used.
  if (process.env.URAI_GENESIS_PYTHON && !path.isAbsolute(preflightPython)) throw Error('PREFLIGHT_PYTHON_MUST_BE_ABSOLUTE_PATH')
  if (chromiumPath && !path.isAbsolute(chromiumPath)) throw Error('CHROMIUM_PATH_MUST_BE_ABSOLUTE')
  if (chromiumPath) {
    const chromeStat=await lstat(chromiumPath)
    if (!chromeStat.isFile() || chromeStat.isSymbolicLink()) throw Error('AUTHORIZED_CHROMIUM_FILE_REQUIRED')
  }
  const url=new URL(startUrl)
  if (url.protocol!=='http:' || !['127.0.0.1','localhost'].includes(url.hostname) || url.username || url.password || url.pathname!=='/home/' || url.search!=='?demo=1' || url.hash) throw Error('ONLY_LOCAL_DISCLOSED_FIXTURE_HOME_ALLOWED')
  destination=path.resolve(output)
  for(let parent=destination;;parent=path.dirname(parent)) {
    const marker=await lstat(path.join(parent,'.git')).catch(e=>{
      if(e.code==='ENOENT') return null
      throw e
    })
    if(marker) throw Error('PRIVATE_VIDEO_DIRECTORY_INSIDE_GIT_REPOSITORY')
    if(path.dirname(parent)===parent) break
  }
  destinationVerified = true
  const {stdout}=await exec('git',['rev-parse','HEAD'],{cwd:repoRoot,timeout:10_000})
  if(stdout.trim()!==expectedCommit)throw Error('CHECKOUT_SHA_DIFFERS_FROM_REQUESTED_BUILD_SHA')
  const source=await readFile(path.join(repoRoot,'urai-tier1/src/spatial/layout/HomeWorldProductionPolished.tsx'),'utf8')
  if(!source.includes('sampleHomeAscentFlight(')||!source.includes('homeAscentR3fCallbacks')||!source.includes('homeAscentRendererFrame'))throw Error('REVIEW_CAMERA_PATCH_MISSING_FROM_CHECKOUT')
  receipt.applicationRevision=expectedCommit
  await mkdir(destination,{recursive:true,mode:0o700})
  const requireTier=createRequire(path.join(repoRoot,'urai-tier1','package.json'))
  const {chromium}=requireTier('playwright')
  browser=await chromium.launch({headless:true, ...(chromiumPath ? {executablePath:chromiumPath} : {}),
    args:['--enable-webgl','--enable-unsafe-swiftshader','--disable-dev-shm-usage']})
  receipt.browserVersion=await browser.version()
  context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,
    reducedMotion:'no-preference',recordVideo:{dir:destination,size:{width:1440,height:900}}})
  await context.route('**/*',route=>route.request().url().startsWith(url.origin+'/')?route.continue():route.abort('blockedbyclient'))
  const pageCreatedAt=Date.now()
  const page=await context.newPage()
  const response=await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:40_000})
  if(response?.status()!==200) throw Error('PATCHED_HOME_URL_NOT_200')
  const home=page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
  // Never mistake asynchronous Home mounting / asset readiness for a stale build.
  await home.waitFor({state:'visible',timeout:90_000})
  await page.waitForFunction(() => document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')?.getAttribute('data-home-assets-ready')==='true',null,{timeout:90_000})
  const actualBuildRevision=await home.getAttribute('data-home-genesis-build-revision')
  if(actualBuildRevision!==expectedCommit)throw Error('RUNNING_WEBGL_BUILD_REVISION_MISMATCH')
  receipt.runningWebglBuildRevision=actualBuildRevision
  const video=page.video()
  if(!video)throw Error('GENUINE_PLAYWRIGHT_VIDEO_CAPTURE_UNAVAILABLE')
  const { proveHomeSkyAscent } = await import('./home-sky-ascent-proof.mjs')
  const captureWindowStartMs=Date.now()
  const sampler=beginAscentCameraSampler(page,75)
  let samples
  try{
    const proof=await proveHomeSkyAscent(page,home,{mode:'pointer'})
    receipt.canonicalProof={ascentProven:proof.ascentProven,startingHeight:proof.startingHeight,peakHeight:proof.peakHeight,arrivalUrl:proof.arrivalUrl}
    await page.waitForTimeout(450)
  }finally{samples=await sampler.stop()}
  const captureWindowEndMs=Date.now()
  await context.close()
  context=null
  const actual=await video.path()
  const fullVideo=path.join(destination,'URAI_ASCENT_PATCHED_FULL_SESSION_HOLD.webm')
  await copyFile(actual,fullVideo)
  // Playwright starts recording when the browser page opens; it may include a
  // long static GLB-loading period. Decode and trim ONLY the actual continuous
  // WebM source around the real sky interaction, never loop or synthesize frames.
  const leadSeconds=Math.max(0,(captureWindowStartMs-pageCreatedAt)/1000-.3)
  const eventSeconds=(captureWindowEndMs-captureWindowStartMs)/1000
  const clipSeconds=Math.min(18,eventSeconds+.8)
  const privateVideo=path.join(destination,'URAI_ASCENT_PATCHED_REAL_MOTION_HOLD.webm')
  await exec('ffmpeg',['-nostdin','-hide_banner','-v','error','-y','-i',fullVideo,
    '-ss',leadSeconds.toFixed(3),'-t',clipSeconds.toFixed(3),
    '-c:v','libvpx-vp9','-b:v','2M','-pix_fmt','yuv420p','-an',privateVideo],
    {cwd:repoRoot,timeout:120_000,maxBuffer:1024*1024})
  const telemetry=await bindAscentTelemetryToVideo({videoFile:privateVideo,outputFile:path.join(destination,'URAI_ASCENT_CAMERA_SOURCE_HOLD.json'),applicationRevision:expectedCommit,samples})
  receipt.cameraSampleCount=samples.length
  receipt.videoSha256=telemetry.sourceVideoSha256
  receipt.video='URAI_ASCENT_PATCHED_REAL_MOTION_HOLD.webm'
  receipt.fullSessionVideo='URAI_ASCENT_PATCHED_FULL_SESSION_HOLD.webm'
  receipt.fullSessionVideoSha256=await (async()=>{const h=createHash('sha256');for await(const chunk of createReadStream(fullVideo))h.update(chunk);return h.digest('hex')})()
  receipt.trim={startsAtSeconds:leadSeconds,durationSeconds:clipSeconds,method:'decode real Playwright WebM and trim time window; no synthetic frames'}
  // The native recording is NOT complete until the actual decoded pixels pass
  // this fail-closed preflight. This still does not authorize human approval.
  const preflightPath=path.join(destination,'URAI_ASCENT_DECODED_PIXEL_PREFLIGHT_HOLD.json')
  const {stdout:preflightStdout}=await exec(preflightPython,[
    path.join(repoRoot,'scripts','genesis-ascent-pixel-gate.py'),
    '--video',privateVideo,
    '--camera-telemetry',path.join(destination,'URAI_ASCENT_CAMERA_SOURCE_HOLD.json'),
    '--receipt',preflightPath,
  ],{cwd:repoRoot,timeout:120_000,maxBuffer:1024*1024})
  const preflight=JSON.parse(preflightStdout)
  if(preflight.status!=='PIXEL_AND_CAMERA_PREFLIGHT_PASSED_HUMAN_REVIEW_REQUIRED')throw Error('PHYSICAL_ASCENT_PIXEL_PREFLIGHT_REJECTED')
  receipt.pixelPreflight=preflight.status
  receipt.humanVisualApproval=false
  receipt.completed=true
} catch(e) {
  receipt.errors.push(String(e?.stack||e).slice(0,1600))
} finally {
  await context?.close().catch(()=>{})
  await browser?.close().catch(()=>{})
  if(destinationVerified)await writeFile(path.join(destination,'URAI_ASCENT_PATCHED_CAPTURE_HOLD_RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600}).catch(()=>{})
}
console.log(JSON.stringify(receipt,null,2))
if(!receipt.completed) process.exitCode=2
