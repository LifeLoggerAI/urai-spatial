import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const layout = await readFile(new URL('../src/app/layout.tsx', import.meta.url), 'utf8')
const verifier = await readFile(new URL('../scripts/verify-live-content-parity.mjs', import.meta.url), 'utf8')

test('static Spatial HTML exposes the exact build SHA used by live verification', () => {
  assert.equal(layout.includes('process.env.NEXT_PUBLIC_URAI_DEPLOYED_SHA'), true)
  assert.equal(layout.includes('process.env.GITHUB_SHA'), true)
  assert.equal(layout.includes("'urai-deployed-sha': deployedSha"), true)
  assert.equal(layout.includes('data-deployed-sha={deployedSha}'), true)
  assert.equal(verifier.includes('data-deployed-sha'), true)
  assert.equal(verifier.includes('shaMatches = deployedSha === expectedSha'), true)
})
