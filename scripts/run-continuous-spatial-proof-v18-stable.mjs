import { readFile, unlink, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./capture-continuous-spatial-proof-v18.mjs', import.meta.url)
const generatedUrl = new URL('./.capture-continuous-spatial-proof-v18-stable.generated.mjs', import.meta.url)

const original = await readFile(sourceUrl, 'utf8')
const existingDriver = `async function setKeyboardDirections(page, active, desired) {
  for (const direction of [...active]) {
    if (desired.has(direction)) continue
    await page.keyboard.up(movementKeys[direction])
    active.delete(direction)
  }
  for (const direction of desired) {
    if (active.has(direction)) continue
    await page.keyboard.down(movementKeys[direction])
    active.add(direction)
  }
}`

const stableDriver = `async function setKeyboardDirections(page, active, desired) {
  for (const direction of [...active]) {
    if (desired.has(direction)) continue
    await page.keyboard.up(movementKeys[direction])
    active.delete(direction)
  }
  for (const direction of desired) {
    await page.keyboard.down(movementKeys[direction])
    active.add(direction)
  }
}`

if (!original.includes(existingDriver)) {
  throw new Error('Continuous visual proof keyboard driver contract changed; refusing an unbounded patch')
}

await writeFile(generatedUrl, original.replace(existingDriver, stableDriver), 'utf8')
try {
  await import(`${generatedUrl.href}?exact=${Date.now()}`)
} finally {
  await unlink(generatedUrl).catch(() => {})
}
