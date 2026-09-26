import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const exactHead = 'a'.repeat(40)
const pointerPredicate = `TimeoutError: locator.click: Timeout 30000ms exceeded.
waiting for getByRole('button', { name: 'Open UrAi Orb companion' })
resolved to <button data-testid="home-semantic-orb">
element is visible, enabled and stable
attempting click action`
const fixture = (predicate = pointerPredicate) => ({
  exactHead,
  failedPredicate: predicate,
  failingRecord: { id: 'orb-lifecycle-production-ui', phase: 'orb-open-keyboard', pageErrors: [], providerBoundaryRequests: [] },
})

async function runBounded(failure, code = 1) {
  const directory = await mkdtemp(path.join(tmpdir(), 'home-bounded-proof-'))
  try {
    await mkdir(path.join(directory, 'scripts/lib'), { recursive: true })
    for (const name of ['run-home-state-proof-bounded.mjs', 'lib/home-orb-reconciliation-signature.mjs']) {
      await cp(new URL(name, import.meta.url), path.join(directory, 'scripts', name))
    }
    // Substitute only the browser child process. Execute the real bounded
    // runner, evidence retention and reconciliation decision as a subprocess.
    await writeFile(path.join(directory, 'scripts/run-home-state-proof-v224.mjs'), `
      import { writeFile } from 'node:fs/promises';
      if (${JSON.stringify(failure)} !== null) await writeFile(process.env.URAI_PROOF_DIR + '/runner-failure.json', ${JSON.stringify(JSON.stringify(failure))});
      process.exitCode = ${code};
    `)
    await writeFile(path.join(directory, 'scripts/reconcile-home-orb-consent-proof.mjs'), `
      import { writeFile } from 'node:fs/promises';
      await writeFile('diagnostic-invoked', 'yes');
    `)
    const result = spawnSync(process.execPath, ['scripts/run-home-state-proof-bounded.mjs'], {
      cwd: directory,
      env: { ...process.env, URAI_EXACT_HEAD: exactHead, URAI_PROOF_DIR: path.join(directory, 'proof') },
      encoding: 'utf8', timeout: 10_000,
    })
    assert.ifError(result.error)
    const status = JSON.parse(await readFile(path.join(directory, 'proof/bounded-attempt-status.json'), 'utf8'))
    const invoked = await readFile(path.join(directory, 'diagnostic-invoked'), 'utf8').then(() => true).catch(() => false)
    return { ...result, receipt: status, invoked }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('keyboard lifecycle failure logs the original phase without pointer reconciliation', async () => {
  const result = await runBounded(fixture('keyboard target home-semantic-orb could not receive focus'))
  assert.equal(result.status, 1)
  assert.equal(result.invoked, false)
  assert.match(result.stderr, /"phase":"orb-open-keyboard"/)
  assert.match(result.stderr, /keyboard target home-semantic-orb could not receive focus/)
  assert.equal(result.receipt.releaseAcceptable, false)
})

test('exact pointer failure may run diagnostics but can never become release acceptance', async () => {
  const result = await runBounded(fixture())
  assert.equal(result.status, 1)
  assert.equal(result.invoked, true)
  assert.equal(result.receipt.reconciled, true)
  assert.equal(result.receipt.passed, false)
  assert.equal(result.receipt.releaseAcceptable, false)
})

test('predecessor evidence never qualifies for reconciliation', async () => {
  const result = await runBounded({ ...fixture(), exactHead: 'b'.repeat(40) })
  assert.equal(result.status, 1)
  assert.equal(result.invoked, false)
  assert.match(result.stderr, /SHA mismatch/)
})

test('missing failure receipt stays failed and reports the missing diagnostic', async () => {
  const result = await runBounded(null)
  assert.equal(result.status, 1)
  assert.equal(result.invoked, false)
  assert.match(result.stderr, /original failure receipt unavailable/)
  assert.equal(result.receipt.releaseAcceptable, false)
})

test('successful original capture is retained without invoking diagnostic recovery', async () => {
  const result = await runBounded(null, 0)
  assert.equal(result.status, 0)
  assert.equal(result.invoked, false)
  assert.equal(result.receipt.passed, true)
  assert.equal(result.receipt.releaseAcceptable, true)
})
