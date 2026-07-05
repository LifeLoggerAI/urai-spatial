#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outDir = path.join(root, 'audit', 'v9')
fs.mkdirSync(outDir, { recursive: true })

function has(file) {
  return fs.existsSync(path.join(root, file))
}

const report = {
  generatedAt: new Date().toISOString(),
  core: {
    assetSwitch: has('scripts/check-v1-v6-asset-ready.mjs'),
    sceneGate: has('scripts/check-v7-scene-continuity.mjs'),
    releaseChecklist: has('docs/release/FINAL_PRODUCTION_RELEASE_CHECKLIST.md')
  },
  ecosystem: {
    registry: has('docs/ecosystem/URAI_ECOSYSTEM_REGISTRY.json'),
    dependencyGraph: has('docs/ecosystem/URAI_DEPENDENCY_GRAPH.md')
  },
  simulation: {
    scenarioSchema: has('docs/simulation/V10_SCENARIO_SCHEMA.md'),
    safetyBoundary: has('docs/simulation/V10_SAFETY_BOUNDARY.md')
  }
}

fs.writeFileSync(path.join(outDir, 'ecosystem-evidence.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
