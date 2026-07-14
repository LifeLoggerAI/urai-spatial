import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(repoRoot)

await import('./verify-provider-asset-handoff.mjs')
if (process.exitCode) process.exit(process.exitCode)

await import('./final-asset-receipt.mjs')

const receiptPath = resolve(repoRoot, 'docs/final-asset-receipt.md')
const generatedReceipt = readFileSync(receiptPath, 'utf8')
const qualifiedReceipt = generatedReceipt
  .replace('Provider handoff:', 'Provider provenance handoff:')
  .replace('committed Asset Factory handoff', 'committed Asset Factory provenance handoff')

if (qualifiedReceipt.includes('Provider handoff:') || qualifiedReceipt.includes('committed Asset Factory handoff')) {
  throw new Error('Final asset receipt contains an unqualified provider-integration claim')
}

if (qualifiedReceipt !== generatedReceipt) writeFileSync(receiptPath, qualifiedReceipt)
