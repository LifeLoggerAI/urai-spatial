#!/usr/bin/env node
/**
 * Internal HOLD: Capture genuine Chromium frames from the exact 2026-10-18
 * compiled original UrAi consumer export. No accounts, customer data or publishing.
 * Any scene that cannot prove its actual runtime remains BLOCKED.
 */
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile, stat, copyFile } from 'node:fs/promises'
import { createHash, randomBytes, publicEncrypt, createCipheriv, constants } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import os from 'node:os'
import { cleanupUnsealedFallbackCapture } from './genesis-original-raw-cleanup.mjs'

const exec = promisify(execFile)
const sourceSha = '94c8a2cf68a436a0c49e80b3a09578935df12d48'
const artifactId = 12145312224
const args = process.argv.slice(2)
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback
const root = path.resolve(option('--original', 'original'))
const destination = path.resolve(option('--output', 'artifacts/genesis-native-motion-hold'))
const website = path.join(root, 'urai-tier1', 'out')
const manifestPath = path.join(root, 'artifacts', 'consumer-export', 'real-static-manifest.json')
const now = () => new Date().toISOString()
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const clean = value => String(value ?? '').slice(0, 800)
const fixtures = 'SYNTHETIC_DISCLOSED_SAMPLE_NO_ACCOUNT_NO_PRIVATE_MEDIA'
const verifyOnly = args.includes('--verify-only')
const publicKey = process.env.URAI_GENESIS_HOLD_PUBLIC_KEY || null
const stages = [
  { name: 'home', route: '/home/', seconds: 4 },
  { name: 'orb', route: '/home/?homePrivateFixture=1&homeOrbState=attention', seconds: 3 },
  { name: 'ascent', route: '/home/?demo=1', seconds: 3 },
  { name: 'life-map', route: '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1', seconds: 5 },
  { name: 'focus', route: '/focus/?demo=1&memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread', seconds: 3 },
  { name: 'replay', route: '/replay/?demo=1&memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread', seconds: 5 },
  { name: 'return', route: '/replay/?demo=1&memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread', seconds: 7 },
]

const receipt = {
  schema: 'urai-genesis-original-native-motion-hold/v2', capturedAtUtc: now(),
  repository: 'LifeLoggerAI/urai-spatial', sourceSha, artifactId,
  fixture: fixtures, captureStageIdentity: 'independent-native-route-clips-with-real-home-sky-ascent',
  journeyContinuityAccepted: false, release: 'NO-GO/HOLD', nativeDispatch: 'DISABLED',
  publicPublishing: 'HOLD', privateMedia: 'DISABLED', exactCompiledBuildVerified: false,
  environment: { node: process.version, platform: process.platform, arch: process.arch, host: os.hostname() },
  scenes: [], complete: false, errors: [],
}

async function verifyOriginal() {
  const manifestBytes = await readFile(manifestPath)
  const manifest = JSON.parse(manifestBytes)
  if (manifest.sourceSha !== sourceSha || manifest.sourcePullRequest !== 1850 ||
      manifest.scope !== 'real-compiled-static-consumer-not-deployed' || manifest.fileCount !== 1525) {
    throw Error('ORIGINAL_SOURCE_IDENTITY_MISMATCH')
  }
  let bytes = 0
  for (const item of manifest.files) {
    const rel = path.posix.normalize(item.path)
    if (rel.startsWith('../') || rel.startsWith('/') || rel !== item.path) throw Error('UNSAFE_MANIFEST_PATH')
    const content = await readFile(path.join(website, rel))
    if (sha(content) !== item.sha256 || content.length !== item.bytes) throw Error(`SOURCE_BYTES_MISMATCH:${rel}`)
    bytes += content.length
  }
  if (bytes !== manifest.totalBytes || bytes !== 144192602 || manifest.files.length !== 1525) throw Error('MANIFEST_TOTAL_MISMATCH')
  receipt.exactCompiledBuildVerified = true
  receipt.sourceTreeSha = manifest.sourceTreeSha
  receipt.manifestSha256 = sha(manifestBytes)
  receipt.sourceFileCount = manifest.fileCount
  receipt.sourceBytes = bytes
}

