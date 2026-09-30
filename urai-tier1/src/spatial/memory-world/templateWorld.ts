import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'
import { assembleMemoryWorld } from './assembleMemoryWorld'
import type { MemoryWorld, MemoryWorldAsset } from './memoryWorld'

const rules: readonly { tokens: readonly string[]; archetypeId: string }[] = [
  { tokens: ['kitchen'], archetypeId: 'scene:residential:kitchen' },
  { tokens: ['living room', 'family room'], archetypeId: 'scene:residential:living-room' },
  { tokens: ['bedroom'], archetypeId: 'scene:residential:adult-bedroom' },
  { tokens: ['classroom', 'school'], archetypeId: 'scene:education:secondary-classroom' },
  { tokens: ['office'], archetypeId: 'scene:work:private-office' },
  { tokens: ['hospital'], archetypeId: 'scene:healthcare:hospital-room' },
  { tokens: ['clinic'], archetypeId: 'scene:healthcare:clinic' },
  { tokens: ['park'], archetypeId: 'scene:communityCivicRetail:city-park' },
  { tokens: ['beach'], archetypeId: 'scene:nature:beach' },
  { tokens: ['forest', 'woods'], archetypeId: 'scene:nature:woodland' },
  { tokens: ['farm'], archetypeId: 'scene:agricultureRural:rural-homestead' },
  { tokens: ['street', 'neighborhood'], archetypeId: 'scene:communityCivicRetail:neighborhood-street' },
  { tokens: ['train'], archetypeId: 'scene:transportation:long-distance-train' },
  { tokens: ['bus'], archetypeId: 'scene:transportation:city-bus-interior' },
  { tokens: ['car'], archetypeId: 'scene:everydayTransitional:back-seat-car' },
]

function eraPackForDate(value: string) {
  const year = Number(value.slice(0, 4))
  if (!Number.isFinite(year)) return undefined
  if (year < 1900) return 'era:pre-1900'
  const start = Math.min(2020, Math.floor(year / 10) * 10)
  return `era:${start}s`
}

function explicitContext(memory: SelectedMemory) {
  return [memory.place?.label, memory.place?.region, memory.title].filter(Boolean).join(' ').toLowerCase()
}

export function selectBoundedTemplateArchetype(memory: SelectedMemory) {
  const context = explicitContext(memory)
  for (const rule of rules) {
    if (rule.tokens.some((token) => context.includes(token))) return rule.archetypeId
  }
  // Unknown context remains a neutral threshold, not a fabricated remembered place.
  return 'scene:everydayTransitional:hallway-transition'
}

function templateAssets(memory: SelectedMemory): Record<string, MemoryWorldAsset> {
  const shell: MemoryWorldAsset = {
    assetId: 'template:bounded-structural-shell',
    assetType: 'architecture',
    name: 'Bounded contextual structural shell',
    version: '1',
    semanticTags: ['structure', 'floor', 'walls', 'bounded-context'],
    representation: ['procedural'],
    truthClass: 'T4_CONTEXT_TEMPLATE',
    confidence: 1,
    sourceIds: [],
    dependencies: [],
    optimizationTier: 'multi',
    status: 'silver',
  }
  const atmosphere: MemoryWorldAsset = {
    assetId: 'template:memory-atmosphere',
    assetType: 'scene',
    name: 'Memory atmosphere presentation',
    version: '1',
    semanticTags: ['atmosphere', memory.emotionalState],
    representation: ['procedural'],
    truthClass: 'T6_INTERPRETIVE',
    confidence: 1,
    sourceIds: [],
    dependencies: [],
    optimizationTier: 'multi',
    status: 'silver',
  }
  return { [shell.assetId]: shell, [atmosphere.assetId]: atmosphere }
}

export function buildBoundedTemplateMemoryWorld(memory: SelectedMemory, exactSourceHead?: string): MemoryWorld {
  const assets = templateAssets(memory)
  const world = assembleMemoryWorld({
    worldId: `memory-world:${memory.id}`,
    ownerId: memory.ownerId,
    archetypeId: selectBoundedTemplateArchetype(memory),
    label: memory.title,
    context: {
      geography: memory.place?.region ? { region: memory.place.region } : undefined,
      representedDate: memory.occurredAt,
      eraPackId: eraPackForDate(memory.occurredAt),
      culturalContext: [],
      languages: [],
      emotionalWeather: 'Reflective',
    },
    sourceRegistry: {},
    assetRegistry: assets,
    templateAssetIds: Object.keys(assets),
    evidence: [],
    createdAt: memory.occurredAt,
    exactSourceHead,
  })

  return {
    ...world,
    provenance: { ...world.provenance, sourceLineageComplete: true },
    governance: {
      ...world.governance,
      consentComplete: memory.demo,
      licensingComplete: true,
    },
  }
}
