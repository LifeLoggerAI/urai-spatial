import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { resolveAuthorizedHomeReviewOrbState } from '../src/app/home/orbStateController.ts'

const forcedStates = [
  'dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking',
  'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition',
]

const production = await readFile(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const groupedProof = await readFile(new URL('../../scripts/run-continuous-spatial-proof-v21-grouped.mjs', import.meta.url), 'utf8')

test('authorized private review fixture accepts every forced Orb state and nothing broader', () => {
  for (const state of forcedStates) {
    assert.equal(resolveAuthorizedHomeReviewOrbState(`?homeAssetReview=1&homePrivateFixture=1&homeOrbState=${state}`), state)
  }
  for (const search of [
    '?homePrivateFixture=1&homeOrbState=thinking',
    '?homeAssetReview=1&homeOrbState=thinking',
    '?homeAssetReview=1&homePrivateFixture=0&homeOrbState=thinking',
    '?homeAssetReview=1&homePrivateFixture=1&homeOrbState=unknown',
    '?homeAssetReview=1&homePrivateFixture=1',
  ]) assert.equal(resolveAuthorizedHomeReviewOrbState(search), null)
})

test('production preserves the authorized state across external events and its idle reset', () => {
  assert.match(production, /const reviewOrbState = useRef<OrbState \| null>\(null\)/)
  assert.match(production, /reviewOrbState\.current = requestedOrbState/)
  assert.match(production, /setOrbState\(reviewOrbState\.current \?\? event\.detail\.state\)/)
  assert.match(production, /setOrbState\(reviewOrbState\.current \?\? 'idle'\)/)
  assert.match(production, /params\.get\('homeAssetReview'\) === '1' && params\.get\('homePrivateFixture'\) === '1'/)
})

test('continuous proof uses rendered compact geometry and hit ownership without the stale opacity ceiling', () => {
  for (const marker of [
    'semanticNavigationNonDominant',
    'semanticNavigationWidth <= 64',
    'semanticNavigationAreaRatio <= 0.03',
    'semanticTargetMinWidth >= 48',
    'semanticTargetMinHeight >= 48',
    'semanticTargetsInViewport === 3',
    'semanticTargetsHitConfirmed === 3',
    'document.elementFromPoint',
  ]) assert.ok(groupedProof.includes(marker), `missing current semantic navigation proof: ${marker}`)
  assert.doesNotMatch(groupedProof, /semanticNavigationOpacity\s*<=\s*0\.02/)
})
