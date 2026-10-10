import assert from 'node:assert/strict'
import test from 'node:test'
import { parseHomeReturnCheckpoint, saveHomeReturnCheckpoint, peekHomeReturnCheckpoint, requestedHomeReturnCheckpoint, clearHomeReturnCheckpoint, homeReturnHref } from '../src/spatial/navigation/homeReturnCheckpoint.ts'
const now = Date.now()
const pose = { kind: 'ascent', position: [-2, 1.8, 6], groundPosition: [-2, .12, 6], firstControl: [-2, 17, 6], secondControl: [0, 37, -54], endPosition: [0, 44, -54], startYaw: -.8, startPitch: .18, endYaw: 0, endPitch: .46, fov: 50, duration: 3.4 }
const record = { ...pose, version: 1, id: 'fixture-1', savedAt: now }
test('checkpoint rejects nonfinite, out-of-world, malformed and expired poses', () => {
  assert.ok(parseHomeReturnCheckpoint(record, now))
  for (const patch of [{ position: [NaN, 1, 0] }, { groundPosition: [99, 0, 0] }, { position: [0, 100, 0] }, { endPosition: [0, Infinity, 0] }, { startYaw: NaN }, { fov: 0 }, { duration: 99 }, { version: 2 }, { id: '../other' }, { id: undefined }, { savedAt: now - 86400001 }]) assert.equal(parseHomeReturnCheckpoint({ ...record, ...patch }, now), null)
})
test('checkpoint is copied and latest intent wins; stale return URLs cannot consume a newer Home pose', () => {
  const first = saveHomeReturnCheckpoint(pose)
  assert.ok(first)
  pose.position[0] = -3
  assert.equal(peekHomeReturnCheckpoint().position[0], -2)
  assert.equal(requestedHomeReturnCheckpoint(new URLSearchParams({ homeReturn: first.id })).id, first.id)
  assert.equal(requestedHomeReturnCheckpoint(new URLSearchParams(`homeReturn=${first.id}&homeReturn=${first.id}`)), null)
  const second = saveHomeReturnCheckpoint(pose)
  clearHomeReturnCheckpoint(first.id)
  assert.equal(peekHomeReturnCheckpoint().id, second.id)
  assert.equal(requestedHomeReturnCheckpoint(new URLSearchParams({ homeReturn: first.id })), null)
  clearHomeReturnCheckpoint(second.id)
  assert.equal(peekHomeReturnCheckpoint(), null)
})
test('return URL retains only a uniquely disclosed demo and the actual same-tab checkpoint', () => {
  const c = saveHomeReturnCheckpoint(pose)
  const url = new URL(homeReturnHref('demo=1&memoryId=private&token=secret'), 'https://urai.invalid')
  assert.equal(url.searchParams.get('homeReturn'), c.id)
  assert.equal(url.searchParams.get('demo'), '1')
  assert.equal(url.searchParams.get('memoryId'), null)
  assert.equal(url.searchParams.get('token'), null)
  for (const search of ['', 'demo=0', 'demo=1&demo=0', 'demo=1&demo=1']) assert.equal(new URL(homeReturnHref(search), 'https://urai.invalid').searchParams.has('demo'), false)
  clearHomeReturnCheckpoint(c.id)
  assert.equal(new URL(homeReturnHref(''), 'https://urai.invalid').searchParams.get('homeReturn'), 'descent')
})

test('blocked optional session storage preserves same-tab pose and never traps travel', () => {
  const original = globalThis.window
  globalThis.window = { get sessionStorage() { throw new Error('disabled') } }
  try {
    const c = saveHomeReturnCheckpoint(pose)
    assert.ok(c)
    assert.equal(peekHomeReturnCheckpoint().id, c.id)
    assert.equal(requestedHomeReturnCheckpoint(new URLSearchParams({ homeReturn: c.id })).id, c.id)
    clearHomeReturnCheckpoint(c.id)
    assert.equal(peekHomeReturnCheckpoint(), null)
  } finally {
    if (original === undefined) delete globalThis.window
    else globalThis.window = original
  }
})


test('finite multi-revolution manual yaw is admitted as an equivalent bounded orientation', () => {
  const c = parseHomeReturnCheckpoint({ ...record, startYaw: 80 * Math.PI + .91, endYaw: -60 * Math.PI - .4 }, now)
  assert.ok(c)
  assert.ok(Math.abs(c.startYaw - .91) < 1e-10)
  assert.ok(Math.abs(c.endYaw + .4) < 1e-10)
})
