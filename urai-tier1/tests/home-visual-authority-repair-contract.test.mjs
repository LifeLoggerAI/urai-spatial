import assert from 'node:assert/strict'
import fs from 'node:fs'

const runtime = fs.readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const proof = fs.readFileSync(new URL('../../scripts/capture-continuous-spatial-proof-v18.mjs', import.meta.url), 'utf8')
const verifier = fs.readFileSync(new URL('../../scripts/verify-home-finalization-authored-assets.mjs', import.meta.url), 'utf8')

assert.match(runtime, /HomeSanctuaryWorld/)
assert.match(runtime, /authored-sanctuary-plus-gltf-interactions/)
assert.match(runtime, /homeLoadingHold/)
assert.equal((runtime.match(/aria-label="Accessible Home destinations"/g) || []).length, 0)
assert.match(proof, /node\.closest\('\.sr-only'\)/)
assert.match(proof, /homeLoadingHold=1/)
assert.match(proof, /getByText\('Your private world is forming', \{ exact: true \}\)/)
assert.doesNotMatch(proof, /getByRole\('status', \{ name: \/private world is forming\/i \}\)/)
assert.match(proof, /authored-sanctuary-plus-gltf-interactions/)
assert.match(verifier, /data-home-animation-owner=\\"authored-sanctuary-plus-gltf-interactions\\"/)
assert.doesNotMatch(verifier, /data-home-animation-owner=\\"gltf-authored-clips\\"/)
console.log('HOME_VISUAL_AUTHORITY_REPAIR_CONTRACT_PASSED')
