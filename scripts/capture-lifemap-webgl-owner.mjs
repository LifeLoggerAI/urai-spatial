import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = process.env.URAI_PROOF_DIR || '/tmp/lifemap-webgl-owner'
const variants = [
  'full',
  'minimal',
  'blank',
  'no-fog',
  'no-stars',
  'no-parallax',
  'no-post',
  'no-weather',
  'no-nexus',
  'no-goals',
  'no-vaults',
  'no-chapters',
  'no-memory',
  'no-foreground',
]

await fs.mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    for (const variant of variants) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
      const query = variant === 'full' ? '' : `?debugScene=${variant}`
      await page.goto(`${base}/life-map/${query}`, { waitUntil: 'networkidle' })
      await page.locator('[data-testid="urai-r3f-canonical-lifemap"]').waitFor({ state: 'visible' })
      await page.waitForTimeout(1200)
      await page.evaluate(() => {
        const authored = document.querySelector('[data-life-map-authored-universe="primary"]')
        if (authored instanceof HTMLElement) authored.style.visibility = 'hidden'
        document.querySelectorAll('.life-map-realm-mark, .life-map-sample-boundary, .life-map-whisper, .life-map-accessibility-menu, [data-testid="urai-lifemap-semantic-navigation"], [data-testid="urai-lifemap-selected-memory-controls"]').forEach((node) => {
          if (node instanceof HTMLElement) node.style.visibility = 'hidden'
        })
      })
      await page.screenshot({ path: path.join(outputDir, `lifemap-${viewport.name}-${variant}.png`), fullPage: false })
      await page.close()
    }
  }
} finally {
  await browser.close()
}