async function serveStatic() {
  const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.wasm':'application/wasm','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2','.mp4':'video/mp4'}
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1:4173')
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      if (!rel || rel.includes('..') || rel.includes('\\') || rel.startsWith('.')) { res.writeHead(400); res.end(); return }
      let file = path.resolve(website, rel)
      if (!file.startsWith(website + path.sep)) { res.writeHead(403); res.end(); return }
      const st = await stat(file).catch(() => null)
      if (st?.isDirectory()) file = path.join(file, 'index.html')
      else if (!st && !path.extname(file)) file = path.join(file, 'index.html')
      const fstat = await stat(file)
      if (!fstat.isFile()) throw Error('not a file')
      res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control':'no-store', 'access-control-allow-origin':'http://127.0.0.1:4173'})
      createReadStream(file).pipe(res)
    } catch { res.writeHead(404); res.end('not found') }
  })
  await new Promise((resolve,reject) => {server.once('error',reject);server.listen(4173,'127.0.0.1',resolve)})
  return server
}

const probeScript = () => {
  const visible = el => { if (!el) return false; const r=el.getBoundingClientRect(); const s=getComputedStyle(el); return r.width>20&&r.height>20&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0' }
  const get = x => document.querySelector(`[data-testid="${x}"]`)
  return {
    url: location.href, title: document.title, bodySample: document.body.innerText.slice(0,1500),
    visibleCanvases: [...document.querySelectorAll('canvas')].filter(visible).map(x=>({width:x.width,height:x.height,webgl:!!(x.getContext('webgl2')||x.getContext('webgl'))})),
    webgl2Available: !!document.createElement('canvas').getContext('webgl2'),
    fallbackVisible: visible(get('urai-home-accessible-fallback')),
    ownerVisible: visible(document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')),
    homeAssetsReady: document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')?.getAttribute('data-home-assets-ready') ?? null,
    groundReady: get('urai-ground-private-workforce-world')?.getAttribute('data-ground-ready') ?? null,
    ascentMode: get('urai-root-mode-stage')?.getAttribute('data-mode') ?? null,
    lifeMapVisible: visible(get('urai-true-3d-life-map')),
    lifeMapSource: get('urai-true-3d-life-map')?.getAttribute('data-life-map-source') ?? null,
    lifeMapPhase: get('urai-true-3d-life-map')?.getAttribute('data-life-map-phase') ?? null,
    lifeMapReady: get('urai-true-3d-life-map')?.getAttribute('data-life-map-render-ready') ?? null,
    focusStatus: get('urai-final-focus-chamber')?.getAttribute('data-memory-status') ?? null,
    replayStatus: get('cinematic-replay-client')?.getAttribute('data-memory-status') ?? null,
    replayVisible: visible(get('cinematic-replay-client')),
    focusMemoryId: get('urai-final-focus-chamber')?.getAttribute('data-memory-id') ?? null,
    focusWebglState: get('urai-final-focus-chamber')?.getAttribute('data-webgl-state') ?? null,
    focusFirstFrame: get('urai-final-focus-chamber')?.querySelector('canvas')?.getAttribute('data-focus-first-frame') ?? null,
    replayMemoryId: get('cinematic-replay-client')?.getAttribute('data-memory-id') ?? null,
    replayWebglState: get('cinematic-replay-client')?.getAttribute('data-webgl-state') ?? null,
    replayFirstFrame: get('cinematic-replay-client')?.querySelector('canvas')?.getAttribute('data-replay-first-frame') ?? null,
    replayMediaReady: get('cinematic-replay-client')?.getAttribute('data-replay-media-ready') ?? null,
    orbNodes: [...document.querySelectorAll('[data-orb-state], [data-testid="home-semantic-orb"]')].filter(visible).length,
  }
}

function assertScene(name, probe) {
  if (!probe.webgl2Available) throw Error('WEBGL2_UNAVAILABLE')
  if (['home','orb','ascent','life-map'].includes(name) && !probe.visibleCanvases.some(canvas=>canvas.webgl)) throw Error('VISIBLE_ORIGINAL_WEBGL_CANVAS_MISSING')
  if (['home','orb','ascent'].includes(name) && probe.fallbackVisible) throw Error('CSS_FALLBACK_NOT_NATIVE')
  if (['home','orb','ascent'].includes(name) && (!probe.ownerVisible || probe.homeAssetsReady !== 'true')) throw Error('ORIGINAL_HOME_ASSET_READY_REQUIRED')
  if (name === 'orb' && probe.orbNodes === 0) throw Error('ORIGINAL_ORB_NOT_VISIBLE')
  if (name === 'ascent' && !probe.ownerVisible) throw Error('ORIGINAL_HOME_OWNER_REQUIRED_FOR_SKY_ASCENT')
  if (name === 'life-map' && (!probe.lifeMapVisible || probe.lifeMapSource !== 'explicit-demo' || probe.lifeMapPhase !== 'overview' || probe.lifeMapReady !== 'true')) throw Error('DISCLOSED_LIFEMAP_NOT_READY')
  if (name === 'focus' && (probe.focusMemoryId !== 'demo:quiet-reset' || probe.focusWebglState !== 'ready' || probe.focusFirstFrame !== 'true')) throw Error('FOCUS_SAMPLE_AND_WEBGL_AUTHORITY_NOT_PROVEN')
  if (['replay','return'].includes(name) && (probe.replayMemoryId !== 'demo:quiet-reset' || !probe.replayVisible || probe.replayWebglState !== 'ready' || probe.replayFirstFrame !== 'true' || probe.replayMediaReady !== 'true')) throw Error('REPLAY_SAMPLE_AND_WEBGL_AUTHORITY_NOT_PROVEN')
}

async function sealClip(plain, dest, expectedSha256) {
  if (!publicKey) throw Error('HOLD_ENCRYPTION_PUBLIC_KEY_MISSING')
  const content = await readFile(plain)
  if (sha(content) !== expectedSha256) throw Error('PRE_ENCRYPTION_SOURCE_HASH_MISMATCH')
  const key = randomBytes(32)
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  const ciphertext = Buffer.concat([cipher.update(content), cipher.final()])
  const header = {
    format: 'URAI_GENESIS_HOLD_RSA_OAEP_SHA256_AES_256_GCM_V1',
    encryptedKey: publicEncrypt({key:publicKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key).toString('base64'),
    nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
    originalSha256: expectedSha256, originalBytes: content.length,
  }
  const sealed = Buffer.concat([Buffer.from(JSON.stringify(header)+'\n'),ciphertext])
  await writeFile(dest,sealed)
  return {sealedFile:path.basename(dest),sealedSha256:sha(sealed),sealedBytes:sealed.length,headerFormat:header.format}
}

async function ffprobe(file) {
  const { stdout } = await exec('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,avg_frame_rate','-of','json',file],{timeout:15000})
  return JSON.parse(stdout)
}

// Native CDP screencast records actual incoming Chromium frames, not screenshots or animations of stills.
async function cdpBackup(context, page, folder) {
  const cdp = await context.newCDPSession(page)
  const raw = path.join(folder,'cdp-frames')
  await mkdir(raw,{recursive:true})
  let number=0
  const hashes = new Set()
  let frames = []
  let queue = Promise.resolve()
  cdp.on('Page.screencastFrame', ({data,sessionId,metadata}) => {
    const n=++number
    const stamp=Number(metadata?.timestamp ?? 0)
    queue=queue.then(async()=>{
      const buf=Buffer.from(data,'base64')
      hashes.add(sha(buf))
      const fn=`${String(n).padStart(6,'0')}.jpg`
      await writeFile(path.join(raw,fn),buf)
      frames.push({name:fn, timestamp:stamp})
      await cdp.send('Page.screencastFrameAck',{sessionId}).catch(()=>{})
    })
  })
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:90,maxWidth:1080,maxHeight:1920,everyNthFrame:1})
  return async (target, seconds) => {
    await cdp.send('Page.stopScreencast').catch(()=>{})
    await queue
    if (frames.length < 15 || hashes.size < 4) throw Error(`CDP_FRAME_MOTION_INSUFFICIENT:${frames.length}:${hashes.size}`)
    const timestampRange=frames.at(-1).timestamp-frames[0].timestamp
    if (timestampRange < seconds*0.45) throw Error(`CDP_DURATION_INSUFFICIENT:${timestampRange}`)
    const concat = path.join(folder,'cdp-frames.txt')
    // Real frame timestamps determine their display time; 24-fps output may repeat frames without fabricating motion.
    const contents = []
    for (let i=0;i<frames.length;i++) {
      contents.push(`file '${raw}/${frames[i].name}'`)
      if (i<frames.length-1) contents.push(`duration ${Math.min(0.4,Math.max(0.016,frames[i+1].timestamp-frames[i].timestamp)).toFixed(6)}`)
    }
    contents.push(`file '${raw}/${frames.at(-1).name}'`)
    await writeFile(concat,contents.join('\n')+'\n')
    await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-safe','0','-f','concat','-i',concat,'-vf','fps=24,scale=1080:1920','-c:v','libvpx-vp9','-b:v','2M','-pix_fmt','yuv420p','-an',target],{timeout:180000})
    return {frames:frames.length,uniqueFrames:hashes.size,elapsedSec:timestampRange,method:'CDP_Page.startScreencast_to_vp9'}
  }
}

