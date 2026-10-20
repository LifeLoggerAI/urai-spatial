import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const run = (executable, args, options = {}) => spawnSync(executable, args, {
  stdio: 'inherit',
  shell: false,
  ...options,
})

// A portable Node 22 process on Windows may not resolve the same 'java'
// command as interactive PowerShell. Permit an exact executable path for
// native emulator verification; explicit Java failures may not downgrade to
// static rules tests.
const explicitJava = process.env.URAI_FIRESTORE_TEST_JAVA_EXE
if (explicitJava && (!isAbsolute(explicitJava) || !existsSync(explicitJava))) {
  throw new Error('FIRESTORE_TEST_JAVA_EXECUTABLE_INVALID')
}
const javaExecutable = explicitJava || (process.platform === 'win32' ? 'java.exe' : 'java')
const javaCheck = spawnSync(javaExecutable, ['-version'], { stdio: 'ignore', shell: false })
if (explicitJava && (javaCheck.error || javaCheck.status !== 0)) {
  throw new Error('FIRESTORE_TEST_JAVA_SPAWN_FAILED:' + (javaCheck.error?.code || String(javaCheck.status)))
}

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
  // The real firebase.json has a Hosting framework source. The CLI may inspect
  // that source before starting even a Firestore-only emulator, and fail on
  // unrelated webframeworks experiments. Keep the committed rules unchanged,
  // but provide a Firestore-only emulator config outside the source tree.
  const rulesFile = resolve('firebase/firestore.rules')
  if (!existsSync(rulesFile)) throw new Error('FIRESTORE_RULES_SOURCE_MISSING')
  const temporary = mkdtempSync(join(tmpdir(), 'urai-firestore-only-'))
  let emulatorExitCode = 1
  try {
    const rulesOnlyConfig = join(temporary, 'firebase.json')
    writeFileSync(rulesOnlyConfig, JSON.stringify({
      firestore: { rules: rulesFile },
      emulators: { ui: { enabled: false } },
    }))
    // A demo- project has no live Firebase resources, even on failed fallback.
    const result = run(process.execPath, [
      firebaseBin,
      'emulators:exec',
      '--config', rulesOnlyConfig,
      '--project', 'demo-urai-rules',
      '--only', 'firestore',
      'node --test tests/firestore.assetManifests.rules.test.mjs tests/firestore.privacyConsent.rules.test.mjs tests/firestore.lifeModel.rules.test.mjs',
    ])
    emulatorExitCode = result.status ?? 1
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
  // A failed real emulator run must NEVER be replaced by a passing static fallback.
  // Static checks run only when Java was unavailable before emulator launch.
  process.exit(emulatorExitCode)
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
