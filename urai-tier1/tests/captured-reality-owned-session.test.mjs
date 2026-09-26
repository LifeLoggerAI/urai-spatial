import assert from 'node:assert/strict'
import test from 'node:test'
import { PerspectiveCamera, Vector4 } from 'three'
import { streamCapturedRealitySplat } from '../src/spatial/captured-reality/capturedRealitySplatStream.ts'
import { createCapturedRealitySplatSession } from '../src/spatial/captured-reality/capturedRealitySplatSession.ts'
import { capturedSplatSortWorker } from '../src/spatial/captured-reality/capturedRealitySplatResources.ts'

// Synthetic format fixture only: this is not a trained scene or a GPU receipt.
function fixture(count = 3) {
  const bytes = new Uint8Array(count * 32)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < count; i++) {
    view.setFloat32(i * 32, i, true)
    view.setFloat32(i * 32 + 8, 2 + i, true)
    for (let axis = 0; axis < 3; axis++) view.setFloat32(i * 32 + 12 + axis * 4, .2, true)
    bytes.set([255, 120, 80, 255, 255, 128, 128, 128], i * 32 + 24)
  }
  return bytes
}
const response = (bytes, length = bytes.length) => new Response(bytes, { headers: { 'content-length': String(length) } })
const config = (extra = {}) => ({ url: 'https://private.invalid/synthetic', maxBytes: 4096, maxTextureSize: 64, chunkSize: 1, alphaHash: true, ...extra })

test('stream batches split network records, enforce exact lengths and erase staging bytes', async () => {
  const data = fixture()
  const chunks = []
  const fetched = []
  const stream = new ReadableStream({ start(controller) { controller.enqueue(data.slice(0, 7)); controller.enqueue(data.slice(7, 51)); controller.enqueue(data.slice(51)); controller.close() } })
  const receipt = await streamCapturedRealitySplat({ ...config(), signal: new AbortController().signal,
    fetcher: async (_, options) => { fetched.push(options); return new Response(stream, { headers: { 'content-length': '96' } }) },
    onHeader: (bytes) => assert.equal(bytes, 96), onChunk: (chunk) => { assert.equal(chunk.length, 32); chunks.push(chunk) },
  })
  assert.deepEqual(receipt, { byteSize: 96, pointCount: 3 })
  assert.equal(chunks.length, 3)
  assert.ok(chunks.every((chunk) => chunk.every((byte) => byte === 0)))
  assert.equal(fetched[0].cache, 'no-store')
  assert.equal(fetched[0].redirect, 'error')
  assert.equal(fetched[0].credentials, 'omit')
})

test('actual renderer GET rejects oversized, truncated, invalid and wholly invisible records', async () => {
  const valid = fixture()
  const invalid = fixture(); new DataView(invalid.buffer).setFloat32(12, NaN, true)
  const invisible = fixture(); for (let i = 27; i < invisible.length; i += 32) invisible[i] = 0
  for (const [bytes, declared] of [[valid, 64], [valid, 128], [invalid, 96], [invisible, 96]]) {
    const session = createCapturedRealitySplatSession(config({ fetcher: async () => response(bytes, declared) }))
    await assert.rejects(session.completion, /could not be displayed/)
    assert.equal(session.disposed, true)
  }
})

test('completed sessions own independent textures and erase all retained arrays on idempotent disposal', async () => {
  const resources = []
  const sessions = [0, 1].map(() => createCapturedRealitySplatSession(config({ fetcher: async () => response(fixture()), onResource: (resource) => resources.push(resource) })))
  await Promise.all(sessions.map((session) => session.completion))
  assert.notEqual(resources[0].centers, resources[1].centers)
  assert.equal(resources[0].loadedPoints, 3)
  assert.equal(resources[0].mesh.geometry.instanceCount, 3)
  const events = []
  for (const object of [resources[0].centers, resources[0].covariances, resources[0].mesh.geometry, resources[0].mesh.material]) object.addEventListener('dispose', () => events.push(object))
  sessions[0].dispose(); sessions[0].dispose()
  assert.equal(events.length, 4)
  assert.ok(resources[0].centers.image.data.every((value) => value === 0))
  assert.ok(resources[0].covariances.image.data.every((value) => value === 0))
  assert.equal(resources[0].mesh.visible, false)
  assert.equal(resources[1].disposed, false)
  sessions[1].dispose()
})

test('exit aborts a pending read, cancels its reader and suppresses late progress', async () => {
  let cancelled = 0
  let progress = 0
  let resource
  let receivedHeader
  const ready = new Promise((resolve) => { receivedHeader = resolve })
  const session = createCapturedRealitySplatSession(config({
    fetcher: async () => new Response(new ReadableStream({ cancel() { cancelled++ } }), { headers: { 'content-length': '32' } }),
    onResource(value) { resource = value; receivedHeader() }, onProgress() { progress++ },
  }))
  await ready
  session.dispose()
  await assert.rejects(session.completion, { name: 'AbortError' })
  assert.equal(cancelled, 1)
  assert.equal(progress, 0)
  assert.equal(resource.disposed, true)
})

test('sorted mode terminates workers and rejects late worker messages after exit', async () => {
  let terminated = 0
  let resource
  const posted = []
  const worker = { onmessage: null, onerror: null, terminate() { terminated++ }, postMessage(data) { posted.push(data) } }
  const session = createCapturedRealitySplatSession(config({ alphaHash: false, workerFactory: () => worker, fetcher: async () => response(fixture()), onResource(value) { resource = value } }))
  await session.completion
  resource.update(new PerspectiveCamera(60, 1, .1, 100), new Vector4(0, 0, 100, 100))
  assert.equal(posted.filter((entry) => entry.method === 'push').length, 3)
  assert.equal(posted.at(-1).method, 'sort')
  const lateMessage = worker.onmessage
  session.dispose()
  lateMessage({ data: { indices: new Uint32Array([0, 1, 2]).buffer } })
  assert.equal(terminated, 1)
  assert.equal(worker.onmessage, null)
  assert.equal(resource.mesh.geometry.instanceCount, 0)
})

test('sorting worker orders visible points back to front and excludes points behind the camera', () => {
  let indices
  const worker = { postMessage(data) { indices = new Uint32Array(data.indices) } }
  capturedSplatSortWorker(worker)
  worker.onmessage({ data: { method: 'push', capacity: 4, points: new Float32Array([0, 0, -2, 1, 0, 0, -9, 1, 0, 0, 2, 1, 0, 0, -4, 1]).buffer } })
  worker.onmessage({ data: { method: 'sort', view: [0, 0, 1, 0] } })
  assert.deepEqual([...indices], [1, 3, 0])
})
