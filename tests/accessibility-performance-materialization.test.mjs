import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const independentPath = 'urai-tier1/tests/accessibility-performance-lifemap-independent.spec.ts'
const canonicalHomePath = 'urai-tier1/tests/accessibility-performance-canonical-home-travel.spec.ts'
const workflowPath = '.github/workflows/accessibility-performance-evidence.yml'
const configPath = 'playwright.accessibility.config.ts'

async function withFixture(run) {
  const fixture = await mkdtemp(path.join(tmpdir(), 'urai-a11y-materialization-'))
  try {
    await cp(path.join(repo, 'scripts'), path.join(fixture, 'scripts'), {
      recursive: true,
      filter: (entry) => entry === path.join(repo, 'scripts') || path.basename(entry).startsWith('materialize-accessibility-performance-'),
    })
    await cp(path.join(repo, 'urai-tier1/tests'), path.join(fixture, 'urai-tier1/tests'), {
      recursive: true,
      filter: (entry) => entry === path.join(repo, 'urai-tier1/tests') || path.basename(entry).startsWith('accessibility-performance-'),
    })
    return await run(fixture)
  } finally {
    await rm(fixture, { recursive: true, force: true })
  }
}

function materialize(fixture) {
  return spawnSync(process.execPath, ['scripts/materialize-accessibility-performance-current-v5.mjs'], {
    cwd: fixture,
    encoding: 'utf8',
    timeout: 30_000,
  })
}

test('full v5 materialization preserves the audited current Life Map proof byte-for-byte', async () => {
  const checkedIn = await readFile(path.join(repo, independentPath))
  const checkedInHome = await readFile(path.join(repo, canonicalHomePath))
  await withFixture(async (fixture) => {
    const result = materialize(fixture)
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    assert.equal(result.stdout.split('Preserved audited current Life Map proof unchanged').length - 1, 3)
    assert.deepEqual(await readFile(path.join(fixture, independentPath)), checkedIn)
    assert.deepEqual(await readFile(path.join(fixture, canonicalHomePath)), checkedInHome)
    assert.match(result.stdout, /Preserved audited current Home semantic-link destination identity/)
    assert.match(result.stdout, /Materialized current accessibility-performance v5 proof/)
    assert.match(result.stdout, /Materialized atomic Focus camera telemetry proof/)
  })
  assert.deepEqual(await readFile(path.join(repo, independentPath)), checkedIn, 'The functional test must not materialize checked-in tests')
  assert.deepEqual(await readFile(path.join(repo, canonicalHomePath)), checkedInHome, 'The functional test must not materialize checked-in Home tests')
})

test('full v5 materialization rejects an unknown Life Map proof instead of accepting weakened assertions', async () => {
  await withFixture(async (fixture) => {
    const target = path.join(fixture, independentPath)
    const source = await readFile(target, 'utf8')
    const altered = source.replace("expect(focusUrl.searchParams.get('manifestId')).toBe('replay-recovery-thread')", "expect(focusUrl.searchParams.get('manifestId')).toBeTruthy()")
    assert.notEqual(altered, source)
    await writeFile(target, altered)
    const result = materialize(fixture)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Life Map current proof source is not the audited form/)
    assert.equal(await readFile(target, 'utf8'), altered)
  })
})


test('full v5 materialization rejects altered current Home authority without rewriting its assertions', async () => {
  await withFixture(async (fixture) => {
    const target = path.join(fixture, canonicalHomePath)
    const source = await readFile(target, 'utf8')
    const altered = source.replace("await expect(target).toBeEnabled()", "await expect(target).toBeVisible()")
    assert.notEqual(altered, source)
    await writeFile(target, altered)
    const result = materialize(fixture)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /canonical Home semantic navigation contract expected 1 audited occurrence/)
    assert.equal(await readFile(target, 'utf8'), altered)
  })
})

test('accessibility evidence keeps one diagnostic retry but fails closed on recovered Playwright flakes', async () => {
  const workflow = await readFile(path.join(repo, workflowPath), 'utf8')
  const config = await readFile(path.join(repo, configPath), 'utf8')

  assert.match(config, /retries:\s*1\b/, 'one retry is retained only to capture diagnostic evidence')
  assert.match(workflow, /Recovered Playwright flake is a release failure/)
  assert.match(workflow, /grep -Eq '[^']*flaky[^']*' "\$test_log"/)
  assert.match(workflow, /test_status=86/)
  assert.match(workflow, /if \[\[ "\$test_status" -ne 0 \]\]; then/)
})
