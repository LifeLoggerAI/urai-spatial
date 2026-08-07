import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const sourcePath = path.resolve('scripts/capture-lifemap-founder-proof-fixed.mjs')
const syntax = spawnSync(process.execPath, ['--check', sourcePath], { encoding: 'utf8' })
if (syntax.status !== 0) {
  const detail = [syntax.stdout, syntax.stderr].filter(Boolean).join('\n').trim()
  throw new Error(`Checked-in Founder capture runner failed syntax validation${detail ? `:\n${detail}` : ''}`)
}

const original = fs.readFileSync(sourcePath, 'utf8')
const brittleRootGeometry = `    const scene = page.locator(selector).first()\n    await scene.waitFor({ state: 'attached', timeout: 45_000 })\n    await page.waitForFunction((sceneSelector) => {\n      const root = document.querySelector(sceneSelector)\n      if (!(root instanceof HTMLElement)) return false\n      const rect = root.getBoundingClientRect()\n      const style = getComputedStyle(root)\n      return rect.width >= 240 && rect.height >= 240\n        && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth\n        && style.display !== 'none' && style.visibility !== 'hidden'\n        && Number.parseFloat(style.opacity || '1') > 0.02\n    }, selector, { timeout: 45_000, polling: 25 })`
const renderedCanvasGeometry = `    const scene = page.locator(selector).first()\n    await scene.waitFor({ state: 'attached', timeout: 45_000 })\n    const canvas = scene.locator('canvas').first()\n    await canvas.waitFor({ state: 'visible', timeout: 45_000 })\n    await page.waitForFunction((sceneSelector) => {\n      const root = document.querySelector(sceneSelector)\n      const canvas = root?.querySelector('canvas')\n      if (!(root instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) return false\n      const rect = canvas.getBoundingClientRect()\n      const style = getComputedStyle(canvas)\n      return rect.width >= 240 && rect.height >= 240\n        && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth\n        && style.display !== 'none' && style.visibility !== 'hidden'\n        && Number.parseFloat(style.opacity || '1') > 0.02\n    }, selector, { timeout: 45_000, polling: 25 })`

const occurrences = original.split(brittleRootGeometry).length - 1
if (occurrences !== 1) throw new Error(`Founder root-geometry contract changed; expected one audited occurrence, found ${occurrences}`)
const patched = original.replace(brittleRootGeometry, renderedCanvasGeometry)
if (!patched.includes("return ready && anchors >= 8 && objects > 20 && calls > 0")) throw new Error('Founder rendered-world strength guard missing after patch')
if (!patched.includes("distributed-grid-24x16-3x3")) throw new Error('Founder retained-PNG sampling guard missing after patch')
if (!patched.includes("capture.screenshot.bytes < 120_000")) throw new Error('Founder screenshot-size visual guard missing after patch')

console.log(`FOUNDER_CAPTURE_SYNTAX_OK ${sourcePath}`)
console.log('FOUNDER_CANVAS_GEOMETRY_GUARD_OK actual-r3f-canvas')
if (!process.argv.includes('--validate-only')) {
  const patchedPath = path.resolve('scripts/.capture-lifemap-founder-proof-runtime.mjs')
  fs.writeFileSync(patchedPath, patched)
  try {
    const patchedSyntax = spawnSync(process.execPath, ['--check', patchedPath], { encoding: 'utf8' })
    if (patchedSyntax.status !== 0) {
      const detail = [patchedSyntax.stdout, patchedSyntax.stderr].filter(Boolean).join('\n').trim()
      throw new Error(`Patched Founder capture runner failed syntax validation${detail ? `:\n${detail}` : ''}`)
    }
    await import(`${pathToFileURL(patchedPath).href}?head=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
  } finally {
    fs.rmSync(patchedPath, { force: true })
  }
}
