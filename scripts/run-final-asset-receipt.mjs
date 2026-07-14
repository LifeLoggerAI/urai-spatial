import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(repoRoot)

await import('./verify-provider-asset-handoff.mjs')
if (process.exitCode) process.exit(process.exitCode)

await import('./final-asset-receipt.mjs')
