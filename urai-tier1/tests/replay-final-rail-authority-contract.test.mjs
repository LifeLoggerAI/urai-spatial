import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../src/app/replay/page.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/app/replay/replay-final-rail-order.css', import.meta.url), 'utf8')

const polishImport = page.indexOf("import './replay-production-polish.css'")
const finalImport = page.indexOf("import './replay-final-rail-order.css'")

assert.ok(polishImport >= 0, 'Replay production polish import is required')
assert.ok(finalImport > polishImport, 'Final Replay rail authority must load after production polish')

for (const token of [
  '.replayWorld .caption',
  'bottom: max(286px',
  '.replayWorld .controls',
  'bottom: max(190px',
  '.replayWorld .replayProduct',
  'bottom: max(96px',
  '@media (max-width: 700px)',
  '@media (max-height: 720px)',
]) {
  assert.ok(css.includes(token), `Replay final rail authority is missing ${token}`)
}

console.log('Replay final rail authority contract: PASS')
