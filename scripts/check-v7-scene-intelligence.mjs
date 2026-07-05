#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const requiredFiles = [
  'docs/release/V7_ARCHITECTURE_PLAN.md',
  'release/v7-scene-intelligence-contract.json',
  'scripts/check-v1-v6-asset-ready.mjs'
]

const failures = []
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
const exists = (file) => fs.existsSync(path.join(root, file))

for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`missing required V7 file: ${file}`)
}

let contract = null
if (exists('release/v7-scene-intelligence-contract.json')) {
  contract = readJson('release/v7-scene-intelligence-contract.json')
  if (contract.status !== 'V7_SCENE_INTELLIGENCE_READY') {
    failures.push(`unexpected V7 status: ${contract.status}`)
  }

  const requiredFields = contract.sceneStateContract?.requiredFields ?? []
  const required = [
    'routeId',
    'routeFamily',
    'memoryId',
    'sceneId',
    'assetPackId',
    'fallbackMode',
    'transitionPolicy',
    'privacyBoundary',
    'evidenceTag'
  ]
  for (const field of required) {
    if (!requiredFields.includes(field)) failures.push(`missing scene state field: ${field}`)
  }

  if (contract.entryGate?.mustNotReopenV1V6RouteOwnership !== true) {
    failures.push('V7 must not reopen V1-V6 route ownership')
  }

  if (!contract.v7Lanes?.includes('v7-scene-intelligence')) {
    failures.push('missing v7-scene-intelligence lane')
  }
}

if (exists('docs/release/V7_ARCHITECTURE_PLAN.md')) {
  const plan = fs.readFileSync(path.join(root, 'docs/release/V7_ARCHITECTURE_PLAN.md'), 'utf8')
  const markers = [
    'Scene intelligence layer',
    'Asset pack runtime selection',
    'Replay continuity upgrade',
    'XR readiness expansion',
    'Release evidence surface'
  ]
  for (const marker of markers) {
    if (!plan.includes(marker)) failures.push(`V7 plan missing marker: ${marker}`)
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  decision: failures.length === 0 ? 'V7_SCENE_INTELLIGENCE_LOCKED' : 'V7_SCENE_INTELLIGENCE_BLOCKED',
  checkedFiles: requiredFiles,
  failures
}

fs.mkdirSync(path.join(root, 'audit', 'v7'), { recursive: true })
fs.writeFileSync(path.join(root, 'audit', 'v7', 'scene-intelligence-report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))

if (failures.length > 0) process.exit(1)
