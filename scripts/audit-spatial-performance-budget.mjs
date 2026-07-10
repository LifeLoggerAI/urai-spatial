#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const budget = JSON.parse(fs.readFileSync(path.join(root, 'operations/performance/spatial-performance-budget.json'), 'utf8'))
const canvasPath = path.join(root, 'urai-tier1/src/spatial/components/world/SpatialWorldCanvas.tsx')
const adaptivePath = path.join(root, 'urai-tier1/src/spatial/performance/useAdaptiveSpatialQuality.ts')
const boundaryPath = path.join(root, 'urai-tier1/src/spatial/performance/SpatialPerformanceBoundary.tsx')
const errors = []
const warnings = []

for (const required of [canvasPath, adaptivePath, boundaryPath]) {
  if (!fs.existsSync(required)) errors.push(`Missing required file: ${path.relative(root, required)}`)
}

const canvas = fs.existsSync(canvasPath) ? fs.readFileSync(canvasPath, 'utf8') : ''
const adaptive = fs.existsSync(adaptivePath) ? fs.readFileSync(adaptivePath, 'utf8') : ''
const boundary = fs.existsSync(boundaryPath) ? fs.readFileSync(boundaryPath, 'utf8') : ''

for (const marker of ['deviceMemory', 'hardwareConcurrency', 'saveData', 'effectiveType', 'documentVisible']) {
  if (!adaptive.includes(marker)) errors.push(`Adaptive quality controller missing marker: ${marker}`)
}
for (const marker of ['requestAnimationFrame', 'markFirstSpatialFrame', 'minHeight', 'contain']) {
  if (!boundary.includes(marker)) errors.push(`Performance boundary missing marker: ${marker}`)
}

if (/Float32Array\(360 \* 3\)/.test(canvas)) warnings.push('Current runtime still hardcodes 360 particles; integrate quality profile particleCount before merge.')
if (/dpr=\{\[1, 1\.7\]\}/.test(canvas)) warnings.push('Current runtime still hardcodes DPR range; integrate quality profile pixelRatioMax before merge.')
if (/EffectComposer enabled=\{!reducedMotion\}/.test(canvas)) warnings.push('Current runtime postprocessing is only reduced-motion gated; integrate quality profile postprocessing before merge.')
if (!canvas.includes('frameloop')) warnings.push('Canvas does not yet declare a visibility-aware frameloop policy.')

const assetRoot = path.join(root, 'urai-tier1/public/assets/urai')
const oversized = []
if (fs.existsSync(assetRoot)) walk(assetRoot)

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(absolute)
    else {
      const bytes = fs.statSync(absolute).size
      const extension = path.extname(entry.name).toLowerCase()
      const limit = ['.glb', '.gltf'].includes(extension)
        ? budget.budgets.largestSingleModelBytes
        : ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.ktx2', '.hdr'].includes(extension)
          ? budget.budgets.largestSingleTextureBytes
          : null
      if (limit && bytes > limit) oversized.push({ path: path.relative(root, absolute), bytes, limit })
    }
  }
}

if (oversized.length) errors.push(`${oversized.length} spatial assets exceed their single-file budget.`)

const report = {
  ok: errors.length === 0,
  budgetId: budget.budgetId,
  checkedAt: new Date().toISOString(),
  errors,
  warnings,
  oversized,
  integrationState: warnings.length ? 'foundation-ready-runtime-integration-pending' : 'integrated',
}

console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exitCode = 1
