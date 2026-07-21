import { readFile, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'

const sourcePath = path.resolve('tests/location-map-browser-acceptance-v2.spec.ts')
const fixedPath = path.resolve('tests/location-map-browser-acceptance-v2-fixed.spec.ts')
let source = await readFile(sourcePath, 'utf8')

function replaceRequired(label, pattern, replacement) {
  if (!pattern.test(source)) throw new Error(`${label} source no longer matches the audited exact-head contract`)
  source = source.replace(pattern, replacement)
}

replaceRequired(
  'native touch tap',
  /async function nativeTouchTap\(page: Page, target: Locator\) \{[\s\S]*?\n\}\n\nasync function dispatchPointerDrag/,
  `async function nativeTouchTap(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  expect(box).not.toBeNull()
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
    await cdp.send('Input.synthesizeTapGesture', {
      x: box!.x + box!.width * .5,
      y: box!.y + box!.height * .5,
      duration: 80,
      tapCount: 1,
      gestureSourceType: 'touch',
    })
  } finally {
    await cdp.detach()
  }
}

async function dispatchPointerDrag`,
)

replaceRequired(
  'navigation abort classification',
  /const expectedOfflineRequests = errors\.failedRequests\.filter\(request => request\.includes\('ERR_INTERNET_DISCONNECTED'\)\)\n\s*const unexpectedFailedRequests = errors\.failedRequests\.filter\(request => !request\.includes\('ERR_INTERNET_DISCONNECTED'\)\)/,
  `const expectedOfflineRequests = errors.failedRequests.filter(request => request.includes('ERR_INTERNET_DISCONNECTED'))
    const expectedNavigationAborts = errors.failedRequests.filter(request => (
      request.includes('net::ERR_ABORTED')
      && (
        request.includes('/location-map?')
        || request.includes('/location-map/?')
        || request.includes('/_next/static/css/app/location-map/')
      )
    ))
    const unexpectedFailedRequests = errors.failedRequests.filter(request => (
      !request.includes('ERR_INTERNET_DISCONNECTED')
      && !expectedNavigationAborts.includes(request)
    ))`,
)

replaceRequired(
  'navigation abort receipt',
  /expectedOfflineRequests,\n\s*unexpectedConsoleErrors/,
  `expectedOfflineRequests,
      expectedNavigationAborts,
      unexpectedConsoleErrors`,
)

await writeFile(fixedPath, source)

const child = spawn('pnpm', [
  'exec',
  'playwright',
  'test',
  path.relative(process.cwd(), fixedPath),
  '--config=playwright.config.ts',
], {
  stdio: 'inherit',
  env: process.env,
})

const exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject)
  child.once('exit', code => resolve(code ?? 1))
})

await rm(fixedPath, { force: true })
process.exitCode = exitCode
