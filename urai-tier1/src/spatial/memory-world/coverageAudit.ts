import type { FoundationalSceneArchetype } from './sceneOntology'

export const MEMORY_WORLD_COVERAGE_AUDIT_VERSION = 'urai-memory-world-coverage-audit-1' as const

export type MemoryWorldCoveragePackage = {
  id: string
  label: string
  archetypeId: string
  localityScope: string
  era: string
  climate: string
  explicitContext: readonly string[]
  accessibilityTargets: readonly string[]
  status: string
  sourceReferenceIds: readonly string[]
  knownUnknowns: readonly string[]
  culturalReviewRequired: boolean
  productionReady: boolean
}

export type MemoryWorldCoverageAudit = {
  schemaVersion: typeof MEMORY_WORLD_COVERAGE_AUDIT_VERSION
  worldCount: number
  coveredDomains: readonly string[]
  missingDomains: readonly string[]
  unresolvedLanguageMetadata: number
  unresolvedSourceBoards: number
  ruralWorlds: number
  urbanWorlds: number
  accessibilityTaggedWorlds: number
  culturalReviewWorlds: number
  productionReadyWorlds: number
  signals: readonly string[]
  remediationTasks: readonly string[]
}

function domainFromArchetype(id: string) {
  return id.split(':')[1] ?? 'unknown'
}

export function auditMemoryWorldCoverage(
  worlds: readonly MemoryWorldCoveragePackage[],
  ontology: readonly FoundationalSceneArchetype[],
): MemoryWorldCoverageAudit {
  const allDomains = [...new Set(ontology.map((scene) => scene.domain))].sort()
  const coveredDomains = [...new Set(worlds.map((world) => domainFromArchetype(world.archetypeId)))].sort()
  const covered = new Set(coveredDomains)
  const missingDomains = allDomains.filter((domain) => !covered.has(domain))

  const ruralWorlds = worlds.filter((world) => world.explicitContext.some((value) => /rural|farm|village/i.test(value))).length
  const urbanWorlds = worlds.filter((world) => world.explicitContext.some((value) => /urban|city/i.test(value))).length
  const unresolvedLanguageMetadata = worlds.filter((world) => !world.explicitContext.some((value) => /language:/i.test(value))).length
  const unresolvedSourceBoards = worlds.filter((world) => world.sourceReferenceIds.length === 0).length
  const accessibilityTaggedWorlds = worlds.filter((world) => world.accessibilityTargets.length > 0).length
  const culturalReviewWorlds = worlds.filter((world) => world.culturalReviewRequired).length
  const productionReadyWorlds = worlds.filter((world) => world.productionReady).length

  const signals: string[] = []
  if (unresolvedLanguageMetadata > 0) signals.push('LANGUAGE_METADATA_GAP')
  if (unresolvedSourceBoards > 0) signals.push('REFERENCE_SOURCE_GAP')
  if (missingDomains.length > 0) signals.push('ONTOLOGY_DOMAIN_COVERAGE_GAP')
  if (ruralWorlds === 0) signals.push('RURAL_COVERAGE_GAP')
  if (urbanWorlds === 0) signals.push('URBAN_COVERAGE_GAP')
  if (accessibilityTaggedWorlds < worlds.length) signals.push('ACCESSIBILITY_METADATA_GAP')
  if (productionReadyWorlds === 0) signals.push('NO_PRODUCTION_READY_REFERENCE_WORLDS')

  const remediationTasks: string[] = []
  if (unresolvedLanguageMetadata) remediationTasks.push(`Resolve language/signage evidence for ${unresolvedLanguageMetadata} reference worlds without inferring language from geography.`)
  if (unresolvedSourceBoards) remediationTasks.push(`Attach governed source boards to ${unresolvedSourceBoards} reference worlds and classify every source by reuse rights.`)
  if (missingDomains.length) remediationTasks.push(`Add representative QA packages for missing ontology domains: ${missingDomains.join(', ')}.`)
  if (accessibilityTaggedWorlds < worlds.length) remediationTasks.push('Add explicit accessibility targets to every reference world.')
  if (productionReadyWorlds === 0) remediationTasks.push('Promote no world until source, license, runtime, pixel and review gates are actually satisfied.')

  return {
    schemaVersion: MEMORY_WORLD_COVERAGE_AUDIT_VERSION,
    worldCount: worlds.length,
    coveredDomains,
    missingDomains,
    unresolvedLanguageMetadata,
    unresolvedSourceBoards,
    ruralWorlds,
    urbanWorlds,
    accessibilityTaggedWorlds,
    culturalReviewWorlds,
    productionReadyWorlds,
    signals,
    remediationTasks,
  }
}
