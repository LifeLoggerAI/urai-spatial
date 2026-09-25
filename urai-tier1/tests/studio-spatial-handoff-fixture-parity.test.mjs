import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import {
  STUDIO_SPATIAL_HANDOFF_CONTRACT_VERSION,
  validateStudioSpatialExport,
} from '../src/lib/studio-spatial-handoff.ts'

const fixture = JSON.parse(
  fs.readFileSync(new URL('./fixtures/studio-spatial-export-0.2.0.json', import.meta.url), 'utf8'),
)

test('Spatial accepts the mirrored Studio 0.2.0 producer fixture', () => {
  assert.equal(STUDIO_SPATIAL_HANDOFF_CONTRACT_VERSION, '0.2.0')
  assert.equal(fixture.contractVersion, '0.2.0')
  assert.equal(fixture.releaseEvidence.validatorVersion, '0.2.0')

  const result = validateStudioSpatialExport(fixture)
  assert.equal(result.ok, true, result.errors.join('\n'))
  assert.deepEqual(result.rejectedRuntimeTargets, [])
})

test('mirrored Studio fixture remains hard-off for live XR targets', () => {
  const payload = structuredClone(fixture)
  payload.runtimeTargets = ['web-spatial', 'webxr']
  const result = validateStudioSpatialExport(payload)
  assert.equal(result.ok, false)
  assert.ok(result.rejectedRuntimeTargets.includes('webxr'))
})
