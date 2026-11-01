import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '..')
const script = await readFile(path.join(root, 'scripts/genesis-original-native-motion-hold.mjs'), 'utf8')
const workflow = await readFile(path.join(root, '.github/workflows/genesis-original-native-motion-hold.yml'), 'utf8')

test('immutable original source and artifact are explicitly pinned', () => {
  assert.match(script, /94c8a2cf68a436a0c49e80b3a09578935df12d48/)
  assert.match(script, /const artifactId = 12145312224/)
  assert.match(workflow, /241902126b0f3a73e0a26b59e303bfc8d90289a008e9b3d4e2f238518f284fbe/)
  assert.match(script, /ORIGINAL_SOURCE_IDENTITY_MISMATCH/)
  assert.match(script, /SOURCE_BYTES_MISMATCH/)
})
test('ascent records the real Home sky interaction, not the compatibility redirect', () => {
  assert.match(script, /name: 'ascent', route: '\/home\/\?demo=1'/)
  assert.doesNotMatch(script, /name: 'ascent', route: '\/ascent\/'/)
  assert.match(script, /proveHomeSkyAscent\(page,home/)
  assert.match(script, /8d688bfaabf9efc1dbb3d3f6b64e67ae2f451568/)
  assert.match(script, /ACTUAL_CAMERA_HEIGHT_CHANGE_REQUIRED/)
})
test('no standalone route assertions can certify continuous journey or film completion', () => {
  assert.match(script, /receipt\.journeyContinuityAccepted=false/)
  assert.match(script, /&&receipt\.journeyContinuityAccepted/)
  assert.match(script, /NO_VALID_PLAYWRIGHT_OR_CDP_VIDEO/)
  assert.match(script, /MOTION_FRAME_PROOF_FAILED/)
})
test('sample-only scope, no account or external provider access', () => {
  assert.match(script, /SYNTHETIC_DISCLOSED_SAMPLE_NO_ACCOUNT_NO_PRIVATE_MEDIA/)
  assert.match(script, /route\.request\(\)\.url\(\)\.startsWith\(serverOrigin\+'\/'\)/)
  assert.match(workflow, /NO_PRIVATE_MEDIA: 'true'/)
  assert.match(workflow, /NO_PUBLIC_PUBLISHING: 'true'/)
  assert.match(workflow, /NO_NATIVE_DISPATCH: 'true'/)
})
test('draft PR-only workflow, encryption-only transport, no plaintext footage upload', () => {
  assert.match(workflow, /github\.event\.pull_request\.number == 1850/)
  assert.match(workflow, /github\.event\.pull_request\.draft == true/)
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/)
  assert.match(workflow, /\.sealed/)
  assert.doesNotMatch(workflow, /artifacts\/genesis-native-motion-hold\/\*\.webm/)
  assert.doesNotMatch(workflow, /pull_request_target/)
  assert.doesNotMatch(workflow, /secrets\./)
  assert.match(workflow, /retention-days: 1/)
})
