import { readFile, writeFile } from 'node:fs/promises'

const stableRunnerUrl = new URL('./run-continuous-spatial-proof-v18-stable.mjs', import.meta.url)
const portalRunnerUrl = new URL('./run-continuous-spatial-proof-v18-portal-stable.mjs', import.meta.url)

const stableOriginal = await readFile(stableRunnerUrl, 'utf8')
const portalOriginal = await readFile(portalRunnerUrl, 'utf8')

const pageClockWait = `async function waitForMovementFrame(page, timeout = 500) {
  await page.evaluate((timeoutMs) => new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    requestAnimationFrame(finish)
    setTimeout(finish, timeoutMs)
  }), timeout)
}`

const hostClockWait = `async function waitForMovementFrame(page, timeout = 500) {
  const renderedFrame = page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => resolve('rendered-frame'))
  })).catch(() => 'page-closed')
  await Promise.race([renderedFrame, delay(timeout)])
}`

if (stableOriginal.split(pageClockWait).length - 1 !== 1) {
  throw new Error('Continuous proof frame-wait contract changed; refusing host-clock repair')
}

const portalFrameWait = 'await waitFrames(page, 1)'
if (portalOriginal.split(portalFrameWait).length - 1 !== 2) {
  throw new Error('Portal corrective steering frame-wait contract changed; refusing host-clock repair')
}

const stablePatched = stableOriginal.replace(pageClockWait, hostClockWait)
const portalPatched = portalOriginal.replaceAll(portalFrameWait, 'await waitForMovementFrame(page)')

await writeFile(stableRunnerUrl, stablePatched, 'utf8')
await writeFile(portalRunnerUrl, portalPatched, 'utf8')
try {
  await import(`${portalRunnerUrl.href}?hostClock=${Date.now()}`)
} finally {
  await writeFile(stableRunnerUrl, stableOriginal, 'utf8').catch(() => {})
  await writeFile(portalRunnerUrl, portalOriginal, 'utf8').catch(() => {})
}
