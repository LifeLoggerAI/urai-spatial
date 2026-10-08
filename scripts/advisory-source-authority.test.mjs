import assert from 'node:assert/strict'
import test from 'node:test'
import { bindCurrentAdvisoryCheckout, readOfficialAdvisoryHead, requireUnchangedAdvisoryHead, officialAdvisoryRepository } from './advisory-source-authority.mjs'

const first = 'd82b18d960a62832607901fcdf4c9e54fabae4f8'
const successor = '4d346ec8cec9ac2b5f8c602880f039a166679001'
function adapter({remote = successor + '\trefs/heads/main\n', head = successor, origin = officialAdvisoryRepository, status = '', failure} = {}) {
  return args => {
    if (failure) throw failure
    if (args[0] === 'ls-remote') {
      assert.deepEqual(args, ['ls-remote', officialAdvisoryRepository, 'refs/heads/main'])
      return remote
    }
    assert.equal(args[0], '-C'); assert.equal(args[1], '/checkout')
    if (args[2] === 'remote') return origin
    if (args[2] === 'rev-parse') return head
    if (args[2] === 'status') {
      assert.deepEqual(args.slice(2), ['status', '--porcelain', '--untracked-files=all'])
      return status
    }
    throw new Error('Unexpected operation')
  }
}
test('fresh complete successor binds without reusing a predecessor pin', () => {
  assert.equal(bindCurrentAdvisoryCheckout('/checkout', adapter()), successor)
  requireUnchangedAdvisoryHead(successor, adapter())
  assert.equal(bindCurrentAdvisoryCheckout('/checkout', adapter({head:first,remote:first+'\trefs/heads/main\n'})), first)
})
test('stale checkout and during-proof upstream advancement fail closed', () => {
  assert.throws(() => bindCurrentAdvisoryCheckout('/checkout', adapter({head:first})), /Incorrect complete current/)
  assert.throws(() => requireUnchangedAdvisoryHead(first, adapter()), /advanced during proof/)
})
test('empty, malformed, duplicate and wrong-ref authority never becomes acceptance', () => {
  for (const remote of ['', successor, 'not-a-sha\trefs/heads/main', successor+'\trefs/heads/develop', successor+'\trefs/heads/main\n'+first+'\trefs/heads/main']) {
    assert.throws(() => readOfficialAdvisoryHead(adapter({remote})), /Missing or malformed/)
  }
  assert.throws(() => requireUnchangedAdvisoryHead('', adapter()), /advanced/)
})
test('fork origins, local modifications and transport denial fail closed', () => {
  assert.throws(() => bindCurrentAdvisoryCheckout('/checkout', adapter({origin:'https://github.com/other/advisory-database.git'})), /official repository/)
  for (const status of [' M advisories/github-reviewed/a.json', '?? advisories/github-reviewed/new.json']) {
    assert.throws(() => bindCurrentAdvisoryCheckout('/checkout', adapter({status})), /must be clean/)
  }
  const failure = new Error('Transport unavailable')
  assert.throws(() => bindCurrentAdvisoryCheckout('/checkout', adapter({failure})), error => error === failure)
})
