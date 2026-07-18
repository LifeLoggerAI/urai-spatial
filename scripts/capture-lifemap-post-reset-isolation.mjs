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

    const diagnostics = await page.evaluate(({ width, height }) => {
      document.querySelectorAll('canvas').forEach((node) => { node.style.visibility = 'hidden' })

      const selectStyle = (style) => ({
        display: style.display,
        visibility: style.visibility,
        position: style.position,
        inset: style.inset,
        top: style.top,
        bottom: style.bottom,
        width: style.width,
        height: style.height,
        zIndex: style.zIndex,
        opacity: style.opacity,
        background: style.background,
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        filter: style.filter,
        backdropFilter: style.backdropFilter,
        mixBlendMode: style.mixBlendMode,
        content: style.content,
      })

      const summarize = (element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: typeof element.className === 'string' ? element.className : '',
          testId: element.getAttribute('data-testid'),
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          style: selectStyle(getComputedStyle(element)),
          before: selectStyle(getComputedStyle(element, '::before')),
          after: selectStyle(getComputedStyle(element, '::after')),
        }
      }

      const points = [
        { name: 'above-band', x: Math.round(width * 0.5), y: Math.round(height * 0.40) },
        { name: 'on-band', x: Math.round(width * 0.5), y: Math.round(height * 0.42) },
        { name: 'below-band', x: Math.round(width * 0.5), y: Math.round(height * 0.44) },
      ]

      const stacks = points.map((point) => ({
        ...point,
        elements: document.elementsFromPoint(point.x, point.y).map(summarize),
      }))

      const candidateRules = []
      const inspectRules = (rules, href, media = '') => {
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) {
            const text = rule.cssText
            if (/life-map|lifemap|urai-route-life-map|::before|::after|body\s*[,{]/i.test(rule.selectorText) && /background|box-shadow|filter|opacity|height|inset|position/i.test(text)) {
              candidateRules.push({ href, media, selector: rule.selectorText, cssText: text })
            }
          } else if ('cssRules' in rule) {
            try {
              inspectRules(rule.cssRules, href, rule.conditionText || media)
            } catch {
              // Ignore inaccessible nested rules.
            }
          }
        }
      }

      for (const sheet of document.styleSheets) {
        try {
          inspectRules(sheet.cssRules, sheet.href || 'inline')
        } catch {
          // Same-origin build styles are readable; ignore anything else.
        }
      }

      return {
        stacks,
        candidateRules,
        htmlClasses: document.documentElement.className,
        bodyClasses: document.body.className,
      }
    }, { width: viewport.width, height: viewport.height })

    await shot('dom-only')
    await fs.writeFile(path.join(outputDir, `lifemap-${viewport.name}-diagnostics.json`), JSON.stringify(diagnostics, null, 2))
    await page.close()
  }
} finally {
  await browser.close()
}
