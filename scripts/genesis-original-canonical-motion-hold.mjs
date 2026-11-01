#!/usr/bin/env node
/**
 * Original UrAi continuous source journey -> actual Chromium WebM -> seven sealed
 * source-motion segments. Never connects an account, grants consent, or publishes.
 * No staged screenshot images are rendered as clips.
 */
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { createHash, randomBytes, createCipheriv, publicEncrypt, constants } from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import os from 'node:os'
import { segmentsFromEvents } from './genesis-original-motion-intervals.mjs'

const exec = promisify(execFile)
const args = process.argv.slice(2)
const opt=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback
const original = path.resolve(opt('--original','original'))
const output = path.resolve(opt('--output','artifacts/genesis-native-motion-hold'))
const publicKey = process.env.URAI_GENESIS_HOLD_PUBLIC_KEY || null
const sourceSha='94c8a2cf68a436a0c49e80b3a09578935df12d48'
const artifactId=12145312224
const base='http://127.0.0.1:4173'
const website=path.join(original,'urai-tier1','out')
const sha = bytes=>createHash('sha256').update(bytes).digest('hex')
const clean = value=>String(value??'').slice(0,900)
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const expectedScripts={
  'capture-canonical-journey-proof.mjs':'b34d4e07d04fdd9e1038c00c08dcf64fd34cc0b6',
  'home-sky-ascent-proof.mjs':'8d688bfaabf9efc1dbb3d3f6b64e67ae2f451568',
}
const record={
  schema:'urai-genesis-original-continuous-motion-hold/v1',
  source:{repository:'LifeLoggerAI/urai-spatial',commit:sourceSha,artifactId},
  capturedAtUtc:new Date().toISOString(),fixture:'EXPLICIT_DISCLOSED_DEMO_QUIET_RESET_NO_PERSONAL_ACCOUNT',
  release:'NO-GO/HOLD',publicPublishing:'HOLD',privateMedia:'DISABLED',nativeDispatch:'DISABLED',
  environment:{node:process.version,platform:process.platform,host:os.hostname()},
  evidence:{continuousJourney:false,realAscent:false},timeline:[],clips:[],errors:[],complete:false,
}
await mkdir(output,{recursive:true})
const scriptRoot=path.dirname(new URL(import.meta.url).pathname)

