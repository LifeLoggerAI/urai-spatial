import { readFile, rm, writeFile } from 'node:fs/promises'

const sourceUrl = new URL('./run-canonical-live-visual-audit.mjs', import.meta.url)
const runtimeUrl = new URL(`./.run-canonical-live-visual-audit-${process.pid}-${Date.now()}.mjs`, import.meta.url)
const original = await readFile(sourceUrl, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label} contract changed; expected one source match and found ${count}`)
  return source.replace(before, after)
}

let patched = original
patched = replaceOnce(
  patched,
  `selector: '.urai-final-home-world[data-home-spatial-renderer="webgl"], [data-testid="urai-home-accessible-fallback"]',`,
  `selector: '.urai-asset-home-world[data-home-primary-owner="asset-driven"], .urai-final-home-world[data-home-spatial-renderer="webgl"], main.urai-home-spatial-world-final, [data-testid="urai-home-accessible-fallback"]',`,
  'canonical Home owner selector',
)
patched = replaceOnce(
  patched,
  `const receipt = { schemaVersion: 'urai-canonical-live-visual-audit-5', exactHead, base, capturedAt: new Date().toISOString(), routes: [], interactions: [] }`,
  `const receipt = { schemaVersion: 'urai-canonical-live-visual-audit-6', exactHead, base, capturedAt: new Date().toISOString(), routes: [], interactions: [] }`,
  'canonical audit schema',
)
patched = replaceOnce(
  patched,
  `{ id: 'focus', path: '/focus?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1', selector: '[data-testid="urai-final-focus-chamber"]', markers: ['The Quiet Reset', 'Selected memory', 'Enter Replay'] },`,
  `{ id: 'focus', path: '/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&returnNode=quiet-reset&demo=1&from=life-map', selector: '[data-testid="urai-final-focus-chamber"]', markers: ['The Quiet Reset', 'Selected memory', 'Enter Replay'] },`,
  'Focus public identity route',
)
patched = replaceOnce(
  patched,
  `{ id: 'replay', path: '/replay?memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1', selector: 'main', markers: ['The Quiet Reset'] },`,
  `{ id: 'replay', path: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&returnNode=quiet-reset&demo=1&from=life-map', selector: 'main', markers: ['The Quiet Reset'] },`,
  'Replay public identity route',
)

const oldHomeSettlement = `  if (route.id === 'home') {
    await page.waitForFunction(() => {
      const webglOwner = document.querySelector('.urai-final-home-world[data-home-spatial-renderer="webgl"]')
      if (webglOwner) {
        const canvas = webglOwner.querySelector('canvas')
        const rect = canvas?.getBoundingClientRect()
        return webglOwner.getAttribute('data-home-ready') === 'true'
          && webglOwner.getAttribute('data-home-visible-world') === 'final-physical-sanctuary-memory-rooms'
          && Boolean(rect && rect.width >= 240 && rect.height >= 240)
      }
      const fallback = document.querySelector('[data-testid="urai-home-accessible-fallback"]')
      const body = document.body.innerText || ''
      return Boolean(fallback && body.includes('Own your life.') && body.includes('Threshold online'))
    }, null, { timeout: 45_000, polling: 50 })
  }`

const currentHomeSettlement = `  if (route.id === 'home') {
    await page.waitForFunction(() => {
      const assetOwner = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      if (assetOwner) {
        const canvas = assetOwner.querySelector('canvas')
        const rect = canvas?.getBoundingClientRect()
        return assetOwner.getAttribute('data-home-assets-ready') === 'true'
          && Boolean(rect && rect.width >= 240 && rect.height >= 240)
      }

      const webglOwner = document.querySelector('.urai-final-home-world[data-home-spatial-renderer="webgl"]')
      if (webglOwner) {
        const canvas = webglOwner.querySelector('canvas')
        const rect = canvas?.getBoundingClientRect()
        return webglOwner.getAttribute('data-home-ready') === 'true'
          && webglOwner.getAttribute('data-home-visible-world') === 'final-physical-sanctuary-memory-rooms'
          && Boolean(rect && rect.width >= 240 && rect.height >= 240)
      }

      const authoredThreshold = document.querySelector('main.urai-home-spatial-world-final')
      const fallback = document.querySelector('[data-testid="urai-home-accessible-fallback"]')
      const owner = authoredThreshold || fallback
      const rect = owner?.getBoundingClientRect()
      const body = document.body.innerText || ''
      return Boolean(owner
        && rect
        && rect.width >= 240
        && rect.height >= 240
        && body.includes('Own your life.')
        && body.includes('Threshold online'))
    }, null, { timeout: 45_000, polling: 50 })
  }`

patched = replaceOnce(patched, oldHomeSettlement, currentHomeSettlement, 'current Home readiness')
patched = replaceOnce(
  patched,
  `    const expectedMemoryId = 'demo:quiet-reset'`,
  `    const expectedPublicMemoryId = 'quiet-reset'\n    const expectedFixtureMemoryId = 'demo:quiet-reset'`,
  'Focus identity expectations',
)
patched = replaceOnce(
  patched,
  `    record.expectedMemoryId = expectedMemoryId`,
  `    record.expectedPublicMemoryId = expectedPublicMemoryId\n    record.expectedFixtureMemoryId = expectedFixtureMemoryId`,
  'Focus identity receipt',
)
patched = replaceOnce(
  patched,
  `    record.passed = destination.searchParams.get('memoryId') === expectedMemoryId
      && record.memoryId === expectedMemoryId
      && record.memoryStatus === 'demo'`,
  `    record.passed = destination.searchParams.get('memoryId') === expectedPublicMemoryId
      && destination.searchParams.get('node') === expectedPublicMemoryId
      && destination.searchParams.get('returnNode') === expectedPublicMemoryId
      && destination.searchParams.get('demo') === '1'
      && record.memoryId === expectedFixtureMemoryId
      && record.memoryStatus === 'demo'`,
  'Focus public and fixture identity proof',
)

await writeFile(runtimeUrl, patched, 'utf8')
try {
  await import(`${runtimeUrl.href}?currentHome=${Date.now()}`)
} finally {
  await rm(runtimeUrl, { force: true })
}