async function captureUnsealed(chromium, serverOrigin, spec) {
  const scene = {scene:spec.name,route:spec.route,sourceSha,fixture:fixtures,startedAtUtc:now(),accepted:false,errors:[],captureMethod:null}
  receipt.scenes.push(scene)
  const folder = path.join(destination,spec.name)
  await mkdir(folder,{recursive:true})
  const options = {viewport:{width:1080,height:1920},deviceScaleFactor:1,reducedMotion:'no-preference'}
  let context, recorderUnavailable = null
  try { context = await chromium.newContext({...options,recordVideo:{dir:folder,size:{width:1080,height:1920}}}) }
  catch(e) {
    if (!/ffmpeg|video|recorder|executable/i.test(String(e))) throw e
    recorderUnavailable = clean(e)
    context = await chromium.newContext(options)
  }
  let page
  try { page = await context.newPage() }
  catch(e) {
    if (!/ffmpeg|video|recorder|executable/i.test(String(e))) throw e
    recorderUnavailable=clean(e)
    await context.close()
    context=await chromium.newContext(options)
    page=await context.newPage()
  }
  await context.route('**/*',route => route.request().url().startsWith(serverOrigin+'/')?route.continue():route.abort('blockedbyclient'))
  const navigation=[]
  const pageErrors=[]
  page.on('pageerror',e=>pageErrors.push(clean(e.message)))
  page.on('framenavigated',f=> {if(f===page.mainFrame())navigation.push({at:now(),url:f.url()})})
  const video = page.video()
  if (recorderUnavailable) scene.recorderFallbackReason = recorderUnavailable
  let stopCDP=null, fallback=null, staged=null
  try {
    const result = await page.goto(serverOrigin+spec.route,{waitUntil:'domcontentloaded',timeout:35000})
    if (result?.status() !== 200) throw Error('NATIVE_ROUTE_HTTP_200_REQUIRED')
    // Route readiness is attributed to source-owned runtime telemetry, not a fixed 3.5s wait.
    const selectors = {
      home: '.urai-asset-home-world[data-home-primary-owner="asset-driven"][data-home-assets-ready="true"]',
      orb: '.urai-asset-home-world[data-home-primary-owner="asset-driven"][data-home-assets-ready="true"]',
      ascent: '.urai-asset-home-world[data-home-primary-owner="asset-driven"][data-home-assets-ready="true"]',
      'life-map': '[data-testid="urai-true-3d-life-map"][data-life-map-render-ready="true"][data-life-map-source="explicit-demo"]',
      focus: '[data-testid="urai-final-focus-chamber"][data-webgl-state="ready"] canvas[data-focus-first-frame="true"]',
      replay: '[data-testid="cinematic-replay-client"][data-webgl-state="ready"] canvas[data-replay-first-frame="true"]',
      return: '[data-testid="cinematic-replay-client"][data-webgl-state="ready"] canvas[data-replay-first-frame="true"]',
    }
    await page.locator(selectors[spec.name]).first().waitFor({state:'attached',timeout:90000})
    const probe = await page.evaluate(probeScript)
    scene.probe = {...probe, bodySample:probe.bodySample.slice(0,280)}
    assertScene(spec.name, probe)
    if (recorderUnavailable) { try { stopCDP = await cdpBackup(context,page,folder) } catch (e) { scene.cdpError=clean(e) } }
    if (spec.name==='orb') {
      const orb=page.locator('[data-testid="home-semantic-orb"]').first()
      if (!await orb.isVisible().catch(()=>false)) throw Error('ORB_INTERACTION_CONTROL_UNAVAILABLE')
      await orb.click({timeout:8000})
      scene.interaction='Clicked original Home Orb semantic control'
    }
    if (spec.name==='replay') {
      const replay = page.getByTestId('cinematic-replay-client')
      const play= replay.getByRole('button',{name:'Continue memory',exact:true})
      if (!await play.isVisible().catch(()=>false)) throw Error('ORIGINAL_REPLAY_CONTINUE_CONTROL_UNAVAILABLE')
      await play.click({timeout:8000})
      await page.waitForFunction(() => document.querySelector('[data-testid="cinematic-replay-client"]')?.getAttribute('data-playing') === 'true',null,{timeout:20000})
      scene.interaction='Clicked original Replay Continue memory; actual disclosed sample played'
      scene.replayPlayingObserved=true
      await page.waitForTimeout(3000)
      const pause= replay.getByRole('button',{name:'Pause memory',exact:true})
      if(await pause.isVisible().catch(()=>false)) await pause.click({timeout:8000})
    }
    if (spec.name==='ascent') {
      // /ascent is a compatibility redirect to /home in the immutable build.
      // Only the real Home sky canvas can initiate the authored physical camera ascent.
      const helperBytes = await readFile(new URL('./home-sky-ascent-proof.mjs', import.meta.url))
      const helperGitBlobSha1 = createHash('sha1')
        .update(`blob ${helperBytes.length}\0`).update(helperBytes).digest('hex')
      if (helperGitBlobSha1 !== '8d688bfaabf9efc1dbb3d3f6b64e67ae2f451568') {
        throw Error(`ASCENT_HELPER_REVISION_MISMATCH:${helperGitBlobSha1}`)
      }
      const home = page.getByTestId('urai-persistent-world-shell')
        .locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      await home.waitFor({state:'visible',timeout:45000})
      await page.waitForFunction(() => document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')?.getAttribute('data-home-assets-ready') === 'true',null,{timeout:90000})
      const {proveHomeSkyAscent} = await import('./home-sky-ascent-proof.mjs')
      const proof = await proveHomeSkyAscent(page,home,{mode:'pointer'})
      if (!proof.ascentProven) throw Error('HOME_SKY_ASCENT_UNPROVEN')
      scene.ascentEvidence = {
        originalProofGitBlobSha1:helperGitBlobSha1,
        cameraStartHeight:proof.startingHeight,
        cameraPeakHeight:proof.peakHeight,
        cameraTelemetrySamples:proof.samples.length,
        arrivalUrl:proof.arrivalUrl,
        disclosedDemo:proof.disclosedDemo,
        physicallyLifted:proof.peakHeight > proof.startingHeight + 0.1,
      }
      if (!scene.ascentEvidence.physicallyLifted) throw Error('ACTUAL_CAMERA_HEIGHT_CHANGE_REQUIRED')
      scene.interaction='Original visible Home sky click -> rising camera -> LifeMap arrival'
    }
    if (spec.name==='return') {
      // Escape is the original documented reverse journey. Fail closed if it cannot be proven.
      const expected=['/focus','/life-map','/home']
      const states=[]
      for (const target of expected) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(700)
        const url=new URL(page.url())
        states.push({target,actual:url.pathname})
        if (!url.pathname.replace(/\/$/,'').endsWith(target)) throw Error(`ORIGINAL_ESCAPE_RETURN_NOT_PROVEN:${JSON.stringify(states)}`)
      }
      const final=await page.evaluate(probeScript)
      if (final.orbNodes===0 || final.visibleCanvases.length===0) throw Error('RETURN_HOME_ORB_NOT_PROVEN')
      scene.returnStates=states
      scene.interaction='Original Escape reverse journey with confirmed Home Orb'
    }
    await page.waitForTimeout(Math.max(1700,(spec.seconds-1)*1000))
    staged = 'RUNTIME_VALIDATED'
    scene.navigation=navigation
    scene.pageErrors=pageErrors
    if(pageErrors.length) throw Error('BROWSER_PAGE_ERRORS')
  } catch(e) {
    scene.errors.push(clean(e?.stack||e))
    scene.navigation=navigation
    scene.pageErrors=pageErrors
    scene.failureUrl=page.url()
    scene.failureProbe=await page.evaluate(probeScript).then(probe=>({...probe,bodySample:clean(probe.bodySample).slice(0,200)})).catch(error=>({unavailable:clean(error)}))
  }
  finally {
    if(stopCDP) {try{fallback=await stopCDP(path.join(folder,'cdp-recorded.webm'),spec.seconds)}catch(e){scene.cdpError=clean(e)}}
    await context.close().catch(e=>scene.errors.push(clean(e)))
  }
  try {
    if(staged!=='RUNTIME_VALIDATED') return scene
    const recordedPath=video ? await video.path().catch(()=>null) : null
    let picked=recordedPath,method='Playwright_Chromium_recordVideo'
    let info=picked ? await ffprobe(picked).catch(()=>null) : null
    if(!info || Number(info.format?.duration||0)<Math.min(1.7,spec.seconds*0.6)) {
      if(!fallback) throw Error('NO_VALID_PLAYWRIGHT_OR_CDP_VIDEO')
      picked=path.join(folder,'cdp-recorded.webm');method=fallback.method;info=await ffprobe(picked)
    }
    // Decode actual source frames and require visible frame-to-frame changes.
    const {stdout:frameMd5}=await exec('ffmpeg',['-v','error','-i',picked,'-vf','fps=2,scale=128:128','-f','framemd5','-'],{timeout:60000,maxBuffer:1024*1024})
    const frameHashes=frameMd5.split('\n').filter(line=>line&&!line.startsWith('#')).map(line=>line.split(',').at(-1).trim())
    const uniqueFrameHashes=new Set(frameHashes).size
    if(frameHashes.length<3 || uniqueFrameHashes<3) throw Error(`MOTION_FRAME_PROOF_FAILED:${frameHashes.length}:${uniqueFrameHashes}`)
    scene.motionProof={sampledFrames:frameHashes.length,uniqueFrameHashes,method:'ffmpeg decoded frame hash fps=2 scale=128'}
    const out=path.join(destination,`${spec.name}.webm`)
    await copyFile(picked,out)
    const bytes=await readFile(out)
    scene.video={file:path.basename(out),sha256:sha(bytes),bytes:bytes.length,probe:info,cdpFallback:fallback,method}
    scene.captureMethod=method
    if (!verifyOnly) scene.sealed = await sealClip(out,path.join(destination,`${spec.name}.sealed`),scene.video.sha256)
    scene.accepted=true
    scene.errors=[]
  } catch(e) {scene.errors.push(clean(e))}
  return scene
}

