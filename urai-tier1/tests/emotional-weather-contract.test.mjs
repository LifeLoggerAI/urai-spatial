import assert from 'node:assert/strict'
import test from 'node:test'
import { deriveEmotionalWeather, correctEmotionalWeather } from '../src/lib/uraiEmotion/weather.ts'

const state=(override={})=>({
  primary:'calm',secondary:undefined,blends:[{key:'calm',weight:.9}],
  intensity:.55,volatility:.1,valence:.45,arousal:.2,clarity:.9,
  symbolicWeight:.4,archetype:'Seeker',updatedAt:1234,...override,
})

test('personal Emotional Weather supports the governed six labels without diagnostic claims',()=>{
  for(const primary of ['calm','joy','grief','fear','hope','overload']){
    const reading=deriveEmotionalWeather(state({primary,blends:[{key:primary,weight:.9}]}))
    assert.equal(reading.medicalDiagnosis,false)
    assert.ok(['Calm','Reflective','Energized','Heavy','Uncertain','Hopeful'].includes(reading.weather))
  }
})

test('disabled weather returns no inferred state',()=>{
  const reading=deriveEmotionalWeather(state(),{enabled:false})
  assert.equal(reading.weather,null)
  assert.equal(reading.source,'disabled')
})

test('manual user override is authoritative and explicit',()=>{
  const reading=deriveEmotionalWeather(state({primary:'overload'}),{enabled:true,manualOverride:'Calm'})
  assert.equal(reading.weather,'Calm')
  assert.equal(reading.source,'manual')
  assert.equal(reading.confidence,1)
})

test('low-clarity volatile inference resolves to uncertain',()=>{
  const reading=deriveEmotionalWeather(state({primary:'focus',clarity:.1,volatility:.9,blends:[{key:'focus',weight:.3}]}))
  assert.equal(reading.weather,'Uncertain')
  assert.equal(reading.uncertain,true)
})

test('correction produces a user-authored state rather than rewriting inference confidence',()=>{
  const corrected=correctEmotionalWeather(deriveEmotionalWeather(state()),'Hopeful')
  assert.equal(corrected.weather,'Hopeful')
  assert.equal(corrected.source,'manual')
  assert.equal(corrected.confidence,1)
})
