import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const runtime = fs.readFileSync(path.join(root, 'src/app/UraiAutonomousV1Layer.tsx'), 'utf8')
const styles = fs.readFileSync(path.join(root, 'src/app/urai-autonomous-v1-workforce.css'), 'utf8')

test('the live fixed Ground owner uses the provider-final avatar registry', () => {
  assert.match(runtime, /import \{ avatarAssets \} from "@\/spatial\/assets\/uraiAssets"/)
  assert.match(runtime, /data-workforce-art="provider-final"/)
  assert.match(runtime, /urai-autonomous-v1-workforce\.css/)
  assert.match(runtime, /className="uraiGroundHelperArt"/)
})

test('all active helpers and six specialist avatars are wired into the live Ground owner', () => {
  for (const key of [
    'receptionist',
    'privacySteward',
    'scheduleSteward',
    'wellnessGuide',
    'archivist',
    'relationshipLiaison',
    'operator',
    'builder',
    'protector',
    'mirror',
    'guide',
  ]) {
    assert.match(runtime, new RegExp(`avatarAssets\\.${key}\\.src`))
  }
  assert.match(runtime, /11 workforce presences staged/)
  assert.match(runtime, /Specialist council present in Ground/)
})

test('workforce art replaces the generic helper body and remains mobile-safe', () => {
  assert.match(styles, /background-repeat: no-repeat/)
  assert.match(styles, /background-size: contain/)
  assert.match(styles, /@media \(max-width: 760px\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.doesNotMatch(runtime, /uraiGroundHelperHead/)
  assert.doesNotMatch(runtime, /uraiGroundHelperBody/)
})
