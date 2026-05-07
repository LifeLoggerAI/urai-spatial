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
    'node --test tests/firestore.assetManifests.rules.test.mjs',
  ])
  process.exit(result.status ?? 1)
}

console.warn('[URAI] Java is not available, so the Firestore emulator cannot run in this environment.')
console.warn('[URAI] Running static Firestore rules boundary tests instead. Install Java for full emulator enforcement tests.')

const fallback = run('node', ['--test', 'tests/firestore.assetManifests.rules.static.test.mjs'])
process.exit(fallback.status ?? 1)
