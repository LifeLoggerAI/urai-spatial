import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { captureVisibleCanvasPng } from './capture-visible-canvas-png.mjs'

const require = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = require('playwright')

test('Home composition keeps the complete canvas inside desktop and mobile viewports', async () => {
  const css = await fs.readFile(new URL('../urai-tier1/src/app/home-provider-preview-composition.css', import.meta.url), 'utf8')
  const browser = await chromium.launch({ executablePath: process.env.URAI_PROOF_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true })
  try {
    for (const variant of [
      { viewport: { width: 1440, height: 900 } },
      { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' },
      { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    ]) {
      const context = await browser.newContext(variant)
      const page = await context.newPage()
      // CSS geometry regression only: this fixture does not certify Home pixels.
      await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}.urai-home-spatial-runtime-layer{position:fixed;inset:0}.urai-asset-home-world{position:absolute;inset:0}canvas{position:absolute;width:100%;height:100%}${css}</style><section class="urai-home-spatial-runtime-layer" data-webgl-ready="true"><main class="urai-asset-home-world" data-home-primary-owner="asset-driven"><canvas></canvas></main></section>`)
      const canvas = page.locator('canvas')
      assert.deepEqual(await canvas.boundingBox(), { x: 0, y: 0, ...variant.viewport })
      const proof = await captureVisibleCanvasPng(page, canvas, 5000)
      assert.equal(proof.capture.viewportCoverage, 1)
      assert.equal(proof.capture.canvasTopmostAtSamplePoints, true)
      // The evidence gate must still reject a real offscreen canvas.
      await canvas.evaluate(element => { element.style.setProperty('left', '-1px', 'important') })
      await assert.rejects(captureVisibleCanvasPng(page, canvas, 5000), /fully within the viewport/)
      await context.close()
    }
  } finally { await browser.close() }
})
