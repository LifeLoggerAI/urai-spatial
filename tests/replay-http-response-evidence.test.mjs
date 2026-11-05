import test from 'node:test'
import assert from 'node:assert/strict'
import { redactReplayHttpUrl, describeReplayHttpError } from './replay-http-response-evidence.mjs'

function mockedResponse(status, target, options = {}) {
  return {
    status: () => status, url: () => target,
    request: () => ({
      resourceType: () => options.resourceType ?? 'image',
      method: () => options.method ?? 'GET',
      frame: () => options.noFrame ? (() => { throw Error('No frame') })() : { url: () => options.frameUrl ?? 'http://127.0.0.1:3001/replay?demo=1' },
      headers: () => ({ referer: options.referer ?? 'http://127.0.0.1:3001/replay?token=secret' }),
      redirectedFrom: () => null, redirectedTo: () => null,
    }),
  }
}

test('captures failing request path without leaking signed query values', () => {
  const result = describeReplayHttpError(mockedResponse(404,
    'http://127.0.0.1:3001/assets/memory.glb?sig=private123&token=secret456',
    { resourceType: 'fetch' }))
  assert.equal(result.status, 404)
  assert.equal(result.url, 'http://127.0.0.1:3001/assets/memory.glb?sig=[redacted]&token=[redacted]')
  assert.equal(result.resourceType, 'fetch')
  assert.equal(result.pageUrl, 'http://127.0.0.1:3001/replay?demo=[redacted]')
  assert.equal(result.referrer, 'http://127.0.0.1:3001/replay?token=[redacted]')
  assert.ok(!JSON.stringify(result).includes('private123'))
  assert.ok(!JSON.stringify(result).includes('secret456'))
})

test('ignores successful and redirect responses', () => {
  for (const status of [200, 201, 204, 301, 302, 304, 307, 308, 399])
    assert.equal(describeReplayHttpError(mockedResponse(status, 'http://example.test/asset')), null)
})

test('records denied requests even without a frame', () => {
  const result = describeReplayHttpError(mockedResponse(403,
    'http://example.test/private/asset', { noFrame: true, method: 'POST', resourceType: 'xhr' }))
  assert.equal(result.status, 403)
  assert.equal(result.method, 'POST')
  assert.equal(result.resourceType, 'xhr')
  assert.equal(result.pageUrl, null)
})

test('invalid URLs are safely bounded', () => {
  assert.equal(redactReplayHttpUrl('not-a-uri?secret=s3cr3t'), '<invalid-url>')
  assert.equal(redactReplayHttpUrl(null), null)
})
