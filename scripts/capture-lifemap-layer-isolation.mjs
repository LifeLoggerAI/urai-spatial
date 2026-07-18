import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = process.env.URAI_PROOF_DIR || '/tmp/lifemap-layer-isolation'

await fs.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const url = `${base}/life-map/`
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="urai-r3f-canonical-lifemap"]').waitFor({ state: 'visible' })
    await page.waitForTimeout(1200)

    await page.screenshot({ path: path.join(outputDir, `lifemap-${viewport.name}-full.png`), fullPage: false })

    await page.evaluate(() => {
      document.querySelectorAll('canvas').forEach((node) => {
        node.dataset.layerIsolationPreviousVisibility = node.style.visibility
        node.style.visibility = 'hidden'
      })
    })
    await page.screenshot({ path: path.join(outputDir, `lifemap-${viewport.name}-authored-image-only.png`), fullPage: false })

    await page.evaluate(() => {
      document.querySelectorAll('canvas').forEach((node) => {
        node.style.visibility = node.dataset.layerIsolationPreviousVisibility || ''
        delete node.dataset.layerIsolationPreviousVisibility
      })
      const authored = document.querySelector('[data-life-map-authored-universe="primary"]')
      if (authored instanceof HTMLElement) authored.style.visibility = 'hidden'
    })
    await page.screenshot({ path: path.join(outputDir, `lifemap-${viewport.name}-webgl-only.png`), fullPage: false })

    const diagnostic = await page.evaluate(({ width, height }) => {
      document.querySelectorAll('canvas').forEach((node) => {
        node.style.visibility = 'hidden'
      })

      const summarizeStyle = (style) => ({
        display: style.display,
        visibility: style.visibility,
        position: style.position,
        zIndex: style.zIndex,
        opacity: style.opacity,
        background: style.background,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        mixBlendMode: style.mixBlendMode,
        filter: style.filter,
        backdropFilter: style.backdropFilter,
        overflow: style.overflow,
        clipPath: style.clipPath,
        maskImage: style.maskImage,
        content: style.content,
        inset: style.inset,
      })

      const summarizeElement = (element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: typeof element.className === 'string' ? element.className : '',
          testId: element.getAttribute('data-testid'),
          lifeMapUniverse: element.getAttribute('data-life-map-authored-universe'),
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          style: summarizeStyle(getComputedStyle(element)),
          before: summarizeStyle(getComputedStyle(element, '::before')),
          after: summarizeStyle(getComputedStyle(element, '::after')),
        }
      }

      const points = [
        { name: 'center-33', x: Math.round(width * 0.5), y: Math.round(height * 0.33) },
        { name: 'center-42', x: Math.round(width * 0.5), y: Math.round(height * 0.42) },
        { name: 'left-42', x: Math.round(width * 0.25), y: Math.round(height * 0.42) },
        { name: 'right-42', x: Math.round(width * 0.75), y: Math.round(height * 0.42) },
      ]

      return points.map((point) => ({
        ...point,
        elements: document.elementsFromPoint(point.x, point.y).map(summarizeElement),
      }))
    }, { width: viewport.width, height: viewport.height })

    await page.screenshot({ path: path.join(outputDir, `lifemap-${viewport.name}-dom-only.png`), fullPage: false })
    await fs.writeFile(path.join(outputDir, `lifemap-${viewport.name}-seam-stack.json`), JSON.stringify(diagnostic, null, 2))

    await page.close()
  }
} finally {
  await browser.close()
}
