import { readFile, writeFile } from 'node:fs/promises'

const captureUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const groupedUrl = new URL('./run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url)
const original = await readFile(captureUrl, 'utf8')
const oldOwner = "result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'"
const newOwner = "result.animationOwner === 'provider-natural-world-plus-authored-physical-interactions'"
if (original.split(oldOwner).length - 1 !== 1) throw new Error('Continuous proof animation-owner contract changed')

const proximityContracts = [
  { from: 'radius: 1.35', to: 'radius: 1.55', expected: 1, label: 'orb' },
  { from: 'radius: 2.2', to: 'radius: 2.45', expected: 2, label: 'environmental-thresholds' },
]

let patched = original.replace(oldOwner, newOwner)
for (const contract of proximityContracts) {
  const count = patched.split(contract.from).length - 1
  if (count !== contract.expected) {
    throw new Error(`Continuous proof ${contract.label} proximity contract changed: expected ${contract.expected}, found ${count}`)
  }
  patched = patched.replaceAll(contract.from, contract.to)
}

await writeFile(captureUrl, patched, 'utf8')
try {
  await import(`${groupedUrl.href}?providerNatural=${Date.now()}`)
} finally {
  await writeFile(captureUrl, original, 'utf8').catch(() => {})
}
