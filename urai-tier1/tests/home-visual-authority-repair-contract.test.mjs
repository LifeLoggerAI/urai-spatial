import assert from 'node:assert/strict'
import fs from 'node:fs'

const runtime = fs.readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const proof = fs.readFileSync(new URL('../../scripts/capture-continuous-spatial-proof-v18.mjs', import.meta.url), 'utf8')

assert.match(runtime, /HomeSanctuaryWorld/)
assert.match(runtime, /authored-sanctuary-plus-gltf-interactions/)
assert.match(runtime, /homeLoadingHold/)
assert.equal((runtime.match(/aria-label="Accessible Home destinations"/g) || []).length, 0)
assert.match(proof, /node\.closest\('\.sr-only'\)/)
assert.match(proof, /homeLoadingHold=1/)
assert.match(proof, /authored-sanctuary-plus-gltf-interactions/)
console.log('HOME_VISUAL_AUTHORITY_REPAIR_CONTRACT_PASSED')
