import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const runnerPath = path.resolve('scripts/capture-lifemap-founder-proof-fixed.mjs')
const syntax = spawnSync(process.execPath, ['--check', runnerPath], { encoding: 'utf8' })
if (syntax.status !== 0) {
  const detail = [syntax.stdout, syntax.stderr].filter(Boolean).join('\n').trim()
  throw new Error(`Checked-in Founder capture runner failed syntax validation${detail ? `:\n${detail}` : ''}`)
}

console.log(`FOUNDER_CAPTURE_SYNTAX_OK ${runnerPath}`)
if (!process.argv.includes('--validate-only')) {
  const original = await readFile(runnerPath, 'utf8')
  const staleWindow = 'async function readJourneyPhaseWatch(page, expectedPhase, timeout = 12_000) {'
  const boundedCiWindow = 'async function readJourneyPhaseWatch(page, expectedPhase, timeout = 30_000) {'
  if (original.split(staleWindow).length - 1 !== 1) {
    throw new Error('Founder phase-watch timeout contract changed')
  }
  // Heavy CI WebGL runners can spend more than 12 seconds inside the real authored
  // journey before the approach mutation is observable. Extend observation only;
  // the proof still requires exact selected mode + exact phase and never mutates
  // production timing or state.
  await writeFile(runnerPath, original.replace(staleWindow, boundedCiWindow), 'utf8')
  try {
    await import(`${pathToFileURL(runnerPath).href}?boundedPhaseWatch=${Date.now()}`)
  } finally {
    await writeFile(runnerPath, original, 'utf8').catch(() => {})
  }
}
