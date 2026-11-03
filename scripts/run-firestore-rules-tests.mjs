import { spawnSync } from 'node:child_process'

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })
}

const javaCheck = spawnSync('java', ['-version'], { stdio: 'ignore', shell: process.platform === 'win32' })

if (javaCheck.status === 0) {
  const result = run('firebase', [
    'emulators:exec',
    '--only',
    'firestore',
    'node --test tests/firestore.assetManifests.rules.test.mjs tests/firestore.privacyConsent.rules.test.mjs tests/firestore.lifeModel.rules.test.mjs tests/firestore.userAuthority.rules.test.mjs',
  ])
  if (result.error) {
    console.error('[URAI] Firestore emulator command failed before tests:', result.error.message)
  }
  process.exit(result.status ?? 1)
}

if (process.env.URAI_REQUIRE_FIRESTORE_EMULATOR === '1') {
  console.error('[URAI] Required Firestore emulator could not run: Java is unavailable.')
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
