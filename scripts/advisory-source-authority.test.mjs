import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { bindCurrentAdvisoryCheckout, prepareCurrentAdvisoryCheckout, readOfficialAdvisoryHead, requireUnchangedAdvisoryHead, officialAdvisoryRepository } from './advisory-source-authority.mjs'

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

const third = '03bb879f50a204c5bd0be1b28da5b5e268e6e4d3'
const fourth = '95c6e004440bd896c81293383f453f8fef72fb45'
function acquisitionAdapter({ head = first, heads = [successor], origin = officialAdvisoryRepository, status = '', fetchFailure, afterFetch, refuseCheckout = false } = {}) {
  const state = { head, origin, status, operations: [], reads: 0 }
  const git = args => {
    state.operations.push(args)
    if (args[0] === 'ls-remote') {
      assert.deepEqual(args, ['ls-remote', officialAdvisoryRepository, 'refs/heads/main'])
      const current = heads[Math.min(state.reads++, heads.length - 1)]
      return current + '\trefs/heads/main\n'
    }
    assert.equal(args[0], '-C'); assert.equal(args[1], '/checkout')
    if (args[2] === 'remote') return state.origin
    if (args[2] === 'status') return state.status
    if (args[2] === 'rev-parse') return state.head
    if (args[2] === 'fetch') {
      assert.deepEqual(args.slice(2, -1), ['fetch', '--depth=1', '--no-tags', '--filter=blob:none', officialAdvisoryRepository])
      assert.match(args.at(-1), /^[0-9a-f]{40}$/)
      if (fetchFailure) throw fetchFailure
      afterFetch?.(state)
      return ''
    }
    if (args[2] === 'checkout') {
      assert.deepEqual(args.slice(2, -1), ['checkout', '--detach'])
      if (!refuseCheckout) state.head = args.at(-1)
      return ''
    }
    throw new Error('Unexpected acquisition operation')
  }
  return { git, state }
}

test('stable current acquisition does not fetch or represent corpus acceptance', () => {
  const { git, state } = acquisitionAdapter({ head: successor })
  const receipt = prepareCurrentAdvisoryCheckout('/checkout', git)
  assert.equal(receipt.initialCommit, successor)
  assert.equal(receipt.currentCommit, successor)
  assert.equal(receipt.observations.length, 1)
  assert.equal(receipt.completeCorpusAcceptance, false)
  assert.equal(receipt.securityWaiver, false)
  assert.equal(state.operations.some(args => ['fetch', 'checkout'].includes(args[2])), false)
  assert.equal(bindCurrentAdvisoryCheckout('/checkout', git), successor)
})

test('sparse-clone predecessor is refreshed to the observed exact official head before proof', () => {
  const { git, state } = acquisitionAdapter()
  assert.throws(() => bindCurrentAdvisoryCheckout('/checkout', git), /Incorrect complete current/)
  const receipt = prepareCurrentAdvisoryCheckout('/checkout', git)
  assert.equal(receipt.initialCommit, first)
  assert.equal(receipt.currentCommit, successor)
  assert.deepEqual(receipt.observations, [{ attempt: 1, before: first, requested: successor, checkedOut: successor, current: successor }])
  assert.equal(state.operations.filter(args => args[2] === 'fetch').length, 1)
  assert.equal(bindCurrentAdvisoryCheckout('/checkout', git), successor)
})

test('upstream advancement during acquisition acquires the successor and retains each identity', () => {
  const { git, state } = acquisitionAdapter({ heads: [successor, third, third, third] })
  const receipt = prepareCurrentAdvisoryCheckout('/checkout', git)
  assert.equal(receipt.currentCommit, third)
  assert.deepEqual(receipt.observations.map(o => [o.requested, o.current]), [[successor, third], [third, third]])
  assert.deepEqual(state.operations.filter(args => args[2] === 'fetch').map(args => args.at(-1)), [successor, third])
  assert.equal(bindCurrentAdvisoryCheckout('/checkout', git), third)
})

test('continuously advancing official source exhausts a bounded acquisition without acceptance', () => {
  const { git, state } = acquisitionAdapter({ heads: [first, successor, successor, third, third, fourth] })
  assert.throws(() => prepareCurrentAdvisoryCheckout('/checkout', git), /did not stabilize during acquisition/)
  assert.equal(state.reads, 6)
  assert.equal(state.operations.filter(args => args[2] === 'fetch').length, 2)
  assert.throws(() => bindCurrentAdvisoryCheckout('/checkout', git), /Incorrect complete current/)
})

test('acquisition never discards dirty sources, authorizes a fork or retries transport failure', () => {
  for (const options of [
    { origin: 'https://github.com/other/advisory-database.git' },
    { status: ' M advisories/github-reviewed/a.json' },
    { status: '?? advisories/github-reviewed/new.json' },
    { head: 'not-a-sha' },
    { heads: ['not-a-sha'] },
  ]) {
    const { git, state } = acquisitionAdapter(options)
    assert.throws(() => prepareCurrentAdvisoryCheckout('/checkout', git))
    assert.equal(state.operations.some(args => ['fetch', 'checkout'].includes(args[2])), false)
  }
  const failure = new Error('Official fetch unavailable')
  const { git, state } = acquisitionAdapter({ fetchFailure: failure })
  assert.throws(() => prepareCurrentAdvisoryCheckout('/checkout', git), error => error === failure)
  assert.equal(state.operations.filter(args => args[2] === 'fetch').length, 1)
  assert.equal(state.operations.some(args => args[2] === 'checkout'), false)
})

