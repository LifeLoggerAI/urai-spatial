// Current exact-head authority: run the grouped proof against production telemetry.
import { readFile, writeFile } from 'node:fs/promises'

const captureUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const groupedUrl = new URL('./run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url)
const original = await readFile(captureUrl, 'utf8')

const historicalOwner = "result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'"
const currentOwner = "result.animationOwner === 'v226-rooted-living-memory-presence'"
const historicalOrb = "orb: { x: -0.18, z: -6.90, radius: 2.35"
const currentOrb = "orb: { x: -0.45, z: -7.45, radius: 2.35"
const historicalModelClipLines = [
  "  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',",
  "  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',",
  "  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',",
]
const currentModelClipLines = [
  "  dormant: 'orb-rest', idle: 'orb-breathe', attention: 'orb-attention', listening: 'orb-listening',",
  "  thinking: 'orb-thinking', speaking: 'orb-speaking', guiding: 'orb-guide', reflecting: 'orb-reflect',",
  "  calming: 'orb-calm', privacy: 'orb-privacy', warning: 'orb-warning', transition: 'orb-transition',",
]

function replaceOnce(source, from, to, label) {
  if (source.split(from).length - 1 !== 1) throw new Error(`Continuous proof ${label} contract changed`)
  return source.replace(from, to)
}

const stableTelemetryContracts = [
  "ground: { x: -4.85, z: -8.25, radius: 2.65",
  "'life-map': { x: 4.85, z: -8.25, radius: 2.65",
  "owner.getAttribute('data-home-assets-ready') === 'true'",
  "owner.getAttribute('data-home-input-ready') === 'true'",
  "owner.getAttribute('data-home-interaction-ready') === 'true'",
  "owner.getAttribute('data-home-ready') === 'true'",
]
for (const contract of stableTelemetryContracts) {
  if (original.split(contract).length - 1 !== 1) throw new Error(`Continuous proof current runtime contract changed: ${contract}`)
}

let patched = replaceOnce(original, historicalOwner, currentOwner, 'animation-owner')
patched = replaceOnce(patched, historicalOrb, currentOrb, 'Orb telemetry')
for (let index = 0; index < historicalModelClipLines.length; index += 1) {
  patched = replaceOnce(patched, historicalModelClipLines[index], currentModelClipLines[index], `Orb model clip line ${index + 1}`)
}

await writeFile(captureUrl, patched, 'utf8')
try {
  await import(`${groupedUrl.href}?providerNatural=${Date.now()}`)
} finally {
  await writeFile(captureUrl, original, 'utf8').catch(() => {})
}
