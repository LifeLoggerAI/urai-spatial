import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { beginAscentCameraSampler, bindAscentTelemetryToVideo } from '../scripts/genesis-ascent-camera-sampler.mjs'

const revision='07892c7d549f8eafe160184315c4db3f7bfcb624'
const pause = ms => new Promise(r => setTimeout(r, ms))

test('samples actual DOM-facing camera callback rows, drops duplicate ticks and inactive frames', async () => {
  let n=0
  const page={evaluate:async()=>{
    const tick=++n
    if(tick < 3)return null
    return{ticks:Math.floor((tick-1)/2),progress:Math.min(1,(tick-2)/14),position:[0,1.5+(tick-2)*3,0]}
  }}
  const sampler=beginAscentCameraSampler(page,25)
  await pause(440)
  const rows=await sampler.stop()
  assert.ok(rows.length>=5)
  for(let i=1;i<rows.length;i++) assert.ok(rows[i].ticks>rows[i-1].ticks)
  assert.ok(rows.every(row=>Number.isFinite(row.seconds)&&row.position.length===3))
})

test('private evidence binds real bytes, does not create approvals',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'urai-ascent-private-'))
  try{
    const video=path.join(root,'TEST-NONVIDEO.data')
    await writeFile(video,Buffer.alloc(12000,0x61))
    const out=path.join(root,'telemetry.json')
    const samples=Array.from({length:12},(_,i)=>({ticks:i+1,seconds:i*.3,progress:i/11,position:[0,i*3,0]}))
    const r=await bindAscentTelemetryToVideo({videoFile:video,outputFile:out,applicationRevision:revision,samples})
    assert.equal(r.buildProvenance,'DECLARED_SHA_NOT_INDEPENDENTLY_ATTESTED')
    assert.equal(r.humanReviewApproved,false)
    assert.match(r.sourceVideoSha256,/^[a-f0-9]{64}$/)
    assert.deepEqual(JSON.parse(await readFile(out,'utf8')).samples,samples)
    await assert.rejects(bindAscentTelemetryToVideo({videoFile:video,outputFile:out,applicationRevision:revision,samples}),/EEXIST/)
  }finally{await rm(root,{recursive:true,force:true})}
})

test('rejects original app revision and forged incomplete samples',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'urai-ascent-private-'))
 try{
  const video=path.join(root,'TEST.data');await writeFile(video,Buffer.alloc(12000,97))
  const outputFile=path.join(root,'evidence.json')
  await assert.rejects(bindAscentTelemetryToVideo({videoFile:video,outputFile,applicationRevision:'94c8a2cf68a436a0c49e80b3a09578935df12d48',samples:[1]}),/CORRECTED_BUILD_SHA_REQUIRED/)
  await assert.rejects(bindAscentTelemetryToVideo({videoFile:video,outputFile,applicationRevision:revision,samples:[]}),/CAMERA_CALLBACK_SAMPLES_MISSING/)
 }finally{await rm(root,{recursive:true,force:true})}
})
