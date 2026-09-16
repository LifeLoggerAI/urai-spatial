import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const tierRoot = process.cwd()
const repositoryRoot = path.resolve(tierRoot, '..')
const controller = fs.readFileSync(path.join(tierRoot, 'src/spatial/audio/useAudioController.ts'), 'utf8')
const runtime = fs.readFileSync(path.join(tierRoot, 'src/spatial/audio/SpatialAmbientRuntime.tsx'), 'utf8')
const mirrorIdentity = fs.readFileSync(path.join(tierRoot, 'src/spatial/audio/mirrorSonicIdentity.ts'), 'utf8')
const audioTypes = fs.readFileSync(path.join(tierRoot, 'src/spatial/audio/audioTypes.ts'), 'utf8')
const shell = fs.readFileSync(path.join(tierRoot, 'src/spatial/world/UraiWorldShell.tsx'), 'utf8')
const companion = fs.readFileSync(path.join(tierRoot, 'src/spatial/world/PersistentWorldCompanion.tsx'), 'utf8')
const orbConversation = fs.readFileSync(path.join(tierRoot, 'src/spatial/orb/OrbConversationPanel.tsx'), 'utf8')
const generator = fs.readFileSync(path.join(repositoryRoot, 'scripts/generate-production-spatial-audio.py'), 'utf8')
const forgeWorkflow = fs.readFileSync(path.join(repositoryRoot, '.github/workflows/production-spatial-audio-forge.yml'), 'utf8')
const receipt = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'operations/assets/production-receipts/spatial-audio-production-v1.json'), 'utf8'))

const expectedAssets = [
  'home-ambient-v1.opus',
  'ground-ambient-v1.opus',
  'life-map-ambient-v1.opus',
  'focus-ambient-v1.opus',
  'replay-ambient-v1.opus',
  'portal-transition-v1.opus',
  'orb-confirm-v1.opus',
  'ui-error-v1.opus',
]

test('production audio receipt proves the eight-file verified Opus pack', () => {
  assert.equal(receipt.schemaVersion, 'urai-spatial-production-audio-1')
  assert.equal(receipt.verification?.passed, true)
  assert.equal(receipt.historicalEightSecondProofBedPromoted, false)
  assert.equal(receipt.assets?.length, 8)
  for (const fileName of expectedAssets) {
    const asset = receipt.assets.find((entry) => entry.path.endsWith(`/${fileName}`))
    assert.ok(asset, `missing production audio receipt entry ${fileName}`)
    assert.equal(asset.codec, 'opus')
    assert.equal(asset.channels, 2)
    assert.ok(asset.integratedLufs <= -16, `${fileName} loudness exceeds policy`)
    assert.ok(asset.truePeakDbtp <= -1, `${fileName} true peak exceeds policy`)
    assert.ok(asset.caption?.length > 0, `${fileName} requires accessible caption metadata`)
  }
  const ambient = receipt.assets.filter((entry) => entry.role === 'ambient')
  assert.equal(ambient.length, 5)
  assert.ok(ambient.every((entry) => entry.durationSeconds >= 59), 'all file-backed ambient beds must be long-form')
})

test('production audio receipt generation binds provenance to the exact forge input head', () => {
  assert.match(generator, /source_head = os\.environ\.get\("SOURCE_SHA"\) or os\.environ\.get\("GITHUB_SHA", "local"\)/)
  assert.match(generator, /"sourceHead": source_head/)
  assert.match(generator, /"sourceHeadSemantics": "exact-forge-input-head"/)
  assert.match(forgeWorkflow, /SOURCE_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/)
  assert.match(forgeWorkflow, /receipt\['sourceHead'\] == os\.environ\['SOURCE_SHA'\]/)
  assert.match(forgeWorkflow, /receipt\['sourceHeadSemantics'\] == 'exact-forge-input-head'/)
})

