import { readFile, rm, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./capture-lifemap-founder-proof.mjs', import.meta.url)
const runtimeUrl = new URL(`./.capture-lifemap-founder-proof-${process.pid}-${Date.now()}.mjs`, import.meta.url)
const original = await readFile(sourceUrl, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label} contract changed; expected one source match and found ${count}`)
  return source.replace(before, after)
}

let patched = original
patched = replaceOnce(
  patched,
  `    await selectQuietReset(page)\n    await shot(page, 'selection-start', 'selection-start', { memoryId: 'quiet-reset' })`,
  `    await selectQuietReset(page)\n    await page.clock.runFor(80)\n    await shot(page, 'selection-start', 'selection-start', { memoryId: 'quiet-reset' })`,
  'Founder selection render frame',
)
patched = replaceOnce(
  patched,
  `    await advanceClockToState(page, 'data-life-map-phase', 'travel', 300)\n    await shot(page, 'mid-travel', 'travel')`,
  `    await advanceClockToState(page, 'data-life-map-phase', 'travel', 300)\n    await page.clock.runFor(80)\n    await shot(page, 'mid-travel', 'travel')`,
  'Founder travel render frame',
)
patched = replaceOnce(
  patched,
  `    await advanceClockToState(page, 'data-life-map-phase', 'approach', 700)\n    await shot(page, 'approach', 'approach')`,
  `    await advanceClockToState(page, 'data-life-map-phase', 'approach', 700)\n    await page.clock.runFor(80)\n    await shot(page, 'approach', 'approach')`,
  'Founder approach render frame',
)
patched = replaceOnce(
  patched,
  `    await advanceClockToState(page, 'data-life-map-phase', 'arrival', 800)\n    await shot(page, 'stable-arrival', 'arrival')`,
  `    await advanceClockToState(page, 'data-life-map-phase', 'arrival', 800)\n    await page.clock.runFor(120)\n    await shot(page, 'stable-arrival', 'arrival')`,
  'Founder arrival render frame',
)

await writeFile(runtimeUrl, patched, 'utf8')
try {
  await import(`${runtimeUrl.href}?renderStable=${Date.now()}`)
} finally {
  await rm(runtimeUrl, { force: true })
}