// Neither a successful seal nor a failed browser/FFmpeg run may leave raw
// scene WebM, Playwright videos, CDP JPEGs, or concat lists behind in artifacts.
async function capture(chromium, serverOrigin, spec) {
  try {
    return await captureUnsealed(chromium, serverOrigin, spec)
  } finally {
    try {
      const cleanup = await cleanupUnsealedFallbackCapture(destination, spec.name)
      const scene = receipt.scenes.at(-1)
      if (scene?.scene === spec.name) {
        scene.unsealedCleanup = cleanup
        if (scene.video) scene.video.rawFileRetained = false
        if (scene.accepted && !scene.sealed) {
          scene.errors.push('ENCRYPTED_SEAL_REQUIRED_FOR_ACCEPTANCE')
          scene.accepted = false
        }
      }
    } catch (error) {
      const reason = 'UNSEALED_FALLBACK_CLEANUP_FAILED:' + clean(error)
      const scene = receipt.scenes.at(-1)
      if (scene?.scene === spec.name) {
        scene.errors.push(reason)
        scene.accepted = false
      }
      receipt.errors.push(reason)
      throw error
    }
  }
}

await mkdir(destination,{recursive:true})
let server=null,browser=null
try {
  await verifyOriginal()
  if (verifyOnly) {
    receipt.verificationOnly=true
    if (args.includes('--crypto-selftest')) {
      const content=Buffer.from('UrAi HOLD crypto self-test: no video or customer information')
      const input=path.join(destination,'encryption-selftest.txt')
      await writeFile(input,content)
      receipt.cryptoSelfTest=await sealClip(input,path.join(destination,'encryption-selftest.sealed'),sha(content))
    }
    console.log(JSON.stringify({sourceSha,artifactId,sourceFiles:receipt.sourceFileCount,sourceBytes:receipt.sourceBytes,verified:true,cryptoSelfTest:receipt.cryptoSelfTest||null}))
  } else {
  if (!publicKey) throw Error('ENCRYPTION_PUBLIC_KEY_REQUIRED_BEFORE_NATIVE_CAPTURE')
  const requireRoot=createRequire(new URL('../package.json',import.meta.url))
  const requireTier=createRequire(new URL('../urai-tier1/package.json',import.meta.url))
  let chromium
  try {chromium=requireRoot('playwright').chromium} catch {chromium=requireTier('playwright').chromium}
  const {stdout}=await exec('ffmpeg',['-version'],{timeout:10000})
  receipt.environment.ffmpeg=stdout.split('\n')[0]
  const {stdout:probeVersion}=await exec('ffprobe',['-version'],{timeout:10000})
  receipt.environment.ffprobe=probeVersion.split('\n')[0]
  server=await serveStatic()
  browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist']})
  receipt.environment.chromium=await browser.version()
  for(const stage of stages) {
    await capture(browser,'http://127.0.0.1:4173',stage)
    const last=receipt.scenes.at(-1)
    console.log(JSON.stringify({scene:stage.name,accepted:last.accepted,errors:last.errors,video:last.video?.sha256}))
  }
  }
} catch(e) { receipt.errors.push(clean(e?.stack||e)) }
finally {
  await browser?.close().catch(()=>{})
  if(server) await new Promise(resolve=>server.close(resolve))
}
receipt.completedAtUtc=now()
receipt.nativeClipsCaptured=receipt.scenes.filter(s=>s.accepted).length
receipt.journeyContinuityAccepted=false // Direct deep links cannot certify Home -> Ascent -> LifeMap -> Focus -> Replay
receipt.complete=receipt.exactCompiledBuildVerified&&receipt.nativeClipsCaptured===7&&receipt.errors.length===0&&receipt.journeyContinuityAccepted
await writeFile(path.join(destination,'native-capture-receipt.json'),JSON.stringify(receipt,null,2)+'\n')
const hashes=[]
// SHA256SUMS must reference retained encrypted bytes, never removed raw videos.
for(const scene of receipt.scenes)if(scene.sealed)hashes.push(`${scene.sealed.sealedSha256}  ${scene.sealed.sealedFile}`)
await writeFile(path.join(destination,'CAPTURE_SHA256SUMS.txt'),hashes.join('\n')+'\n')
console.log(JSON.stringify({complete:receipt.complete,nativeClipsCaptured:receipt.nativeClipsCaptured,sourceSha,artifactId,release:'HOLD'}))
if(!receipt.complete && !verifyOnly)process.exitCode=2
