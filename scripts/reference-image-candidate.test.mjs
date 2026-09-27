import test from 'node:test'
import assert from 'node:assert/strict'
import { isReferenceImageCandidate } from './lib/reference-image-candidate.mjs'

test('evidence outputs cannot enter the candidate art inventory', () => {
  for (const p of ['docs/evidence/date/outage.jpg', '_audit/home.png', '_quarantine/candidate.webp', 'docs/reference.md']) assert.equal(isReferenceImageCandidate(p), false, p)
})
test('runtime art and authored reference documents remain eligible', () => {
  for (const p of ['urai-tier1/public/assets/home.png', 'docs/references/home.jpg', 'docs/evidence-reference.png', 'assets/ORB.GLB.webp']) assert.equal(isReferenceImageCandidate(p), true, p)
})
