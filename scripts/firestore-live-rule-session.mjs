import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Firebase emulators:exec sets FIRESTORE_EMULATOR_HOST for its child test
// command. This proof runs ONLY against its isolated loopback emulator.
export const DEMO_PROJECT = 'demo-urai-rules'
export const RULE_TEST_FILES = Object.freeze([
  'tests/firestore.assetManifests.rules.test.mjs',
  'tests/firestore.privacyConsent.rules.test.mjs',
  'tests/firestore.lifeModel.rules.test.mjs',
])

export function parseLocalFirestoreHost(value) {
  if (typeof value !== 'string' || !/^127\.0\.0\.1:[0-9]{1,5}$/.test(value)) {
    throw new Error('FIRESTORE_LIVE_EMULATOR_HOST_REQUIRED_LOOPBACK_ONLY')
  }
  const port = Number(value.split(':')[1])
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('FIRESTORE_LIVE_EMULATOR_PORT_INVALID')
  }
  return { host: '127.0.0.1', port }
}

export async function confirmFirestoreRulesCoverage({
  host = process.env.FIRESTORE_EMULATOR_HOST,
  project = process.env.GCLOUD_PROJECT,
  fetchImpl = fetch,
} = {}) {
  if (project !== DEMO_PROJECT) throw new Error('FIRESTORE_LIVE_DEMO_PROJECT_REQUIRED')
  const address = parseLocalFirestoreHost(host)
  // Official Firebase Local Emulator Suite Firestore rules-coverage endpoint.
  // A configured real emulator serves JSON here; another HTTP service, a
  // failed emulator start, or an inaccessible port MUST NOT qualify.
  const endpoint = 'http://' + address.host + ':' + address.port + '/emulator/v1/projects/' + DEMO_PROJECT + ':ruleCoverage'
  let response
  try {
    response = await fetchImpl(endpoint, { redirect: 'error', signal: AbortSignal.timeout(5000) })
  } catch (error) {
    throw new Error('FIRESTORE_LIVE_COVERAGE_UNREACHABLE: ' + (error?.code || error?.name || 'network'))
  }
  if (!response || response.status !== 200 ||
      !/^application\/json(?:\s*;|\s*$)/i.test(response.headers?.get?.('content-type') || '')) {
    throw new Error('FIRESTORE_LIVE_COVERAGE_HTTP_OR_CONTENT_TYPE_INVALID')
  }
  let report
  try { report = await response.json() } catch { throw new Error('FIRESTORE_LIVE_COVERAGE_JSON_INVALID') }
  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('FIRESTORE_LIVE_COVERAGE_BODY_INVALID')
  }
  return { project: DEMO_PROJECT, host: address.host, port: address.port }
}

export function executeMaintainedFirestoreRules({
  executable = process.execPath,
  spawn = spawnSync,
  onSuccess = message => console.log(message),
} = {}) {
  const args = ['--test', ...RULE_TEST_FILES]
  const result = spawn(executable, args, { stdio: 'inherit', shell: false, windowsHide: true })
  if (!result || result.error || result.status !== 0 || result.signal) {
    throw new Error('FIRESTORE_LIVE_MAINTAINED_RULE_TESTS_FAILED:' + String(result?.error?.code ?? result?.signal ?? result?.status ?? 'UNKNOWN'))
  }
  // This marker is emitted only after the independently probed emulator's
  // maintained real rule suites return zero. Static fallback cannot emit it.
  onSuccess('URAI_FIRESTORE_LIVE_RULES_PROVEN=PASS')
}

export async function runLiveFirestoreSession() {
  if (!process.version.startsWith('v22.')) throw new Error('FIRESTORE_LIVE_NODE22_REQUIRED')
  const session = await confirmFirestoreRulesCoverage()
  console.log('URAI_FIRESTORE_LIVE_COVERAGE=PASS project=' + session.project + ' host=' + session.host)
  executeMaintainedFirestoreRules()
}

// Do not execute the Firebase session when imported by offline native tests.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runLiveFirestoreSession().catch(error => {
    console.error('URAI_FIRESTORE_LIVE_SESSION_FAIL=' + String(error?.message || error))
    process.exitCode = 1
  })
}
