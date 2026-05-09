import assert from 'node:assert/strict'
import test from 'node:test'
import { synthesizePrivateMemoryManifest, buildFirestoreMemoryWrite } from '../src/spatial/intelligence/privateMemorySynthesis'
import { buildCausalInsightEngine, explainCausalEdge } from '../src/spatial/intelligence/causalInsightEngine'
import { buildSubMapClusters, subMapModeCopy } from '../src/spatial/modes/subMapModes'
import { buildCinematicDirectorPreset, directorPresetCssVars } from '../src/spatial/cinematic/directorPolish'
import { buildSpatialRoomPlan, canEnterSpatialRoom } from '../src/spatial/xr/spatialRoomPlan'
import { buildGalaxySimulationBudget, shouldUseGpuGalaxy } from '../src/spatial/performance/galaxySimulation'
import { buildAudioReactivePlan, assertNoAutostartAudio } from '../src/spatial/audio/audioReactiveSafety'

test('private Firestore synthesis turns raw private signals into redacted manifest writes', () => {
  const manifest = synthesizePrivateMemoryManifest({
    ownerId: 'adam',
    memoryId: 'winter-recovery',
    signals: [
      {
        signalId: 'voice-1',
        kind: 'voice',
        capturedAt: '2026-01-10T10:00:00.000Z',
        summary: 'recovery arc returning to calm after stress',
        emotionalTone: 'strain to steadiness',
        intensity: 0.88,
        confidence: 0.91,
        season: 'Winter 2026',
        tags: ['recovery'],
      },
      {
        signalId: 'health-1',
        kind: 'health',
        capturedAt: '2026-01-10T11:00:00.000Z',
        summary: 'body settled after overload',
        intensity: 0.72,
        confidence: 0.84,
      },
    ],
  })

  assert.equal(manifest.manifestId, 'private-winter-recovery')
  assert.equal(manifest.sourceType, 'private')
  assert.equal(manifest.privacyState, 'private')
  assert.equal(manifest.emotionalWeather, 'recovery')
  assert.equal(manifest.replayReady, true)
  assert.match(manifest.narratorLine || '', /without exposing raw capture data/)

  const write = buildFirestoreMemoryWrite(manifest)
  assert.equal(write.collectionPath, 'assetManifests')
  assert.equal(write.documentId, manifest.manifestId)
  assert.equal(write.data.rawSignalsRedacted, true)
})

test('causal insight engine produces review-safe causal hypotheses', () => {
  const highLoad = synthesizePrivateMemoryManifest({
    ownerId: 'adam',
    memoryId: 'stress',
    signals: [{ signalId: 's1', kind: 'device', capturedAt: '2026-01-01T00:00:00Z', summary: 'overstimulated stress overload', intensity: 0.95, confidence: 0.9 }],
  })
  const recovery = synthesizePrivateMemoryManifest({
    ownerId: 'adam',
    memoryId: 'recover',
    signals: [{ signalId: 's2', kind: 'health', capturedAt: '2026-01-02T00:00:00Z', summary: 'recovery calm steady', intensity: 0.8, confidence: 0.88 }],
  })

  const insight = buildCausalInsightEngine([highLoad, recovery])
  assert.ok(insight.edges.length >= 1)
  assert.match(insight.safetyNote, /hypotheses/)
  assert.match(explainCausalEdge(insight.edges[0]), /confidence/)
})

test('dream relationship and recovery sub-map modes are derived from manifests', () => {
  const dream = synthesizePrivateMemoryManifest({
    ownerId: 'adam',
    memoryId: 'dream',
    signals: [{ signalId: 'd1', kind: 'dream', capturedAt: '2026-01-01T00:00:00Z', summary: 'dream symbol night memory', intensity: 0.6, confidence: 0.7 }],
  })
  const relationship = synthesizePrivateMemoryManifest({
    ownerId: 'adam',
    memoryId: 'relationship',
    signals: [{ signalId: 'r1', kind: 'relationship', capturedAt: '2026-01-01T00:00:00Z', summary: 'conversation with familiar voice', intensity: 0.7, confidence: 0.82, personIds: ['p1'] }],
  })
  const recovery = synthesizePrivateMemoryManifest({
    ownerId: 'adam',
    memoryId: 'recovery',
    signals: [{ signalId: 'h1', kind: 'health', capturedAt: '2026-01-01T00:00:00Z', summary: 'recovery calm after threshold', intensity: 0.8, confidence: 0.8 }],
  })
  const clusters = buildSubMapClusters([dream, relationship, recovery])

  assert.equal(clusters.length, 3)
  assert.ok(clusters.find((cluster) => cluster.mode === 'dream')?.manifestIds.includes(dream.manifestId))
  assert.ok(clusters.find((cluster) => cluster.mode === 'relationship')?.manifestIds.includes(relationship.manifestId))
  assert.ok(clusters.find((cluster) => cluster.mode === 'recovery')?.manifestIds.includes(recovery.manifestId))
  assert.match(subMapModeCopy('relationship'), /Relationship Constellation/)
})

test('cinematic director, GPU galaxy, XR rooms, and audio reactive plans stay safety/performance bounded', () => {
  const preset = buildCinematicDirectorPreset({ mode: 'replay', quality: 'ultra' })
  assert.equal(preset.transitionCue, 'star-fly-in-aura-bloom')
  assert.ok(preset.particleBudget > 1000)
  assert.equal(directorPresetCssVars(preset)['--urai-director-particles'], String(preset.particleBudget))

  const reducedPreset = buildCinematicDirectorPreset({ mode: 'dream', reducedMotion: true })
  assert.equal(reducedPreset.motionSafe, true)
  assert.equal(reducedPreset.cameraDolly, 0)

  const room = buildSpatialRoomPlan({ roomId: 'private-room', mode: 'vr', manifestIds: ['m1', 'm1', 'm2'] })
  assert.equal(room.rawCaptureAllowed, false)
  assert.equal(room.requiresExplicitEntry, true)
  assert.equal(room.manifestIds.length, 2)
  assert.equal(canEnterSpatialRoom(room), true)

  const galaxy = buildGalaxySimulationBudget({ quality: 'ultra', deviceMemoryGb: 16 })
  assert.equal(galaxy.targetFps, 60)
  assert.equal(shouldUseGpuGalaxy(galaxy), true)

  const safeAudio = buildAudioReactivePlan({ requested: true, userGesture: false, microphoneConsent: false })
  assert.equal(safeAudio.usesMicrophone, false)
  assert.equal(assertNoAutostartAudio(safeAudio), true)

  const privateAudio = buildAudioReactivePlan({ requested: true, userGesture: true, microphoneConsent: true })
  assert.equal(privateAudio.usesMicrophone, true)
  assert.equal(privateAudio.storesRawAudio, false)
})
