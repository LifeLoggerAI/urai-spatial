import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = process.env.URAI_PROOF_DIR || '/tmp/lifemap-post-reset-isolation'
await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    await page.goto(`${base}/life-map/`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="urai-r3f-canonical-lifemap"]').waitFor({ state: 'visible' })
    await page.waitForTimeout(1200)

    const shot = async (name) => page.screenshot({ path: path.join(outputDir, `lifemap-${viewport.name}-${name}.png`), fullPage: false })
    await shot('full')

    await page.evaluate(() => {
      const node = document.querySelector('.life-map-cosmic-wash')
      if (node instanceof HTMLElement) node.style.display = 'none'
    })
    await shot('without-cosmic-wash')

    await page.evaluate(() => {
      const cosmic = document.querySelector('.life-map-cosmic-wash')
      if (cosmic instanceof HTMLElement) cosmic.style.display = ''
      const vignette = document.querySelector('.life-map-depth-vignette')
      if (vignette instanceof HTMLElement) vignette.style.display = 'none'
    })
    await shot('without-depth-vignette')

    await page.evaluate(() => {
      const vignette = document.querySelector('.life-map-depth-vignette')
      if (vignette instanceof HTMLElement) vignette.style.display = ''
      document.querySelectorAll('canvas').forEach((node) => { node.style.visibility = 'hidden' })
    })
    await shot('authored-only')

    await page.evaluate(() => {
      document.querySelectorAll('canvas').forEach((node) => { node.style.visibility = '' })
      const authored = document.querySelector('[data-life-map-authored-universe="primary"]')
      if (authored instanceof HTMLElement) authored.style.visibility = 'hidden'
    })
    await shot('webgl-only')

    await page.evaluate(() => {
      document.querySelectorAll('canvas').forEach((node) => { node.style.visibility = 'hidden' })
    })
    await shot('dom-only')

    const styles = await page.evaluate(() => ({
      bodyBefore: getComputedStyle(document.body, '::before').cssText,
      bodyAfter: getComputedStyle(document.body, '::after').cssText,
      cosmic: document.querySelector('.life-map-cosmic-wash') instanceof HTMLElement ? getComputedStyle(document.querySelector('.life-map-cosmic-wash')).cssText : '',
      vignette: document.querySelector('.life-map-depth-vignette') instanceof HTMLElement ? getComputedStyle(document.querySelector('.life-map-depth-vignette')).cssText : '',
    }))
    await fs.writeFile(path.join(outputDir, `lifemap-${viewport.name}-computed.json`), JSON.stringify(styles, null, 2))
    await page.close()
  }
} finally {
  await browser.close()
}
