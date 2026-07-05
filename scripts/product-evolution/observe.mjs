#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const outDir = path.join(root, 'audit', 'v8')
fs.mkdirSync(outDir, { recursive: true })

function sh(cmd) {
  const result = spawnSync(cmd, { cwd: root, shell: true, encoding: 'utf8' })
  return { status: result.status ?? 1, stdout: result.stdout?.trim() ?? '', stderr: result.stderr?.trim() ?? '' }
}

function exists(p) {
  return fs.existsSync(path.join(root, p))
}

const observed = {
  generatedAt: new Date().toISOString(),
  commit: sh('git rev-parse HEAD').stdout,
  branch: sh('git branch --show-current').stdout,
  releaseDocs: [
    'docs/release/V1_V6_ASSET_READY_SWITCH.md',
    'docs/release/V1_V6_ASSET_INVENTORY_COMPLETION_PLAN.md',
    'docs/release/V7_ARCHITECTURE_PLAN.md',
    'docs/release/V7_V10_COMPLETION_ROADMAP.md',
    'docs/release/FINAL_PRODUCTION_RELEASE_CHECKLIST.md',
  ].map((file) => ({ file, present: exists(file) })),
  gates: [
    'scripts/check-v1-v6-asset-ready.mjs',
    'scripts/check-v7-scene-continuity.mjs',
  ].map((file) => ({ file, present: exists(file) })),
  evidenceDirs: ['audit/v1-v6', 'audit/v7', 'audit/v8'].map((dir) => ({ dir, present: exists(dir) })),
}

fs.writeFileSync(path.join(outDir, 'product-observation.json'), JSON.stringify(observed, null, 2) + '\n')
console.log(JSON.stringify(observed, null, 2))