async function verifyPinnedScripts() {
  for(const [relative,pin] of Object.entries(expectedScripts)) {
    const bytes=await readFile(path.join(scriptRoot,relative))
    const blob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
    if(blob!==pin)throw Error(`ORIGINAL_SCRIPT_BLOB_MISMATCH:${relative}:${blob}`)
  }
  record.evidence.pinnedSourceScripts=expectedScripts
}
async function verifyCompiled() {
  const verify=path.join(scriptRoot,'genesis-original-native-motion-hold.mjs')
  const {stdout}=await exec(process.execPath,[verify,'--verify-only','--original',original,'--output',path.join(output,'source-verification')],{timeout:30000,maxBuffer:1024*1024})
  if(!stdout.includes('"verified":true'))throw Error('ORIGINAL_STATIC_SOURCE_VERIFY_FAILED')
  record.evidence.exactCompiledSourceVerified=true
}
async function probeVideo(file) {
  const {stdout}=await exec('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height,avg_frame_rate','-of','json',file],{timeout:20000})
  return JSON.parse(stdout)
}
async function proveDecodedMotion(file) {
  const {stdout}=await exec('ffmpeg',['-v','error','-i',file,'-vf','fps=2,scale=128:128','-f','framemd5','-'],{timeout:90000,maxBuffer:1024*1024})
  const frameHashes=stdout.split('\n').filter(line=>line&&!line.startsWith('#')).map(line=>line.split(',').at(-1).trim())
  return {sampledFrames:frameHashes.length,uniqueFrames:new Set(frameHashes).size,method:'decoded_ffmpeg_framemd5_2fps'}
}
async function sealFile(plain,dest,expectedSha256) {
  if(!publicKey)throw Error('HOLD_ENCRYPTION_PUBLIC_KEY_REQUIRED')
  const bytes=await readFile(plain)
  if(sha(bytes)!==expectedSha256)throw Error('RAW_SOURCE_BYTES_CHANGED_BEFORE_SEALING')
  const key=randomBytes(32),nonce=randomBytes(12)
  const cipher=createCipheriv('aes-256-gcm',key,nonce)
  const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()])
  const header={format:'URAI_GENESIS_HOLD_RSA_OAEP_SHA256_AES_256_GCM_V1',encryptedKey:publicEncrypt({key:publicKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key).toString('base64'),nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),originalSha256:expectedSha256,originalBytes:bytes.length}
  const sealed=Buffer.concat([Buffer.from(JSON.stringify(header)+'\n'),ciphertext])
  await writeFile(dest,sealed)
  return {sealedFile:path.basename(dest),sealedSha256:sha(sealed),sealedBytes:sealed.length}
}
let server=null
let desktop=null
let browserScriptThrown=null
try {
  if(!publicKey)throw Error('CAPTURE_KEY_REQUIRED_BEFORE_BROWSER')
  await verifyPinnedScripts()
  await verifyCompiled()
  if(args.includes('--verify-only')) {
    record.verificationOnly=true
  } else {
    server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1','--directory',website],{stdio:'ignore'})
    let served=false
    for(let n=0;n<60;n++){
      try {const res=await fetch(base+'/home/');if(res.ok){served=true;break}}catch{}
      await delay(500)
    }
    if(!served)throw Error('ORIGINAL_LOCAL_HTTP_SERVER_NOT_READY')
    const requireTier=createRequire(new URL('../urai-tier1/package.json',import.meta.url))
    const chromium=requireTier('playwright').chromium
    const originalLaunch=chromium.launch.bind(chromium)
    const rawFolder=path.join(output,'raw')
    await mkdir(rawFolder,{recursive:true})
    let contexts=0
    Object.defineProperty(chromium,'launch',{configurable:true,value:async options=>{
      const browser=await originalLaunch({...options,args:[...new Set([...(options.args||[]),'--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-dev-shm-usage'])]})
      record.environment.chromium=await browser.version()
      const originalNewContext=browser.newContext.bind(browser)
      Object.defineProperty(browser,'newContext',{configurable:true,value:async options=>{
        contexts++
        const desktopCapture=contexts===1
        const context=await originalNewContext(desktopCapture?{...options,recordVideo:{dir:rawFolder,size:{width:1440,height:900}}}:options)
        await context.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort('blockedbyclient'))
        if(desktopCapture){
          const originalNewPage=context.newPage.bind(context)
          Object.defineProperty(context,'newPage',{configurable:true,value:async()=>{
            const page=await originalNewPage()
            const start=Date.now()
            const timeline=[]
            const playback=page.video()
            desktop={playback,start,timeline}
            const origScreenshot=page.screenshot.bind(page)
            const mark=id=>timeline.push({id,ms:Date.now()-start,atUtc:new Date().toISOString(),url:new URL(page.url()).pathname})
            Object.defineProperty(page,'screenshot',{configurable:true,value:async options=>{
              const result=await origScreenshot(options)
              const file=path.basename(options.path||'')
              const prefix='desktop-pointer-keyboard-ascent-'
              if(!file.startsWith(prefix)||!file.endsWith('.png'))return result
              const id=file.slice(prefix.length,-4)
              // Ensure return footage can satisfy the original four-second
              // editorial cut, without slowing or manufacturing pixels.
              if(id==='return-home') {
                const replayEnd=timeline.find(entry=>entry.id==='replay-playback-end')
                if(!replayEnd)throw Error('RETURN_SOURCE_PLAYBACK_CHECKPOINT_MISSING')
                const elapsed=Date.now()-start-replayEnd.ms
                if(elapsed<4500)await delay(4500-elapsed)
              }
              mark(id)
              if(id==='home')await delay(4500)
              if(id==='life-map-overview')await delay(5500)
              if(id==='memory-star')await delay(800)
              if(id==='focus')await delay(3500)
              if(id==='replay') {
                const root=page.getByTestId('cinematic-replay-client')
                const play=root.getByRole('button',{name:'Continue memory',exact:true})
                await play.click({timeout:10000})
                await page.waitForFunction(() => document.querySelector('[data-testid="cinematic-replay-client"]')?.getAttribute('data-playing')==='true',null,{timeout:20000})
                mark('replay-playback-began')
                await delay(4000)
                await root.getByRole('button',{name:'Pause memory',exact:true}).click({timeout:10000})
                mark('replay-playback-end')
              }
              if(id==='return-focus'||id==='return-life-map-selected'||id==='return-life-map-overview')await delay(850)
              if(id==='return-home') {
                const orb=page.getByTestId('home-semantic-orb')
                await orb.waitFor({state:'visible',timeout:20000})
                await orb.click({timeout:10000})
                mark('orb-clicked')
                await delay(3500)
                mark('orb-end')
              }
              return result
            }})
            return page
          }})
        }
        return context
      }})
      return browser
    }})
    process.env.URAI_PROOF_BASE=base
    process.env.URAI_PROOF_DIR=path.join(output,'canonical-proof-stills')
    process.env.URAI_EXACT_HEAD=sourceSha
    try {await import('./capture-canonical-journey-proof.mjs')}catch(error){browserScriptThrown=clean(error?.stack||error)}
    if(browserScriptThrown)record.errors.push(`ORIGINAL_CANONICAL_PROOF_EXCEPTION:${browserScriptThrown}`)
    const journeyReceipt=JSON.parse(await readFile(path.join(output,'canonical-proof-stills','receipt.json'),'utf8'))
    const first=journeyReceipt.journeys?.[0]
    record.evidence.originalCanonicalProof={status:journeyReceipt.status,desktopPassed:first?.passed===true,ascentProven:first?.ascentProven===true,identityStable:first?.identityStable===true,otherVariants:journeyReceipt.journeys?.slice(1).map(x=>({id:x.id,passed:x.passed}))}
    record.evidence.continuousJourney=first?.passed===true&&first?.identityStable===true&&first?.ascentProven===true
    record.evidence.realAscent=first?.ascentProven===true
    record.timeline=desktop?.timeline||[]
    if(!record.evidence.continuousJourney)throw Error('ORIGINAL_DESKTOP_CANONICAL_JOURNEY_NOT_PROVEN')
    if(!desktop?.playback)throw Error('ORIGINAL_CONTINUOUS_CHROMIUM_VIDEO_NOT_AVAILABLE')
    const raw=await desktop.playback.path()
    const info=await probeVideo(raw)
    record.evidence.continuousRawVideo={videoSha256:sha(await readFile(raw)),format:info,rawFileRetained:false}
    const defs=segmentsFromEvents(record.timeline)
    const total=Number(info.format?.duration||0)
    for(const clip of defs){
      if(clip.sourceEndSeconds>total+1)throw Error(`CAPTURE_TIMELINE_OVERFLOW:${clip.name}:${total}`)
      const plain=path.join(rawFolder,`${clip.name}.webm`)
      await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(Math.max(0,clip.sourceStartSeconds-0.15)),'-i',raw,'-t',String(clip.sourceDurationSeconds),'-vf','fps=24','-c:v','libvpx-vp9','-b:v','2M','-pix_fmt','yuv420p','-an',plain],{timeout:180000})
      const parsed=await probeVideo(plain)
      const motion=await proveDecodedMotion(plain)
      if(motion.sampledFrames<4||motion.uniqueFrames<4)throw Error(`SOURCE_FRAME_MOTION_NOT_PROVEN:${clip.name}:${JSON.stringify(motion)}`)
      const content=await readFile(plain)
      const verified={...clip,codec:parsed.streams?.[0]?.codec_name,dimensions:[parsed.streams?.[0]?.width,parsed.streams?.[0]?.height],fps:parsed.streams?.[0]?.avg_frame_rate,durationSeconds:+Number(parsed.format?.duration||0).toFixed(3),motion,sourceSha256:sha(content),sourceBytes:content.length}
      if(verified.codec!=='vp9'||verified.sourceBytes<8192||verified.durationSeconds<clip.sourceDurationSeconds*0.75)throw Error(`DECODED_NATIVE_CLIP_INVALID:${clip.name}`)
      verified.encryption=await sealFile(plain,path.join(output,`${clip.name}.sealed`),verified.sourceSha256)
      await unlink(plain)
      record.clips.push(verified)
      console.log(JSON.stringify({scene:clip.name,motionFrames:motion.sampledFrames,uniqueFrames:motion.uniqueFrames,sealedSha256:verified.encryption.sealedSha256}))
    }
    await unlink(raw).catch(()=>{})
    record.complete=record.evidence.continuousJourney&&record.clips.length===7&&record.errors.length===0
  }
}catch(error){record.errors.push(clean(error?.stack||error))}
finally{if(server){server.kill('SIGTERM');server=null}}
record.completedAtUtc=new Date().toISOString()
record.nativeClipsCaptured=record.clips.length
await writeFile(path.join(output,'continuous-motion-receipt.json'),JSON.stringify(record,null,2)+'\n')
await writeFile(path.join(output,'SEALED_SHA256SUMS.txt'),record.clips.map(x=>`${x.encryption.sealedSha256}  ${x.encryption.sealedFile}`).join('\n')+'\n')
console.log(JSON.stringify({complete:record.complete,nativeClipsCaptured:record.nativeClipsCaptured,continuity:record.evidence.continuousJourney,sourceSha,release:'HOLD',errors:record.errors}))
if(!record.complete&&!args.includes('--verify-only'))process.exitCode=2
