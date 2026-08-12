import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const runnerPath = path.resolve('scripts/capture-lifemap-founder-proof-fixed.mjs')
const bridgePath = path.resolve('scripts/founder-playwright-phase-bridge.mjs')
const syntax = spawnSync(process.execPath, ['--check', runnerPath], { encoding: 'utf8' })
if (syntax.status !== 0) {
  const detail = [syntax.stdout, syntax.stderr].filter(Boolean).join('\n').trim()
  throw new Error(`Checked-in Founder capture runner failed syntax validation${detail ? `:\n${detail}` : ''}`)
}
const bridgeSyntax = spawnSync(process.execPath, ['--check', bridgePath], { encoding: 'utf8' })
if (bridgeSyntax.status !== 0) {
  const detail = [bridgeSyntax.stdout, bridgeSyntax.stderr].filter(Boolean).join('\n').trim()
  throw new Error(`Checked-in Founder phase bridge failed syntax validation${detail ? `:\n${detail}` : ''}`)
}

console.log(`FOUNDER_CAPTURE_SYNTAX_OK ${runnerPath}`)
console.log(`FOUNDER_PHASE_BRIDGE_SYNTAX_OK ${bridgePath}`)
if (!process.argv.includes('--validate-only')) {
  await import(pathToFileURL(bridgePath).href)
  await import(pathToFileURL(runnerPath).href)
}
