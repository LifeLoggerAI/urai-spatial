import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const run = (executable, args, options = {}) => spawnSync(executable, args, {
  stdio: 'inherit',
  shell: false,
  ...options,
})

const javaCheck = spawnSync('java', ['-version'], { stdio: 'ignore', shell: false })

if (javaCheck.status === 0) {
  // Windows command shells split the single emulators:exec script argument,
  // forwarding --test to Firebase instead of Node. Invoke the pinned JS CLI
  // via Node with explicit argv and without a command shell.
  const firebaseManifestPath = require.resolve('firebase-tools/package.json')
  const manifest = JSON.parse(readFileSync(firebaseManifestPath, 'utf8'))
  const firebaseEntry = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.firebase
  if (typeof firebaseEntry !== 'string' || !firebaseEntry.endsWith('.js')) {
    throw new Error('FIREBASE_TOOLS_ENTRYPOINT_UNAVAILABLE')
  }
  const firebaseBin = resolve(dirname(firebaseManifestPath), firebaseEntry)
  const result = run(process.execPath, [
    firebaseBin,
    'emulators:exec',
    '--only',
    'firestore',
    'node --test tests/firestore.assetManifests.rules.test.mjs tests/firestore.privacyConsent.rules.test.mjs tests/firestore.lifeModel.rules.test.mjs',
  ])
  process.exit(result.status ?? 1)
}

console.warn('[URAI] Java is not available, so the Firestore emulator cannot run in this environment.')
console.warn('[URAI] Running static Firestore rules boundary tests instead. Install Java for full emulator enforcement tests.')

const fallback = run(process.execPath, [
  '--test',
  'tests/firestore.assetManifests.rules.static.test.mjs',
  'tests/firestore.privacyConsent.rules.static.test.mjs',
  'tests/firestore.lifeModel.rules.static.test.mjs',
])
process.exit(fallback.status ?? 1)
