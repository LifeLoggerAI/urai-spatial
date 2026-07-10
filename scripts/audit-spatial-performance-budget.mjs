#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const oversized = []

function read(relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), 'utf8')
  } catch (error) {
    failures.push(`Failed to read ${relativePath}: ${error.message}`)
    return ''
  }
}

function requireMatch(label, source, pattern) {
  if (!pattern.test(source)) failures.push(`${label}: missing ${pattern}`)
}

function forbidMatch(label, source, pattern) {
  if (pattern.test(source)) failures.push(`${label}: forbidden ${pattern}`)
}

const budgetPath = 'operations/performance/spatial-performance-budget.json'
const canvasPath = 'urai-tier1/src/spatial/components/world/SpatialWorldCanvas.tsx'
const adaptivePath = 'urai-tier1/src/spatial/performance/useAdaptiveSpatialQuality.ts'
const budgetSource = read(budgetPath)
const canvas = read(canvasPath)
const adaptive = read(adaptivePath)

let budget = null
try {
  budget = JSON.parse(budgetSource)
} catch (error) {
  failures.push(`Invalid ${budgetPath}: ${error.message}`)
}

for (const marker of ['deviceMemory', 'hardwareConcurrency', 'saveData', 'effectiveType', 'documentVisible']) {
  requireMatch(`Adaptive controller ${marker}`, adaptive, new RegExp(marker))
}

for (const marker of ['particleCount', 'pixelRatioMax', 'shadows', 'postprocessing', 'antialias']) {
  requireMatch(`Canvas consumes ${marker}`, canvas, new RegExp(`profile\\.${marker}`))
}

requireMatch('Visibility-aware frameloop', canvas, /frameloop=\{profile\.documentVisible \? 'always' : 'never'\}/)
requireMatch('First actual frame marker', canvas, /useFrame\(\(\) => \{[\s\S]*markFirstSpatialFrame/)
requireMatch('Layout containment', canvas, /contain: 'layout paint size'/)
requireMatch('Particle geometry disposal', canvas, /geometry\.dispose\(\)/)
requireMatch('Constellation geometry disposal', canvas, /lines\.dispose\(\)/)
requireMatch('Shadow map tiering', canvas, /profile\.tier === 'high' \? 1024 : 512/)

forbidMatch('Hardcoded legacy particles', canvas, /Float32Array\(360 \* 3\)/)
forbidMatch('Hardcoded legacy DPR', canvas, /dpr=\{\[1, 1\.7\]\}/)
forbidMatch('Reduced-motion-only postprocessing gate', canvas, /EffectComposer enabled=\{!reducedMotion\}/)
forbidMatch('Global resize performance listener', adaptive, /window\.addEventListener\('resize'/)

if (budget) {
  for (const tier of ['low', 'medium', 'high']) {
    const profile = budget.qualityTiers?.[tier]
    if (!profile) {
      failures.push(`Missing quality tier: ${tier}`)
      continue
    }
    for (const key of ['pixelRatioMax', 'particleCount', 'shadows', 'postprocessing', 'antialias']) {
      if (!(key in profile)) failures.push(`Quality tier ${tier} missing ${key}`)
    }
  }

  const assetRoot = path.join(root, 'urai-tier1/public/assets/urai')
  if (fs.existsSync(assetRoot)) walk(assetRoot)

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        walk(absolute)
        continue
      }

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

if (oversized.length) failures.push(`${oversized.length} spatial assets exceed their single-file budget.`)

const report = {
  ok: failures.length === 0,
  budgetId: budget?.budgetId ?? null,
  integrationState: failures.length === 0 ? 'integrated' : 'failed',
  failures,
  oversized,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
