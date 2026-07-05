#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const registryPath = path.join(root, 'docs', 'ecosystem', 'URAI_ECOSYSTEM_REGISTRY.json')
const outDir = path.join(root, 'audit', 'v9')
fs.mkdirSync(outDir, { recursive: true })

if (!fs.existsSync(registryPath)) {
  console.error('[v9-registry] missing ecosystem registry')
  process.exit(1)
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
const requiredSystems = ['urai-spatial', 'deferred-asset-lane', 'deferred-studio-handoff', 'firebase-hosting']
const requiredRule = 'External asset and studio lanes remain deferred until live job integration is certified.'
const presentIds = new Set((registry.systems || []).map((system) => system.id))
const missing = requiredSystems.filter((id) => !presentIds.has(id))
const missingRules = (registry.rules || []).includes(requiredRule) ? [] : [requiredRule]
const report = {
  generatedAt: new Date().toISOString(),
  decision: missing.length === 0 && missingRules.length === 0 ? 'V9_ECOSYSTEM_REGISTRY_READY' : 'V9_ECOSYSTEM_REGISTRY_INCOMPLETE',
  systems: registry.systems || [],
  requiredSystems,
  missing,
  missingRules,
}
fs.writeFileSync(path.join(outDir, 'ecosystem-registry-report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
process.exit(missing.length === 0 && missingRules.length === 0 ? 0 : 1)
