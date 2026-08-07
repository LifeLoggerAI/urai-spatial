import { spawnSync } from 'node:child_process'
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
  await import(pathToFileURL(runnerPath).href)
}
