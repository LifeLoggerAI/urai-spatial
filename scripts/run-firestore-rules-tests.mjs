import { spawnSync } from 'node:child_process'

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })
}

// Always use a local, fictional project; no production project/credential fallback.
const project = 'demo-urai-firestore-owner-rules'
for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN', 'FIREBASE_CLI_TOKEN',
  'GOOGLE_OAUTH_ACCESS_TOKEN', 'GOOGLE_CLOUD_ACCESS_TOKEN']) {
  if (process.env[key]) {
    console.error('[URAI] Refusing cloud credential in Firestore Rules emulator:', key)
    process.exit(2)
  }
}
for (const key of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT_ID']) {
  if (process.env[key] && process.env[key] !== project) {
    console.error('[URAI] Refusing non-demo project in Firestore Rules emulator:', key)
    process.exit(2)
  }
}
const javaCheck = spawnSync('java', ['-version'], { stdio: 'ignore', shell: process.platform === 'win32' })

if (javaCheck.status === 0) {
  // Invoke the reviewed workspace CLI; the repository pins firebase-tools.
  // A missing local dependency must fail rather than invoking a global CLI.
  const result = run(process.execPath, [
    'scripts/run-pnpm.mjs', 'exec', 'firebase', 'emulators:exec',
    '--config', 'firebase.json',
    '--project', project,
    '--only', 'firestore',
    'node --test tests/firestore.assetManifests.rules.test.mjs tests/firestore.privacyConsent.rules.test.mjs tests/firestore.lifeModel.rules.test.mjs tests/firestore.userAuthority.rules.test.mjs',
  ], { env: { ...process.env, GCLOUD_PROJECT: project, GOOGLE_CLOUD_PROJECT: project, FIREBASE_PROJECT_ID: project } })
  if (result.error) console.error('[URAI] Firestore emulator failed before tests:', result.error.message)
  process.exit(result.status ?? 1)
}

if (process.env.URAI_REQUIRE_FIRESTORE_EMULATOR === '1') {
  console.error('[URAI] Required Firestore emulator could not run: Java unavailable.')
  process.exit(2)
}

console.warn('[URAI] Java is not available, so the Firestore emulator cannot run in this environment.')
console.warn('[URAI] Running static Firestore rules boundary tests instead. Install Java for full emulator enforcement tests.')

const fallback = run('node', [
  '--test',
  'tests/firestore.assetManifests.rules.static.test.mjs',
  'tests/firestore.privacyConsent.rules.static.test.mjs',
  'tests/firestore.lifeModel.rules.static.test.mjs',
])
process.exit(fallback.status ?? 1)
