import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { assessFirestoreJava, parseJavaMajorVersion } from '../scripts/lib/firestore-java-runtime.mjs'

const good = (stderr, overrides = {}) => assessFirestoreJava({ status: 0, stderr, ...overrides })

test('recognizes Java 21 and newer', () => {
  assert.equal(parseJavaMajorVersion('openjdk version "21.0.12.1" 2026-08-18'), 21)
  assert.equal(parseJavaMajorVersion('java version "21.0.3"'), 21)
  assert.equal(parseJavaMajorVersion('openjdk 25.0.1'), 25)
  assert.deepEqual(good('openjdk version "21.0.12"'), { kind: 'ok', major: 21 })
})
test('Java 17 is a hard block even without CI', () => {
  assert.equal(parseJavaMajorVersion('openjdk version "17.0.16"'), 17)
  assert.deepEqual(good('openjdk version "17.0.16"'), { kind: 'blocked', reason: 'FIRESTORE_EMULATOR_REQUIRES_JAVA_21_FOUND_17' })
})
test('legacy Java 8 is parsed as 8 not 1', () => {
  assert.equal(parseJavaMajorVersion('java version "1.8.0_451"'), 8)
  assert.equal(good('java version "1.8.0_451"').kind, 'blocked')
})
test('only non-strict ambient ENOENT allows static-only developer mode', () => {
  const missing = { status: null, errorCode: 'ENOENT' }
  assert.deepEqual(assessFirestoreJava(missing), { kind: 'missing', reason: 'JAVA_UNAVAILABLE_STATIC_ONLY' })
  assert.deepEqual(assessFirestoreJava({ ...missing, strict: true }), { kind: 'blocked', reason: 'FIRESTORE_EMULATOR_REQUIRED_JAVA_UNAVAILABLE' })
  assert.equal(assessFirestoreJava({ ...missing, explicit: true }).kind, 'blocked')
})
test('unknown or broken Java cannot be marked absent', () => {
  assert.equal(good('unrelated runtime banner').reason, 'FIRESTORE_TEST_JAVA_VERSION_UNVERIFIABLE')
  assert.equal(good('java not found', { status: 1 }).kind, 'blocked')
  assert.equal(assessFirestoreJava({ status: null, errorCode: 'EACCES' }).kind, 'blocked')
})
test('Java banner can arrive on stdout', () => {
  assert.deepEqual(assessFirestoreJava({ status: 0, stderr: '', stdout: 'openjdk version "21.0.12.1"' }), { kind: 'ok', major: 21 })
})
test('native Firestore runner requires emulator in CI and preserves demo project', () => {
  const source = readFileSync(new URL('../scripts/run-firestore-rules-tests.mjs', import.meta.url), 'utf8')
  assert.match(source, /import \{ assessFirestoreJava \} from '\.\/lib\/firestore-java-runtime\.mjs'/)
  assert.match(source, /encoding: 'utf8'/)
  assert.match(source, /process\.env\.URAI_FIRESTORE_EMULATOR_REQUIRED === '1'/)
  assert.match(source, /if \(assessment\.kind === 'blocked'\) throw new Error\(assessment\.reason\)/)
  assert.match(source, /const javaMissing = assessment\.kind === 'missing'/)
  assert.match(source, /'demo-urai-rules'/)
  assert.doesNotMatch(source, /javaCheck = spawnSync\(javaExecutable, \['-version'\], \{ stdio: 'ignore'/)
})
