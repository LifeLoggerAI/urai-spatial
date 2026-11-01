import test from 'node:test'
import assert from 'node:assert/strict'
import {segmentsFromEvents} from '../scripts/genesis-original-motion-intervals.mjs'

const realOnlyFixture=[
  ['home',300],['home-first-person',4200],['home-ascent',5000],
  ['life-map-overview',9000],['memory-star',14100],['focus',15000],
  ['replay',19000],['replay-playback-began',19300],
  ['replay-playback-end',24200],['return-focus',26800],
  ['return-life-map-selected',28700],['return-life-map-overview',31000],
  ['return-home',35000],['orb-clicked',35200],['orb-end',38500],
].map(([id,ms])=>({id,ms}))

test('seven intervals are derived only from one ordered event timeline',()=>{
  const segments=segmentsFromEvents(realOnlyFixture)
  assert.deepEqual(segments.map(x=>x.name),['home','orb','ascent','life-map','focus','replay','return'])
  assert.equal(segments.find(x=>x.name==='ascent').sourceStartSeconds,4.2)
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
