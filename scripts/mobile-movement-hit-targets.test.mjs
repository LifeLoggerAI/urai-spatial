import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'
import { captureVisibleCanvasPng } from './capture-visible-canvas-png.mjs'
const require = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = require('playwright')

test('movement pad gaps pass pointer input to the world while every movement button stays operable', async () => {
  const source = await readFile(new URL('../urai-tier1/src/spatial/navigation/EmbodiedNavigation.tsx', import.meta.url), 'utf8')
  const pad = source.slice(source.indexOf('export function MobileMovementPad'))
  const css = pad.match(/<style jsx>\{`([\s\S]*?)`\}<\/style>/)[1]
  const browser = await chromium.launch({ executablePath: process.env.URAI_PROOF_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true })
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 900 }, { width: 430, height: 932 }, { width: 1024, height: 768 }]) {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true })
      const page = await context.newPage()
      // A real-browser CSS/input regression, not a substitute for Home Gold Master.
      await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}canvas{position:fixed;inset:0;width:100vw;height:100vh}${css}</style><canvas></canvas><div class="urai-mobile-movement"><button>↑</button><button>←</button><button>↓</button><button>→</button></div>`)
      await page.evaluate(() => { document.querySelectorAll('button').forEach(button => button.addEventListener('pointerdown', () => { button.dataset.pressed = 'true' })) })
      const proof = await captureVisibleCanvasPng(page, page.locator('canvas'), 5000)
      assert.equal(proof.capture.canvasTopmostAtSamplePoints, true)
      for (const button of await page.locator('button').all()) {
        const box = await button.boundingBox()
        assert.equal(box.width, 48)
        assert.equal(box.height, 48)
        await button.tap()
        assert.equal(await button.getAttribute('data-pressed'), 'true')
      }
      // Restore the previous container policy to prove this regression catches
      // transparent grid cells intercepting the same production evidence points.
      await page.locator('.urai-mobile-movement').evaluate(element => { element.style.pointerEvents = 'auto' })
      await assert.rejects(captureVisibleCanvasPng(page, page.locator('canvas'), 5000), /covered/)
      await context.close()
    }
  } finally { await browser.close() }
})
