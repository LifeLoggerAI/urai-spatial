import test from 'node:test'
import assert from 'node:assert/strict'
import {segmentsFromEvents} from '../scripts/genesis-original-motion-intervals.mjs'

const realOnlyFixture=[
  ['home',300],['home-first-person',4700],['home-ascent',5200],
  ['life-map-overview',9000],['memory-star',14100],['focus',15000],
  ['replay',19000],['replay-playback-began',19300],
  ['replay-playback-end',24200],['return-focus',26800],
  ['return-life-map-selected',28700],['return-life-map-overview',31000],
  ['return-home',35000],['orb-clicked',35200],['orb-end',38500],
].map(([id,ms])=>({id,ms}))

test('seven intervals are derived only from one ordered event timeline',()=>{
  const segments=segmentsFromEvents(realOnlyFixture)
  assert.deepEqual(segments.map(x=>x.name),['home','orb','ascent','life-map','focus','replay','return'])
  assert.equal(segments.find(x=>x.name==='ascent').sourceStartSeconds,4.7)
  assert.equal(segments.find(x=>x.name==='ascent').sourceEndSeconds,9)
  assert.equal(segments.find(x=>x.name==='orb').sourceStartSeconds,35)
  assert.equal(segments.find(x=>x.name==='orb').sourceEndSeconds,38.5)
})
test('missing camera journey checkpoints fail closed',()=>{
  assert.throws(()=>segmentsFromEvents(realOnlyFixture.filter(x=>x.id!=='life-map-overview')),/REQUIRED_REAL_JOURNEY_CHECKPOINT_MISSING/)
})
test('too-short or reversed real capture intervals fail closed',()=>{
  const slow=realOnlyFixture.map(x=>x.id==='orb-end'?{...x,ms:36000}:x)
  assert.throws(()=>segmentsFromEvents(slow),/INSUFFICIENT_SOURCE_JOURNEY_DURATION:orb/)
  const reversed=realOnlyFixture.map(x=>x.id==='orb-clicked'?{...x,ms:39000}:x)
  assert.throws(()=>segmentsFromEvents(reversed),/NONMONOTONIC_SOURCE_JOURNEY_EVENTS/)
})
test('invented duplicate checkpoints fail closed',()=>{
  assert.throws(()=>segmentsFromEvents([...realOnlyFixture,{id:'home',ms:41000}]),/DUPLICATE_SOURCE_JOURNEY_CHECKPOINT/)
})

// The private native renderer has a fixed 30-second edit: 4s Home, 3s Orb,
// 4s real Ascent, 5s LifeMap, 3s Focus, 3s Replay, 4s Return.
// The source recorder must refuse a film-ineligible capture *before* sealing.
test('seven genuine source segments cover their full editorial windows plus encode margin',()=>{
  const target={home:4,orb:3,ascent:4,'life-map':5,focus:3,replay:3,return:4}
  const segments=segmentsFromEvents(realOnlyFixture)
  for (const clip of segments) assert.ok(clip.sourceDurationSeconds>=target[clip.name]+.25,
    `${clip.name} has insufficient unmodified source footage for the native editorial cut`)
  assert.equal(Object.values(target).reduce((a,b)=>a+b,4),30)
})
test('old Home dwell shorter than the finished film must be refused',()=>{
  const shortHome=realOnlyFixture.map(e=>e.id==='home-first-person'?{...e,ms:4200}:e)
  assert.throws(()=>segmentsFromEvents(shortHome),/INSUFFICIENT_SOURCE_JOURNEY_DURATION:home/)
})
test('old 3-second Orb capture cannot meet final edit safety margin',()=>{
  const shortOrb=realOnlyFixture.map(e=>e.id==='orb-end'?{...e,ms:38000}:e)
  assert.throws(()=>segmentsFromEvents(shortOrb),/INSUFFICIENT_SOURCE_JOURNEY_DURATION:orb/)
})
test('short genuine sky ascent is rejected, never padded with generated motion',()=>{
  const shortAscent=realOnlyFixture.map(e=>e.id==='life-map-overview'?{...e,ms:8600}:e)
  assert.throws(()=>segmentsFromEvents(shortAscent),/INSUFFICIENT_SOURCE_JOURNEY_DURATION:ascent/)
})
