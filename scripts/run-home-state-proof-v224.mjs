import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const authorityPath = new URL('../urai-tier1/src/app/currentHomeVisualAuthority.json', import.meta.url)
const authority = JSON.parse(await readFile(authorityPath, 'utf8'))
if (authority.schemaVersion !== 'urai-home-visual-authority-1') throw new Error('Home visual authority schema is unsupported')
if (!authority.rendererOwner || !authority.artRevision || !authority.worldIdentifier || !authority.proofSchema) {
  throw new Error('Home visual authority is missing a required identity field')
}
if (!Array.isArray(authority.runtimeAssets) || authority.runtimeAssets.length < 4 || !authority.runtimeAssets.includes(authority.rendererOwner)) {
  throw new Error('Home visual authority runtime asset inventory is incomplete')
}

const result = spawnSync(process.execPath, ['scripts/capture-home-state-proof.mjs'], {
  cwd: process.cwd(),
  env: process.env,
  encoding: 'utf8',
})
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
    schemaVersion: 'urai-home-state-runner-failure-1',
    exactHead: process.env.URAI_EXACT_HEAD || 'local',
    authority,
    exitStatus: result.status,
    signal: result.signal,
    failedPredicate: failingRecord?.error || failingRecord?.id || 'capture-process-failed-before-receipt',
    failingRecord,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }, null, 2)}\n`)
  process.exitCode = result.status ?? 1
}
