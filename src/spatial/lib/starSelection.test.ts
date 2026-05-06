import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildWeights, pickWeightedStar, scoreStar, type StarSelectionCandidate, type StarSelectionConfig } from './starSelection'

const baseConfig: StarSelectionConfig = {
  now: 10_000,
  cooldownMs: 2_000,
  repeatWindowMs: 10_000,
  maxRepeatsInWindow: 2,
  fairnessBoostPerMs: 0.0001,
  resolvedPenalty: 0.05,
  excludeResolvedByDefault: true,
  allowResolvedIfReactivated: false,
}

describe('starSelection', () => {
  it('applies cooldown for glow/active states', () => {
    const active: StarSelectionCandidate = { id: 'a', intensity: 1, status: 'active', lastSelectedAt: 9_000 }
    const cooled: StarSelectionCandidate = { id: 'b', intensity: 1, status: 'active', lastSelectedAt: 7_000 }
    assert.equal(scoreStar(active, baseConfig), 0)
    assert.ok(scoreStar(cooled, baseConfig) > 0)
  })

  it('boosts neglected stars for fairness', () => {
    const fresh: StarSelectionCandidate = { id: 'fresh', intensity: 1, status: 'idle', lastSelectedAt: 9_900 }
    const neglected: StarSelectionCandidate = { id: 'old', intensity: 1, status: 'idle', lastSelectedAt: 1_000 }
    assert.ok(scoreStar(neglected, baseConfig) > scoreStar(fresh, baseConfig))
  })

  it('caps repeat selection inside rolling window', () => {
    const capped: StarSelectionCandidate = { id: 'capped', intensity: 1, status: 'idle', selectedCountInWindow: 2 }
    assert.equal(scoreStar(capped, baseConfig), 0)
  })

  it('excludes resolved stars by default and supports penalized inclusion', () => {
    const resolved: StarSelectionCandidate = { id: 'resolved', intensity: 1, status: 'resolved', lastSelectedAt: 1_000 }
    assert.equal(scoreStar(resolved, baseConfig), 0)

    const weighted = scoreStar(resolved, { ...baseConfig, excludeResolvedByDefault: false })
    const idle = scoreStar({ id: 'idle', intensity: 1, status: 'idle', lastSelectedAt: 1_000 }, { ...baseConfig, excludeResolvedByDefault: false })
    assert.ok(weighted > 0)
    assert.ok(weighted < idle)
  })

  it('samples deterministically with seeded rng', () => {
    const candidates: StarSelectionCandidate[] = [
      { id: 'alpha', intensity: 0.4, status: 'idle', lastSelectedAt: 9_500 },
      { id: 'beta', intensity: 1.0, status: 'idle', lastSelectedAt: 4_000 },
      { id: 'gamma', intensity: 0.7, status: 'resolved', lastSelectedAt: 2_000 },
    ]
    const config = { ...baseConfig, excludeResolvedByDefault: false }
    const rolls = [0.01, 0.2, 0.7, 0.9]
    const picks = rolls.map((v) => pickWeightedStar(candidates, config, () => v))
    assert.deepEqual(picks, ['alpha', 'beta', 'beta', 'gamma'])

    const weights = buildWeights(candidates, config)
    assert.equal(weights.length, 3)
  })
})