test('canonical controller loads promoted production audio paths and a separately governed Mirror generator', () => {
  for (const fileName of expectedAssets) assert.match(controller, new RegExp(fileName.replaceAll('.', '\\.')))
  assert.doesNotMatch(controller, /\/audio\/ambient\//)
  assert.match(controller, /GROUND: "ground"/)
  assert.match(controller, /ASCENT: "lifemap"/)
  assert.match(controller, /MIRROR: "mirror"/)
  assert.match(controller, /createMirrorSonicIdentity/)
  assert.match(controller, /mirrorIdentityRef/)
  assert.match(controller, /Math\.min\(0\.14, 0\.08 \+ intensity \* 0\.04\)/)
  assert.match(controller, /playCue/)
  assert.match(controller, /stopAmbient/)
})

test('Mirror sonic identity is deterministic, restrained, non-rhythmic and bounded', () => {
  assert.match(audioTypes, /\| "MIRROR"/)
  assert.match(audioTypes, /\| "mirror"/)
  assert.match(mirrorIdentity, /MIRROR_MAX_LEVEL = 0\.18/)
  assert.match(mirrorIdentity, /MIRROR_NOISE_SEED = 0x4d495252/)
  assert.match(mirrorIdentity, /Math\.imul\(state, 1664525\) \+ 1013904223/)
  assert.match(mirrorIdentity, /low\.frequency\.value = 73\.42/)
  assert.match(mirrorIdentity, /upper\.frequency\.value = 116\.54/)
  assert.match(mirrorIdentity, /no rhythmic pulse/)
  assert.doesNotMatch(mirrorIdentity, /setInterval|Math\.random/)
})

test('shared world runtime owns explicit consent, mute, route ambience and accessible equivalents', () => {
  assert.match(shell, /<SpatialAmbientRuntime \/>/)
  assert.match(runtime, /urai:spatial-audio-consent-v1/)
  assert.match(runtime, /urai:spatial-audio-muted-v1/)
  assert.match(runtime, /destination\s*===\s*'infrastructure-hub'[\s\S]*return\s*'GROUND'/)
  assert.match(runtime, /destination\s*===\s*'life-map'[\s\S]*return\s*'LIFEMAP'/)
  assert.match(runtime, /destination\s*===\s*'focus'[\s\S]*return\s*'FOCUS'/)
  assert.match(runtime, /destination\s*===\s*'replay'[\s\S]*return\s*'REPLAY'/)
  assert.match(runtime, /destination\s*===\s*'mirror'[\s\S]*return\s*'MIRROR'/)
  assert.match(runtime, /near-silent reflective room tone/)
  assert.match(runtime, /passport: 'Passport is silence-first/)
  assert.match(runtime, /urai:audio-consent/)
  assert.match(runtime, /urai:audio-mute/)
  assert.match(runtime, /urai:audio-cue/)
  assert.match(runtime, /const handleConsent[\s\S]*if\s*\(spatialPhase\)[\s\S]*audio\.setAmbientPhase\(spatialPhase\)/)
  assert.match(runtime, /const handleMute[\s\S]*if\s*\(consented\s*&&\s*spatialPhase\)\s*audio\.setAmbientPhase\(spatialPhase\)/)
  assert.match(runtime, /role="status"/)
  assert.match(runtime, /aria-live="polite"/)
  assert.match(runtime, /data-audio-consent/)
  assert.match(runtime, /data-audio-muted/)
})

test('Passport remains silence-first while explicit cue vocabulary has audible, caption and haptic equivalents', () => {
  assert.match(audioTypes, /"confirm" \| "permission"/)
  assert.match(runtime, /confirm:'Action confirmed\.'/)
  assert.match(runtime, /permission:'Permission action acknowledged\.'/)
  assert.match(runtime, /if\(consented&&!muted\)audio\.playCue\(cue\)/)
  assert.match(runtime, /cue==='permission'\)navigator\.vibrate\(12\)/)
  assert.match(runtime, /cue==='confirm'\|\|cue==='orb-confirm'\)navigator\.vibrate\(8\)/)
  assert.doesNotMatch(runtime, /destination==='passport'[^\n]*return 'MIRROR'/)
})

test('Orb controls expose user-owned sound enable and mute behavior', () => {
  assert.match(companion, /aria-pressed=\{audioEnabled\}/)
  assert.match(companion, /Enable spatial sound/)
  assert.match(companion, /Mute spatial sound/)
  assert.match(companion, /urai:audio-consent/)
  assert.match(companion, /urai:audio-mute/)
  assert.match(companion, /cue: 'orb-confirm'/)
})

test('Orb provider success and failure paths emit production confirmation and error cues', () => {
  assert.match(orbConversation, /emitAudioCue\('orb-confirm'\)/)
  assert.match(orbConversation, /emitAudioCue\('error'\)/)
  assert.match(orbConversation, /catch \(error\)[\s\S]*emitAudioCue\('error'\)/)
})
