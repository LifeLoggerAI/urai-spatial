import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const runnerPath = path.resolve('scripts/capture-lifemap-founder-proof-fixed.mjs')
const original = await readFile(runnerPath, 'utf8')
const gotoTarget = `  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 45_000 })\n  await stable(page)`
const gotoReplacement = `  const canonicalOwner = page.locator('[data-testid="urai-r3f-canonical-lifemap"]').first()\n  if (selector === '[data-testid="urai-true-3d-life-map"]') {\n    await canonicalOwner.waitFor({ state: 'visible', timeout: 45_000 })\n    const scene = page.locator(selector).first()\n    await scene.waitFor({ state: 'attached', timeout: 45_000 })\n    await page.waitForFunction((sceneSelector) => {\n      const root = document.querySelector(sceneSelector)\n      if (!(root instanceof HTMLElement)) return false\n      const rect = root.getBoundingClientRect()\n      const style = getComputedStyle(root)\n      return rect.width >= 240 && rect.height >= 240\n        && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth\n        && style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.opacity || '1') > 0.02\n    }, selector, { timeout: 45_000, polling: 25 })\n  } else {\n    await page.locator(selector).first().waitFor({ state: 'visible', timeout: 45_000 })\n  }\n  await stable(page)`
const occurrences = original.split(gotoTarget).length - 1
if (occurrences !== 1) throw new Error(`Founder canonical owner patch expected one goto visibility gate; found ${occurrences}`)
const patched = original.replace(gotoTarget, gotoReplacement)
for (const marker of [
  '[data-testid="urai-r3f-canonical-lifemap"]',
  "scene.waitFor({ state: 'attached'",
  'rect.width >= 240 && rect.height >= 240',
  "style.display !== 'none'",
  "style.visibility !== 'hidden'",
]) {
  if (!patched.includes(marker)) throw new Error(`Founder canonical owner patch missing: ${marker}`)
}

await writeFile(runnerPath, patched, 'utf8')
try {
  const syntax = spawnSync(process.execPath, ['--check', runnerPath], { encoding: 'utf8' })
  if (syntax.status !== 0) {
    const detail = [syntax.stdout, syntax.stderr].filter(Boolean).join('\n').trim()
    throw new Error(`Checked-in Founder capture runner failed syntax validation${detail ? `:\n${detail}` : ''}`)
  }

  console.log(`FOUNDER_CAPTURE_SYNTAX_OK ${runnerPath}`)
  console.log('FOUNDER_CANONICAL_ROUTE_OWNER_BOUND urai-r3f-canonical-lifemap -> urai-true-3d-life-map')
  if (!process.argv.includes('--validate-only')) {
    await import(`${pathToFileURL(runnerPath).href}?canonicalOwner=${Date.now()}`)
  }
} finally {
  await writeFile(runnerPath, original, 'utf8').catch(() => {})
}
