import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const read = (path) => fs.readFileSync(path, 'utf8')
const visualWrapper = read('../scripts/run-continuous-spatial-proof-v19-portal-stable.mjs')
const portalWrapper = read('../scripts/run-continuous-spatial-proof-v18-portal-stable.mjs')
const stableWrapper = read('../scripts/run-continuous-spatial-proof-v18-stable.mjs')
const visualCapture = read('../scripts/capture-continuous-spatial-proof-v18.mjs')
const canonicalVisualWrapper = read('../scripts/run-canonical-live-visual-audit-current-home.mjs')
const mirrorReleaseProof = read('../tests/mirror-release-proof.mjs')
const mirrorReleaseRunner = read('../tests/mirror-release-proof-runner.mjs')
const mirrorMobile = read('src/app/mirror/mirror-mobile-inspection.css')
const selectedMemory = read('src/spatial/memory/selectedMemoryContract.ts')
const worldTypes = read('src/spatial/world/worldTypes.ts')
const worldState = read('src/spatial/world/WorldStateProvider.tsx')
const worldTransition = read('src/spatial/world/WorldTransitionController.tsx')

test('continuous visual proof follows its real wrapper chain to effective ancestor visibility', async () => {
  assert.match(visualWrapper, /new URL\('\.\/run-continuous-spatial-proof-v18-portal-stable\.mjs', import\.meta\.url\)/)
  assert.match(portalWrapper, /new URL\('\.\/capture-continuous-spatial-proof-v18\.mjs', import\.meta\.url\)/)
  assert.match(portalWrapper, /new URL\('\.\/run-continuous-spatial-proof-v18-stable\.mjs', import\.meta\.url\)/)
  assert.match(stableWrapper, /new URL\('\.\/capture-continuous-spatial-proof-v18\.mjs', import\.meta\.url\)/)
  const parsed = ts.createSourceFile('capture.mjs', visualCapture, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const declarations = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'visibleCount')
  assert.equal(declarations.length, 1, 'the active capture owns exactly one visibility predicate')
  const count = vm.runInNewContext(`(${declarations[0].getText(parsed)})`, {
    getComputedStyle: node => node.style, innerWidth: 390, innerHeight: 844,
  })
  const node = ({ parent = null, style = {}, rect = {}, srOnly = false } = {}) => ({
    parentElement: parent,
    style: { display: 'block', visibility: 'visible', opacity: '1', ...style },
    closest: () => srOnly ? {} : null,
    getBoundingClientRect: () => ({ width: 48, height: 48, left: 10, right: 58, top: 10, bottom: 58, ...rect }),
  })
  const measure = (...nodes) => count({ evaluateAll: callback => callback(nodes) })
  assert.equal(await measure(node()), 1)
  assert.equal(await measure(node({ parent: node({ style: { opacity: '0' } }) })), 0)
  assert.equal(await measure(node({ parent: node({ style: { display: 'none' } }) })), 0)
  assert.equal(await measure(node({ parent: node({ style: { visibility: 'hidden' } }) })), 0)
  assert.equal(await measure(node({ parent: node({ style: { visibility: 'collapse' } }) })), 0)
  assert.equal(await measure(node({ style: { opacity: '0.1' }, parent: node({ style: { opacity: '0.1' } }) })), 0)
  assert.equal(await measure(node({ style: { opacity: '0.3' }, parent: node({ style: { opacity: '0.5' } }) })), 1)
  assert.equal(await measure(node({ srOnly: true })), 0)
  assert.equal(await measure(node({ rect: { width: 0 } })), 0)
  assert.equal(await measure(node({ rect: { left: 400, right: 448 } })), 0)
  assert.equal(await measure(node(), node()), 2, 'duplicate visible owners remain observable')
})

