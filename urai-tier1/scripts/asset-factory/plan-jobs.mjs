import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { uraiSpatialAssetManifest } from '../../src/spatial/assets/assetManifest.ts'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '../..')
const config = JSON.parse(readFileSync(resolve(appRoot, 'config/asset-factory.json'), 'utf8'))
const now = new Date().toISOString()

const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 }
const typeToCapability = {
  model: 'model3d', portal: 'model3d', world: 'model3d', fallback: 'model3d',
  texture: 'image', skybox: 'image', ui: 'image', audio: 'audio',
}

const eligible = uraiSpatialAssetManifest
  .filter((asset) => config.allowedStatuses.includes(asset.status))
  .filter((asset) => config.allowedPriorities.includes(asset.priority))
  .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id))

let remaining = Number(config.dailyBudgetUsd)
const jobs = []
for (const asset of eligible) {
  if (jobs.length >= Number(config.maxConcurrentJobs)) break
  const maxCostUsd = Math.min(Number(config.perAssetBudgetUsd), remaining)
  if (maxCostUsd <= 0) break
  jobs.push({
    schemaVersion: 1,
    jobId: `${asset.id}-${now.replace(/[:.]/g, '-')}`,
    createdAt: now,
    status: 'planned',
    assetId: asset.id,
    assetName: asset.name,
    assetType: asset.type,
    capability: typeToCapability[asset.type] ?? 'unknown',
    targetSurface: asset.targetSurface,
    priority: asset.priority,
    outputPath: asset.path,
    promptId: asset.generationPromptId ?? null,
    fallbackAssetId: asset.fallbackAssetId ?? null,
    maxCostUsd,
    provider: config.providers[typeToCapability[asset.type]] ?? null,
    gates: {
      humanApproval: config.requiredHumanApproval,
      commercialRights: config.requireCommercialRights,
      provenanceReceipt: config.requireProvenanceReceipt,
      validationBeforePromotion: config.requireValidationBeforePromotion,
    },
    instructions: asset.notes,
  })
  remaining -= maxCostUsd
}

const plan = {
  schemaVersion: 1,
  generatedAt: now,
  enabled: config.enabled,
  mode: config.mode,
  budget: {
    dailyBudgetUsd: config.dailyBudgetUsd,
    allocatedUsd: jobs.reduce((sum, job) => sum + job.maxCostUsd, 0),
    remainingUsd: remaining,
  },
  eligibleAssetCount: eligible.length,
  jobs,
}

const output = resolve(appRoot, config.jobRoot, 'latest-plan.json')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(plan, null, 2)}\n`)
console.log(JSON.stringify(plan, null, 2))

if (config.enabled && config.mode !== 'plan-only') {
  throw new Error('Execution providers are not configured. Keep mode=plan-only until provider adapters and secrets are installed.')
}
