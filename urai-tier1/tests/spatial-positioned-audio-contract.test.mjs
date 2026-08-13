import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
const positioned=fs.readFileSync('src/spatial/audio/SpatialPositionedAudioRuntime.tsx','utf8')
const ambient=fs.readFileSync('src/spatial/audio/SpatialAmbientRuntime.tsx','utf8')
const shell=fs.readFileSync('src/spatial/world/UraiWorldShell.tsx','utf8')
test('world mounts consent-gated HRTF cue rendering',()=>{assert.match(shell,/SpatialPositionedAudioRuntime/);assert.match(positioned,/panningModel: 'HRTF'/);assert.match(positioned,/distanceModel: 'inverse'/);assert.match(positioned,/createConvolver/);assert.match(positioned,/urai:audio-consent/);assert.match(positioned,/urai:audio-mute/);assert.match(positioned,/credentials: 'same-origin'/)})
test('ambient owner delegates one-shot cues',()=>{assert.match(ambient,/CUE_CAPTIONS/);assert.doesNotMatch(ambient,/audio\.playCue\(cue\)/);assert.doesNotMatch(ambient,/audio\.playCue\('transition'\)/)})
