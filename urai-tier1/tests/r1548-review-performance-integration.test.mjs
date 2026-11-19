import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const read = (p) => readFileSync(join(process.cwd(),p), 'utf8')
test('Council retains original six people and AI conversation; synthetic lab double gated', () => {
 const s=read('src/spatial/council/CouncilRealm.tsx')
 assert.match(s,/COUNCIL_AGENTS\.map/)
 assert.match(s,/RiggedCouncilHuman/)
 assert.match(s,/CouncilConversationPanel/)
 assert.match(s,/NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION === 'true'/)
 assert.match(s,/anonymousFaceLab.*=== '1'/)
 assert.match(s,/faceLabEnabled \?/)
})
test('review assets cannot be produced in default or hosted builds', () => {
 const s=read('scripts/generate-review-visual-fixtures.mjs')
 assert.match(s,/URAI_REVIEW_VISUAL_FIXTURES === 'true'/)
 assert.match(s,/VERCEL === '1'/)
 assert.match(s,/URAI_PRODUCTION_RELEASE === 'true'/)
 assert.match(s,/__digital-human-dev/)
})
test('no Founder voice impersonation or production authorization', () => {
 const s=read('src/spatial/digital-human/anonymousCalibration.mjs')
 assert.match(s,/Not speech synthesis, phoneme alignment, or a likeness/)
 const c=read('src/spatial/council/CouncilRealm.tsx')
 assert.doesNotMatch(c,/FOUNDER_VOICE_ENABLED|privateMemoryWrites.*true/)
})