test('canonical visual proof materializes the current bare Mirror entry contract', () => {
  assert.match(canonicalVisualWrapper, /retired Mirror audit marker/)
  assert.match(canonicalVisualWrapper, /\[data-testid=\"mirror-bare-entry\"\]/)
  assert.match(canonicalVisualWrapper, /Choose what Mirror may open\./)
  assert.match(canonicalVisualWrapper, /Open disclosed demo/)
  assert.match(canonicalVisualWrapper, /Open Passport/)
})

test('Mirror browser proof validates accepted mobile suppression without reconciliation', () => {
  assert.match(mirrorReleaseProof, /const reflectionAction = page\.getByRole\('button', \{ name: 'Inspect Body rhythm evidence', exact: true \}\)/)
  assert.match(mirrorReleaseProof, /if \(deviceName === 'desktop'\) await reflectionAction\.click\(\)\s*else await reflectionAction\.waitFor\(\{ state: 'hidden' \}\)/s)
  assert.match(mirrorReleaseProof, /mobileOrbHiddenDuringInspection: deviceName === 'mobile'/)
  assert.match(mirrorReleaseProof, /timeout: 60000/)
  assert.match(mirrorReleaseProof, /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)/)
  assert.match(mirrorReleaseProof, /getByTestId\('urai-replay-surface'\)\.waitFor\(\{ state: 'attached', timeout: 45000 \}\)/)
  assert.match(mirrorReleaseProof, /\[data-testid="cinematic-replay-client"\]\[data-memory-id="demo:quiet-reset"\]/)
  assert.doesNotMatch(mirrorReleaseProof, /getByTestId\('cinematic-replay-client'\)\s*\n\s*await replay\.waitFor\(\{ state: 'visible' \}\)/)
  assert.match(mirrorReleaseRunner, /failed without reconciliation/)
  assert.doesNotMatch(mirrorReleaseRunner, /reconciledCases|intentional mobile Orb suppression|Replay screenshot timeout/)
})

for (const result of [{ code: 0, signal: null }, { code: 7, signal: null }, { code: null, signal: 'SIGTERM' }]) {
  test(`Mirror proof runner retains original exit ${result.code} / ${result.signal ?? 'no signal'}`, async () => {
    const process = { execPath: '/node', env: { URAI_PROOF_SOURCE_SHA: 'exact-tested-source' }, exitCode: 0 }
    const spawned = [], messages = [], errors = []
    const source = mirrorReleaseRunner.replace(/^import[^\n]*\n/gm, '')
    await vm.runInNewContext(`(async () => {${source}\n})()`, {
      process,
      console: { log: message => messages.push(message), error: message => errors.push(message) },
      spawn: (command, args, options) => {
        spawned.push({ command, args: [...args], options })
        return { once(event, callback) { if (event === 'exit') queueMicrotask(() => callback(result.code, result.signal)) } }
      },
    })
    assert.equal(spawned.length, 1, 'a failed journey must not spawn a replacement capture')
    assert.deepEqual(spawned[0].args, ['tests/mirror-release-proof.mjs'])
    assert.equal(spawned[0].options.env, process.env)
    assert.equal(spawned[0].options.stdio, 'inherit')
    if (result.code === 0 && !result.signal) {
      assert.equal(process.exitCode, 0)
      assert.deepEqual(messages, ['MIRROR_RELEASE_PROOF_RUNNER_PASSED_ORIGINAL'])
      assert.deepEqual(errors, [])
    } else {
      assert.equal(process.exitCode, result.code ?? 1)
      assert.deepEqual(messages, [])
      assert.match(errors[0], /failed without reconciliation/)
      assert.ok(errors[0].includes(`code=${result.code} signal=${result.signal || 'none'}`))
    }
  })
}

test('Mirror inspector removes competing help and mobile hit owners while pinning semantic thresholds', () => {
  assert.match(mirrorMobile, /body:has\(\.mirrorWorld \.mirrorInspection\) \.urai-movement-help/)
  assert.match(mirrorMobile, /body:has\(\.mirrorWorld \.mirrorInspection\) \.urai-world-companion/)
  assert.match(mirrorMobile, /display: none !important/)
  assert.match(mirrorMobile, /> div,/)
  assert.match(mirrorMobile, /canvas \{/)
  assert.match(mirrorMobile, /pointer-events: none !important/)
  assert.match(mirrorMobile, /\.mirrorThresholds \{/)
  assert.match(mirrorMobile, /z-index: 100 !important/)
  assert.match(mirrorMobile, /isolation: isolate/)
  assert.match(mirrorMobile, /\.mirrorThresholds button \{/)
  assert.match(mirrorMobile, /z-index: 101/)
  assert.match(mirrorMobile, /pointer-events: auto/)
})

test('selected-memory replay fragments are canonicalized by timestamp and cover the final segment', () => {
  assert.match(selectedMemory, /const chronologicalSegments = \[\.\.\.segments\]\.sort/)
  assert.match(selectedMemory, /left\.startsAtMs - right\.startsAtMs/)
  assert.match(selectedMemory, /const hasCanonicalChronology = CANONICAL_REPLAY_PHASES\.every/)
  assert.match(selectedMemory, /const hasNonOverlappingChronology = chronologicalSegments\.every/)
  assert.match(selectedMemory, /segment\.startsAtMs === 0/)
  assert.match(selectedMemory, /replaySegments\.length !== CANONICAL_REPLAY_PHASES\.length/)
  assert.match(selectedMemory, /segments\.length !== replaySegments\.length/)
  assert.match(selectedMemory, /const finalSegmentEndMs = finalSegment \? finalSegment\.startsAtMs \+ finalSegment\.durationMs : -1/)
  assert.match(selectedMemory, /requestedDurationMs >= finalSegmentEndMs/)
  assert.match(selectedMemory, /segments: chronologicalSegments/)
})

test('world travel preserves explicit demo identity through reverse navigation', () => {
  assert.match(worldTypes, /demo\?: boolean/)
  assert.match(worldTypes, /\| 'demo'/)
  assert.match(worldState, /const demo = params\.get\('demo'\) === '1'/)
  assert.match(worldState, /demo: true/)
  assert.match(worldTransition, /'demo',/)
  assert.match(worldTransition, /if \(context\?\.demo\) target\.searchParams\.set\('demo', '1'\)/)
  assert.match(worldTransition, /demo: currentWorld\.demo/)
})
