import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:net'
import { allocateEphemeralPort, ownedChildExited, waitForOwnedHome } from './spatial-owned-server.mjs'

const ownedMarkup = '<html data-urai-domain="app" data-urai-surface="spatial"><body data-urai-home-spatial-shell="true"><main>Home</main></body></html>'
const html = (status, body = ownedMarkup) => ({ status, headers: { get: () => 'text/html; charset=utf-8' }, text: async () => body })

test('port selection avoids an occupied server port', async () => {
  const existing = createServer()
  await new Promise(resolve => existing.listen(0, '127.0.0.1', resolve))
  try {
    const selected = await allocateEphemeralPort()
    assert.equal(Number.isInteger(selected), true)
    assert.notEqual(selected, existing.address().port)
  } finally {
    await new Promise(resolve => existing.close(resolve))
  }
})

test('an unrelated 404 cannot qualify as an owned Home route', async () => {
  let calls = 0
  await assert.rejects(waitForOwnedHome('http://127.0.0.1:32143', { exitCode: null, signalCode: null }, {
    fetchImpl: async () => { calls++; return html(404) },
    timeoutMs: 4, intervalMs: 1,
  }), /URAI_OWNED_HOME_NOT_READY/)
  assert.ok(calls > 0)
})

test('unrelated HTTP 200 JSON cannot qualify as Home HTML', async () => {
  const reply = { status: 200, headers: { get: () => 'application/json' } }
  await assert.rejects(waitForOwnedHome('http://127.0.0.1:32143', null, {
    fetchImpl: async () => reply,
    timeoutMs: 4, intervalMs: 1,
  }), /URAI_OWNED_HOME_NOT_READY/)
})

test('already exited child aborts before attempting another port', async () => {
  let called = false
  assert.equal(ownedChildExited({ exitCode: 1, signalCode: null }), true)
  await assert.rejects(waitForOwnedHome('http://127.0.0.1:32143', { exitCode: 1, signalCode: null }, {
    fetchImpl: async () => { called = true; return html(200) },
  }), /URAI_OWNED_SERVER_EXITED_BEFORE_READY/)
  assert.equal(called, false)
})

test('real owned-route HTTP 200 HTML is accepted', async () => {
  const seen = []
  await waitForOwnedHome('http://127.0.0.1:32143', { exitCode: null, signalCode: null }, {
    fetchImpl: async (url, options) => { seen.push({ url, options }); return html(200) },
  })
  assert.equal(seen.length, 1)
  assert.equal(new URL(seen[0].url).pathname, '/home')
  assert.equal(seen[0].options.redirect, 'manual')
})

test('null child is valid only for caller-authorized existing server', async () => {
  assert.equal(ownedChildExited(null), false)
  await waitForOwnedHome('http://127.0.0.1:32143', null, {
    fetchImpl: async () => html(200),
  })
})

test('a foreign HTML 200 must never certify the original UrAi server', async () => {
  await assert.rejects(waitForOwnedHome('http://127.0.0.1:32143', null, {
    fetchImpl: async () => html(200, '<html><body>Other website</body></html>'),
    timeoutMs: 5, intervalMs: 1,
  }), /URAI_OWNED_HOME_NOT_READY/)
})

test('partial or spoofed UrAi marker text outside the document root does not grant readiness', async () => {
  for (const payload of [
    '<html><body>data-urai-domain="app" data-urai-surface="spatial" data-urai-home-spatial-shell="true"</body></html>',
    '<html data-urai-domain="app"><body data-urai-home-spatial-shell="true"></body></html>',
    '<html data-urai-domain="app" data-urai-surface="spatial"><body>Other website</body></html>',
  ]) {
    await assert.rejects(waitForOwnedHome('http://127.0.0.1:32143', null, {
      fetchImpl: async () => html(200, payload),
      timeoutMs: 4, intervalMs: 1,
    }), /URAI_OWNED_HOME_NOT_READY/)
  }
})
