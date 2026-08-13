import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

const manifest = read('src/spatial/motion/motionManifest.ts')
const orchestrator = read('src/spatial/motion/MotionOrchestrator.tsx')
const styles = read('src/spatial/motion/motionOrchestration.css')
const shell = read('src/spatial/world/UraiWorldShell.tsx')
const audioBridge = read('src/spatial/narrator/SpatialAudioNarratorBridge.tsx')
const voiceBridge = read('src/spatial/narrator/NarratorVoiceBridge.tsx')
const destinations = read('src/spatial/world/destinationRegistry.ts')

const cues = [
  'sky_pressure_roll',
  'timeline_warp',
  'orb_refusal_dim',
  'orb_threshold_fracture',
  'body_thin_fade',
  'withdrawal_thin_pass',
  'silence_hold_frame',
  'app_boot_intro',
  'map_enter_zoom',
  'replay_enter_curtain',
  'ritual_seal_mark',
  'bloom_archive_fold',
  'trust_reveal_still',
]

const destinationIds = [
  'home',
  'infrastructure-hub',
  'life-map',
  'mirror',
  'shadow',
  'council',
  'passport',
  'privacy-controls',
  'location-map',
  'focus',
  'replay',
]

test('final animation manifest contains exactly the thirteen governed cues', () => {
  for (const cue of cues) assert.match(manifest, new RegExp(`id: '${cue}'`), cue)
  assert.match(manifest, /length !== 13/)
  assert.match(manifest, /rive-stateful/)
  assert.match(manifest, /lottie-one-shot/)
  assert.match(manifest, /reducedMotionDurationMs/)
})

test('silence, refusal, and withdrawal cannot manufacture audio', () => {
  for (const cue of ['orb_refusal_dim', 'withdrawal_thin_pass', 'silence_hold_frame']) {
    const start = manifest.indexOf(`${cue}: {`)
    const end = manifest.indexOf('\n  },', start)
    const block = manifest.slice(start, end)
    assert.match(block, /audioPolicy: 'silence'/, cue)
  }

  const silenceStart = audioBridge.indexOf('const handleSilence')
  const silenceEnd = audioBridge.indexOf('window.addEventListener', silenceStart)
  const silenceHandler = audioBridge.slice(silenceStart, silenceEnd)
  assert.doesNotMatch(silenceHandler, /playSpatialBreath/)
  assert.match(orchestrator, /activate\('silence_hold_frame', 'narrator'\)/)
})

test('motion is mounted once at the persistent world boundary and has reduced-motion CSS', () => {
  assert.match(shell, /import MotionOrchestrator/)
  assert.equal((shell.match(/<MotionOrchestrator \/>/g) ?? []).length, 1)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(orchestrator, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/)
})

test('every registered world destination travels through a governed motion path', () => {
  for (const destination of destinationIds) {
    assert.match(destinations, new RegExp(`id: '${destination}'`), destination)
  }
  assert.match(orchestrator, /pendingTravel\.destination === 'life-map'/)
  assert.match(orchestrator, /activate\('map_enter_zoom', 'world-transition'\)/)
  assert.match(orchestrator, /pendingTravel\.destination === 'replay'/)
  assert.match(orchestrator, /activate\('replay_enter_curtain', 'world-transition'\)/)
  assert.match(orchestrator, /phase === 'descending'/)
  assert.match(orchestrator, /activate\('body_thin_fade', 'world-transition'\)/)
  assert.match(orchestrator, /phase === 'ascending' \|\| phase === 'travelling'/)
  assert.match(orchestrator, /activate\('timeline_warp', 'world-transition'\)/)
})

test('focus and replay narration cannot outrun their motion lead', () => {
  assert.match(voiceBridge, /minimumMotionLead/)
  assert.match(voiceBridge, /URAI_MOTION_MANIFEST\.replay_enter_curtain\.narrationLeadMs/)
  assert.match(voiceBridge, /URAI_MOTION_MANIFEST\.timeline_warp\.narrationLeadMs/)
  assert.match(voiceBridge, /Math\.max\(0, detail\.timing\?\.delayMs \?\? 0, minimumMotionLead\(detail\)\)/)
})

test('the motion overlay cannot block interaction or flash aggressively', () => {
  assert.match(styles, /pointer-events: none/)
  assert.doesNotMatch(styles, /steps\(/)
  assert.doesNotMatch(styles, /animation-iteration-count:\s*infinite/)
})
