import type { LifeMapNode } from './lifeMapData'
import { lifeMapDisplayPosition } from './lifeMapLayout'

export type LifeMapTestFixture = 'zero' | 'one' | 'five' | 'sparse' | 'dense' | 'emotional-weather' | 'rtl' | 'cjk' | 'long-title'
export type LifeMapTestQuality = 'low' | 'medium' | 'high'

export type LifeMapDeterministicTestConfig = {
  enabled: boolean
  fixture: LifeMapTestFixture
  seed: number
  clockMs: number
  freeze: boolean
  quality: LifeMapTestQuality
  dpr: number
  reducedMotion: boolean
  locale: string
}

const FIXTURES = new Set<LifeMapTestFixture>(['zero', 'one', 'five', 'sparse', 'dense', 'emotional-weather', 'rtl', 'cjk', 'long-title'])
const QUALITIES = new Set<LifeMapTestQuality>(['low', 'medium', 'high'])

function boundedNumber(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

export function readLifeMapDeterministicTestConfig(search = typeof window === 'undefined' ? '' : window.location.search): LifeMapDeterministicTestConfig {
  const params = new URLSearchParams(search)
  const enabled = params.get('testMode') === '1'
  const fixtureCandidate = params.get('fixture') as LifeMapTestFixture | null
  const qualityCandidate = params.get('quality') as LifeMapTestQuality | null
  return {
    enabled,
    fixture: fixtureCandidate && FIXTURES.has(fixtureCandidate) ? fixtureCandidate : 'dense',
    seed: Math.floor(boundedNumber(params.get('seed'), 1234, 0, 0x7fffffff)),
    clockMs: Math.floor(boundedNumber(params.get('clock'), 12000, 0, 86_400_000)),
    freeze: enabled && params.get('freeze') !== '0',
    quality: qualityCandidate && QUALITIES.has(qualityCandidate) ? qualityCandidate : 'high',
    dpr: boundedNumber(params.get('dpr'), 1, 0.75, 2),
    reducedMotion: enabled && params.get('reducedMotion') === '1',
    locale: (params.get('locale') || 'en').slice(0, 24),
  }
}

function syntheticNode(id: string, title: string, eraId: string, clusterId: string, intensity: number, type: LifeMapNode['type'] = 'memory'): LifeMapNode {
  const node: LifeMapNode = {
    id,
    title,
    subtitle: 'Synthetic deterministic fixture',
    summary: 'Synthetic Life Map fixture data. It contains no personal memory content.',
    type,
    sourceType: 'system_generated',
    position: [0, 0, 0],
    intensity,
    aura: intensity > .78 ? '#e8d4ae' : '#c5d7e3',
    dateLabel: 'Synthetic',
    replayAvailable: true,
    connectedTo: [],
    eraId,
    clusterId,
    privacyLevel: 'private',
    tags: ['synthetic-test-fixture'],
  }
  return { ...node, position: lifeMapDisplayPosition(node) }
}

const FIVE = [
  syntheticNode('fixture-origin', 'First light', 'spring-becoming', 'fixture-a', .44),
  syntheticNode('fixture-relationship', 'A remembered connection', 'relationship-orbit', 'fixture-b', .72, 'relationship'),
  syntheticNode('fixture-threshold', 'A turning point', 'threshold-return', 'fixture-c', .86, 'threshold'),
  syntheticNode('fixture-future', 'A possible future', 'forward-weather', 'fixture-d', .62, 'forecast'),
  syntheticNode('fixture-legacy', 'Deep archive', 'legacy-deep-time', 'fixture-e', .77, 'legacy'),
]

function denseFixture() {
  const eras = ['spring-becoming', 'threshold-return', 'relationship-orbit', 'forward-weather', 'legacy-deep-time']
  return Array.from({ length: 48 }, (_, index) => {
    const eraId = eras[index % eras.length]
    return syntheticNode(
      `fixture-dense-${String(index).padStart(2, '0')}`,
      `Synthetic memory ${index + 1}`,
      eraId,
      `fixture-cluster-${index % 9}`,
      .28 + ((index * 37) % 68) / 100,
      index % 11 === 0 ? 'relationship' : index % 13 === 0 ? 'threshold' : 'memory',
    )
  })
}

export function deterministicLifeMapNodes(fixture: LifeMapTestFixture): LifeMapNode[] {
  if (fixture === 'zero') return []
  if (fixture === 'one') return [FIVE[2]]
  if (fixture === 'five') return FIVE
  if (fixture === 'sparse') return [FIVE[0], FIVE[2], FIVE[4]]
  if (fixture === 'rtl') return [syntheticNode('fixture-rtl', 'ذكرى تجريبية طويلة للعرض من اليمين إلى اليسار', 'spring-becoming', 'fixture-rtl', .73)]
  if (fixture === 'cjk') return [syntheticNode('fixture-cjk', '記憶の地図を検証するための合成テスト記憶', 'relationship-orbit', 'fixture-cjk', .73)]
  if (fixture === 'long-title') return [syntheticNode('fixture-long-title', 'A deliberately very long synthetic memory title used to verify spatial label wrapping without exposing personal data', 'threshold-return', 'fixture-long', .78)]
  if (fixture === 'emotional-weather') return denseFixture().slice(0, 24).map((node, index) => ({
    ...node,
    tags: [...(node.tags || []), index % 3 === 0 ? 'quiet-reset' : index % 5 === 0 ? 'repair' : 'synthetic-weather'],
  }))
  return denseFixture()
}
