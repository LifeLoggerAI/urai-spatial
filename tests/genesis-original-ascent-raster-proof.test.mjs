import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { inspectAscentRasterFrames } from '../scripts/genesis-original-ascent-raster-proof.mjs'

const width = 16, height = 12, frames = 24
const makeFrames = generate => {
  const bytes = Buffer.alloc(width * height * frames)
  for (let i=0; i<frames; i++) for (let px=0; px<width*height; px++)
    bytes[i*width*height+px] = generate(i,px)
  return bytes
}
const inspect = data => inspectAscentRasterFrames(data,{width,height})

test('sustained decoded scene travel passes both early and late interior halves', () => {
  const result = inspect(makeFrames((f,px) => (px*5 + f*13) % 256))
  assert.equal(result.verified,true)
  assert.ok(result.strongPairs>=6)
  assert.ok(result.firstHalfStrongPairs>=3)
  assert.ok(result.secondHalfStrongPairs>=3)
})

test('a completely frozen Ascent fails despite enough video frames', () => {
  const r=inspect(makeFrames(()=>60))
  assert.equal(r.verified,false)
  assert.equal(r.strongPairs,0)
})

test('one abrupt dark transition fails sustained-movement requirement', () => {
  const r=inspect(makeFrames((f)=>f<12?20:190))
  assert.equal(r.verified,false)
  assert.ok(r.strongPairs<4)
})

test('a short middle burst of movement cannot replace continuous motion',()=>{
  const r=inspect(makeFrames((f,px)=>f>=10&&f<=12?(px*11+f*21)%256:44))
  assert.equal(r.verified,false)
})

test('moving only a tiny fraction of a frame cannot pass',()=>{
  const r=inspect(makeFrames((f,px)=>px<2?(f*23)%256:60))
  assert.equal(r.verified,false)
})

test('moving only first half cannot prove second half of journey',()=>{
  const r=inspect(makeFrames((f,px)=>f<12?(px*7+f*25)%256:50))
  assert.equal(r.verified,false)
  assert.ok(r.secondHalfStrongPairs<2)
})

test('truncated, malformed or too-short pixel buffers are rejected',()=>{
  assert.throws(()=>inspect(Buffer.alloc(17)),/ASCENT_RASTER_DECODED_BYTES_INVALID/)
  assert.throws(()=>inspect(makeFrames(()=>60).subarray(0,16*12*9)),/ASCENT_RASTER_FRAMES_INSUFFICIENT/)
  assert.throws(()=>inspectAscentRasterFrames(Buffer.alloc(100),{width:2,height:2}),/ASCENT_RASTER_DECODED_BYTES_INVALID/)
})

test('proof module requires authentic decoded source frames, never synthesized screenshot motion',async()=>{
  const file=await readFile(new URL('../scripts/genesis-original-ascent-raster-proof.mjs', import.meta.url),'utf8')
  assert.match(file,/ffmpeg/)
  assert.match(file,/SOURCE_ASCENT_INTERIOR_RASTER_MOTION_UNPROVEN/)
  assert.doesNotMatch(file,/fade=|zoompan=|minterpolate=|loop=1/)
})