test('fetch-side mutations and an incorrect checkout cannot become fresh-source authority', () => {
  for (const afterFetch of [state => { state.status = ' M advisories/github-reviewed/a.json' }, state => { state.origin = 'https://github.com/other/advisory-database.git' }]) {
    const { git, state } = acquisitionAdapter({ afterFetch })
    assert.throws(() => prepareCurrentAdvisoryCheckout('/checkout', git))
    assert.equal(state.operations.some(args => args[2] === 'checkout'), false)
  }
  const { git } = acquisitionAdapter({ refuseCheckout: true })
  assert.throws(() => prepareCurrentAdvisoryCheckout('/checkout', git), /Incorrect complete current advisory source after acquisition/)
})

test('completed acquisition cannot authorize a later stale start or during-proof advancement', () => {
  const { git } = acquisitionAdapter({ heads: [successor, successor, third] })
  const receipt = prepareCurrentAdvisoryCheckout('/checkout', git)
  assert.throws(() => bindCurrentAdvisoryCheckout('/checkout', git), /Incorrect complete current/)
  assert.throws(() => requireUnchangedAdvisoryHead(receipt.currentCommit, git), /advanced during proof/)
})

function nativeFixture(callback) {
  const root = mkdtempSync(path.join(tmpdir(), 'urai-advisory-acquisition-'))
  const upstream = path.join(root, 'upstream')
  const checkout = path.join(root, 'checkout')
  const native = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const runUpstream = args => native(['-C', upstream, '-c', 'user.name=Advisory fixture', '-c', 'user.email=fixture@example.invalid', ...args])
  const advisoryPath = 'advisories/github-reviewed/fixture/advisory.json'
  try {
    native(['init', '--initial-branch=main', upstream])
    mkdirSync(path.dirname(path.join(upstream, advisoryPath)), { recursive: true })
    writeFileSync(path.join(upstream, advisoryPath), '{"revision":1}\n')
    runUpstream(['add', '.']); runUpstream(['commit', '-m', 'Initial test advisory'])
    const initial = runUpstream(['rev-parse', 'HEAD']).trim()
    native(['clone', '--no-local', '--depth=1', '--sparse', upstream, checkout])
    native(['-C', checkout, 'sparse-checkout', 'set', 'advisories/github-reviewed'])
    native(['-C', checkout, 'remote', 'set-url', 'origin', officialAdvisoryRepository])
    writeFileSync(path.join(upstream, advisoryPath), '{"revision":2}\n')
    runUpstream(['add', '.']); runUpstream(['commit', '-m', 'Successor test advisory'])
    const current = runUpstream(['rev-parse', 'HEAD']).trim()
    let fetches = 0
    const git = args => {
      if (args[0] === 'ls-remote') {
        assert.deepEqual(args, ['ls-remote', officialAdvisoryRepository, 'refs/heads/main'])
        return current + '\trefs/heads/main\n'
      }
      if (args[2] === 'fetch') {
        assert.equal(args.at(-2), officialAdvisoryRepository)
        fetches += 1
        // Only the fixture transport is substituted; fetch/checkout/status use native Git.
        return native([...args.slice(0, -2), upstream, args.at(-1)])
      }
      return native(args)
    }
    callback({ checkout, advisoryPath, initial, current, git, native, fetchCount: () => fetches })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('native sparse Git acquisition replaces predecessor bytes and remains strictly bindable', () => {
  nativeFixture(({ checkout, advisoryPath, initial, current, git, native, fetchCount }) => {
    assert.equal(readFileSync(path.join(checkout, advisoryPath), 'utf8'), '{"revision":1}\n')
    assert.throws(() => bindCurrentAdvisoryCheckout(checkout, git), /Incorrect complete current/)
    const receipt = prepareCurrentAdvisoryCheckout(checkout, git)
    assert.equal(receipt.initialCommit, initial)
    assert.equal(receipt.currentCommit, current)
    assert.equal(fetchCount(), 1)
    assert.equal(native(['-C', checkout, 'rev-parse', 'HEAD']).trim(), current)
    assert.equal(readFileSync(path.join(checkout, advisoryPath), 'utf8'), '{"revision":2}\n')
    assert.equal(native(['-C', checkout, 'status', '--porcelain', '--untracked-files=all']).trim(), '')
    assert.equal(bindCurrentAdvisoryCheckout(checkout, git), current)
    requireUnchangedAdvisoryHead(current, git)
  })
})

test('native dirty sparse Git acquisition preserves local bytes and predecessor without fetching', () => {
  nativeFixture(({ checkout, advisoryPath, initial, git, native, fetchCount }) => {
    writeFileSync(path.join(checkout, advisoryPath), '{"privateLocalChange":true}\n')
    assert.throws(() => prepareCurrentAdvisoryCheckout(checkout, git), /must be clean/)
    assert.equal(fetchCount(), 0)
    assert.equal(native(['-C', checkout, 'rev-parse', 'HEAD']).trim(), initial)
    assert.equal(readFileSync(path.join(checkout, advisoryPath), 'utf8'), '{"privateLocalChange":true}\n')
  })
})
