import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const authorityPath = new URL('../urai-tier1/src/app/currentHomeVisualAuthority.json', import.meta.url)
const authority = JSON.parse(await readFile(authorityPath, 'utf8'))
const supportedAuthoritySchemas = new Set(['urai-home-visual-authority-1', 'urai-home-visual-authority-2'])
if (!supportedAuthoritySchemas.has(authority.schemaVersion)) throw new Error(`Home visual authority schema is unsupported: ${authority.schemaVersion}`)
if (!authority.rendererOwner || !authority.artRevision || !authority.worldIdentifier || !authority.proofSchema) {
  throw new Error('Home visual authority is missing a required identity field')
}
if (!Array.isArray(authority.runtimeAssets) || authority.runtimeAssets.length < 4 || !authority.runtimeAssets.includes(authority.rendererOwner)) {
  throw new Error('Home visual authority runtime asset inventory is incomplete')
}
if (authority.artRevision !== 'v288-cinematic-lived-world-grounded-reliquary') {
  throw new Error(`Home state proof expected V288 authority; received ${authority.artRevision}`)
}

const capturePath = new URL('./capture-home-state-proof.mjs', import.meta.url)
const generatedPath = new URL('./.capture-home-state-proof-v288.generated.mjs', import.meta.url)
const original = await readFile(capturePath, 'utf8')
const stalePredicate = "record.movement === 'walk-keyboard-click-touch'"
const currentPredicate = "record.movement === 'camera-look-world-surface-selection'"
const currentPredicateCount = original.split(currentPredicate).length - 1
if (currentPredicateCount !== 1 || original.includes(stalePredicate)) {
  throw new Error('Home state proof movement predicate is not bound exactly once to the current first-person authority')
}
const derived = original

await writeFile(generatedPath, derived, 'utf8')
let result
try {
  result = spawnSync(process.execPath, ['scripts/.capture-home-state-proof-v288.generated.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  })
} finally {
  await rm(generatedPath, { force: true }).catch(() => {})
}

if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
if (result.status !== 0) {
  const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-state-proof')
  await mkdir(outputDir, { recursive: true })
  let failingRecord = null
  try {
    const receipt = JSON.parse(await readFile(path.join(outputDir, 'receipt.json'), 'utf8'))
    failingRecord = receipt.errors?.[0] ?? null
  } catch {}
  await writeFile(path.join(outputDir, 'runner-failure.json'), `${JSON.stringify({
    schemaVersion: 'urai-home-state-runner-failure-2',
    exactHead: process.env.URAI_EXACT_HEAD || 'local',
    authority,
    derivedProof: {
      source: 'capture-home-state-proof.mjs',
      replacement: 'none; canonical capture already carries current first-person movement authority',
      reason: 'Home is cinematic and no longer owns embodied locomotion',
    },
    exitStatus: result.status,
    signal: result.signal,
    failedPredicate: failingRecord?.error || failingRecord?.id || 'capture-process-failed-before-receipt',
    failingRecord,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }, null, 2)}\n`)
  process.exitCode = result.status ?? 1
}
