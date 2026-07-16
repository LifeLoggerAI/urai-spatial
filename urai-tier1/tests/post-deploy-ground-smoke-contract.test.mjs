import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const smoke = fs.readFileSync('../scripts/urai-post-deploy-smoke.mjs', 'utf8')
const ground = fs.readFileSync('src/app/GroundSpatialWorldClean.tsx', 'utf8')

const premiumTitle = 'Your private workforce.'
const premiumStatus = 'Six chambers active · private by default'
const obsoleteTitle = 'Street-level city world'

test('post-deploy Ground smoke requires the canonical premium server-rendered copy', () => {
  assert.match(ground, new RegExp(premiumTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(ground, new RegExp(premiumStatus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(smoke, /\['\/ground', \['walkable-first-person-ground-layer', 'Your private workforce\.', 'Six chambers active · private by default'\], \['Street-level city world'\]\]/)
})

test('obsolete Ground copy is rejected rather than required', () => {
  assert.doesNotMatch(ground, new RegExp(obsoleteTitle))
  assert.match(smoke, /\['Street-level city world'\]/)
})
