import { spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const run = (executable, args, options = {}) => spawnSync(executable, args, {
  stdio: 'inherit',
  shell: false,
  ...options,
})

// Reserve an independent loopback port rather than terminate or reuse an
// unrelated running Firestore emulator. A bind race is a real emulator FAIL;
// it must never turn into a passing static-rules fallback.
async function allocateIsolatedFirestorePort() {
  return new Promise((resolvePort, rejectPort) => {
    const listener = createServer()
    listener.once('error', rejectPort)
    listener.listen(0, '127.0.0.1', () => {
      const address = listener.address()
      if (!address || typeof address === 'string' || !Number.isInteger(address.port) || address.port < 1024) {
        listener.close()
        rejectPort(new Error('FIRESTORE_TEST_LOOPBACK_PORT_INVALID'))
        return
      }
      listener.close(error => error ? rejectPort(error) : resolvePort(address.port))
    })
  })
}

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
// Only a missing Java executable (ENOENT) permits the static fallback.
// An installed but broken Java runtime, or a permission/spawn error, must
// remain a hard failure regardless of whether the Java path was explicit.
const javaMissing = !explicitJava && javaCheck.error?.code === 'ENOENT'
if (!javaMissing && (javaCheck.error || javaCheck.status !== 0)) {
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
  const firestorePort = await allocateIsolatedFirestorePort()
  const temporary = mkdtempSync(join(tmpdir(), 'urai-firestore-only-'))
  let emulatorExitCode = 1
  try {
    const rulesOnlyConfig = join(temporary, 'firebase.json')
    writeFileSync(rulesOnlyConfig, JSON.stringify({
      firestore: { rules: rulesFile },
      emulators: { ui: { enabled: false }, firestore: { host: '127.0.0.1', port: firestorePort } },
    }))
    // A demo- project has no live Firebase resources, even on failed fallback.
    // Firebase probes and starts `java` by name in its own subprocesses. The
    // explicit executable must control that process tree, not just our probe.
    const emulatorEnv = { ...process.env }
    // The emulator subprocess must not inherit another process's address.
    // emulators:exec will set FIRESTORE_EMULATOR_HOST for its own test clients.
    delete emulatorEnv.FIRESTORE_EMULATOR_HOST
    if (explicitJava) {
      const pathKey = Object.keys(emulatorEnv).find(key => key.toLowerCase() === 'path') || 'PATH'
      emulatorEnv[pathKey] = dirname(explicitJava) + delimiter + (emulatorEnv[pathKey] || '')
    }
    const result = run(process.execPath, [
      firebaseBin,
      'emulators:exec',
      '--config', rulesOnlyConfig,
      '--project', 'demo-urai-rules',
      '--only', 'firestore',
      'node scripts/firestore-live-rule-session.mjs',
    ], { env: emulatorEnv })
    emulatorExitCode = result.status ?? 1
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
  // A failed real emulator run must NEVER be replaced by a passing static fallback.
  // Static checks run only when Java was unavailable before emulator launch.
  process.exit(emulatorExitCode)
} else {
  // Only a missing Java runtime authorizes the static fallback. A failed
  // real emulator must never be replaced with a weaker static result.
  console.warn('[URAI] Java is not available, so the Firestore emulator cannot run in this environment.')
  console.warn('[URAI] Running static Firestore rules boundary tests instead. Install Java for full emulator enforcement tests.')

  const fallback = run(process.execPath, [
    '--test',
    'tests/firestore.assetManifests.rules.static.test.mjs',
    'tests/firestore.privacyConsent.rules.static.test.mjs',
    'tests/firestore.lifeModel.rules.static.test.mjs',
  ])
  process.exitCode = fallback.status ?? 1
}
