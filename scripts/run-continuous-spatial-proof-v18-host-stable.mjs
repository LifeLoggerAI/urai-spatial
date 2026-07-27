import { readFile, writeFile } from 'node:fs/promises'

const stableRunnerUrl = new URL('./run-continuous-spatial-proof-v18-stable.mjs', import.meta.url)
const portalRunnerUrl = new URL('./run-continuous-spatial-proof-v18-portal-stable.mjs', import.meta.url)

const stableOriginal = await readFile(stableRunnerUrl, 'utf8')
const portalOriginal = await readFile(portalRunnerUrl, 'utf8')

const hostClockWait = `async function waitForMovementFrame(page, timeout = 20_000) {
  const frameWait = page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => resolve('rendered-frame'))
  })).catch(() => 'page-closed')
  await Promise.race([frameWait, delay(timeout)])
}`

if (stableOriginal.split(hostClockWait).length - 1 !== 1) {
  throw new Error('Continuous proof host-clock frame-wait contract changed; refusing portal repair')
}
if (!stableOriginal.includes('const movementTimeout = Math.max(timeout, 300_000)')) {
  throw new Error('Continuous proof movement envelope changed; refusing portal repair')
}

const portalFrameWait = 'await waitFrames(page, 1)'
if (portalOriginal.split(portalFrameWait).length - 1 !== 2) {
  throw new Error('Portal corrective steering frame-wait contract changed; refusing host-clock repair')
}

const portalPatched = portalOriginal.replaceAll(portalFrameWait, 'await waitForMovementFrame(page)')

await writeFile(portalRunnerUrl, portalPatched, 'utf8')
try {
  await import(`${portalRunnerUrl.href}?hostClock=${Date.now()}`)
} finally {
  await writeFile(portalRunnerUrl, portalOriginal, 'utf8').catch(() => {})
}
