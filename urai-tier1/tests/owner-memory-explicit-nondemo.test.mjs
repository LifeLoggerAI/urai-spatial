import assert from 'node:assert/strict'
import test from 'node:test'
import {
  readOwnerMemoryEvidence,
  readOwnerMemoryRenderEvidence,
} from '../src/lib/server/owner-memory-evidence.ts'

// R1716: synthetic, read-only documents. These tests never enable private
// playback, register a Privacy render purpose or create Jobs credentials.
function fixture() {
  const memoryPath = 'users/ownerA/memories/memoryA'
  const policyPath = 'users/ownerA/privacyPolicy/current'
  const docs = {
    [memoryPath]: {
      ownerId: 'ownerA',
      deleted: false,
      demo: false,
      consentState: 'granted',
      replayManifest: { id: 'manifestA', version: 7 },
      sourceMedia: [{ url: 'gs://do-not-return-private-data' }],
    },
    [policyPath]: {
      ownerId: 'ownerA',
      domains: { memory: { mode: 'granted' } },
      enforcement: { state: 'fully-enforced' },
    },
  }
  const paths = []
  const reader = {
    doc(path) {
      paths.push(path)
      return {
        async get() {
          return { exists: Object.hasOwn(docs, path), data: () => docs[path] }
        },
      }
    },
  }
  return {
    docs, paths, reader, memoryPath, policyPath,
    input: {
      verifiedOwnerUid: 'ownerA',
      memoryId: 'memoryA',
      expectedManifestId: 'manifestA',
    },
  }
}

test('R1716 positive render identity requires explicit stored demo false', async () => {
  const f = fixture()
  const result = await readOwnerMemoryRenderEvidence(f.input, f.reader)
  assert.deepEqual(result, {
    status: 'ready',
    selectedMemory: {
      id: 'memoryA', ownerId: 'ownerA', deleted: false, demo: false,
      replayManifest: { id: 'manifestA', version: 7 },
    },
  })
  assert.deepEqual(f.paths, [f.memoryPath, f.policyPath])
  assert.doesNotMatch(JSON.stringify(result), /gs:\/\/|sourceMedia|signedUrl|jobId/i)
})

for (const [name, demo] of [
  ['missing', undefined],
  ['null', null],
  ['explicit demo', true],
  ['string true', 'true'],
  ['string false', 'false'],
  ['numeric zero', 0],
  ['numeric one', 1],
]) {
  test('R1716 private render fails closed for ' + name + ' demo field', async () => {
    const f = fixture()
    if (demo === undefined) delete f.docs[f.memoryPath].demo
    else f.docs[f.memoryPath].demo = demo
    const result = await readOwnerMemoryRenderEvidence(f.input, f.reader)
    assert.equal(result.status, 'unavailable')
    assert.equal('selectedMemory' in result, false)
    assert.deepEqual(f.paths, [f.memoryPath, f.policyPath])
  })
}

test('R1716 legacy identity-only read preserves response shape for missing demo', async () => {
  const f = fixture()
  delete f.docs[f.memoryPath].demo
  assert.deepEqual(await readOwnerMemoryEvidence(f.input, f.reader), {
    status: 'ready',
    selectedMemory: {
      id: 'memoryA', ownerId: 'ownerA', deleted: false, demo: false,
      replayManifest: { id: 'manifestA' },
    },
  })
})

test('R1716 legacy identity read still rejects explicit demo true', async () => {
  const f = fixture()
  f.docs[f.memoryPath].demo = true
  const result = await readOwnerMemoryEvidence(f.input, f.reader)
  assert.equal(result.status, 'unavailable')
})
