#!/usr/bin/env node
// Non-production execution wrapper for the actual first-memory callable.
// Does not deploy, connect to a cloud project, process private family data, or certify release.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const project = 'demo-urai-auth-journey'
const mode = process.argv[2]
if (!['--preflight', '--execute'].includes(mode) || process.argv.length !== 3) {
  console.error('Use exactly --preflight or --execute')
  process.exit(2)
}
const forbiddenCredentials = ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN', 'GOOGLE_OAUTH_ACCESS_TOKEN',
  'URAI_MEDIA_STAGING_ENABLE', 'URAI_MEDIA_STAGING_PROJECT', 'URAI_MEDIA_STAGING_BUCKET']
for (const key of forbiddenCredentials) {
  if (process.env[key]) throw Error(`REFUSE_INHERITED_CREDENTIAL_OR_STAGING_AUTHORITY:${key}`)
}
for (const key of ['GCLOUD_PROJECT', 'GCP_PROJECT', 'GOOGLE_CLOUD_PROJECT']) {
  if (process.env[key] && process.env[key] !== project) throw Error(`REFUSE_NONDEMO_PROJECT:${key}`)
}
if (process.env.FIREBASE_CONFIG) throw Error('REFUSE_INHERITED_FIREBASE_CONFIG')
if (process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099')
  throw Error('REFUSE_NONLOCAL_AUTH_EMULATOR')
if (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080')
  throw Error('REFUSE_NONLOCAL_FIRESTORE_EMULATOR')
if (Number(process.versions.node.split('.')[0]) !== 22) throw Error('NODE22_REQUIRED')
const necessary = ['firebase.json', 'firebase.captured-reality-emulator.json', 'apps/functions/package.json',
  'apps/functions/src/createFirstPrivateMemory.ts',
  'apps/functions/scripts/first-private-memory-emulator-proof.cjs',
  'scripts/run-pnpm.mjs']
const missing = necessary.filter(file => !existsSync(resolve(root, file)))
const java = spawnSync('java', ['-version'], { encoding: 'utf8' })
const version = /version\s+"(\d+)/.exec(java.stderr || java.stdout || '')
const java21 = java.status === 0 && Number(version?.[1]) >= 21
const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' })
const ffprobe = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' })
const ffmpegAvailable = ffmpeg.status === 0 && !ffmpeg.error
const ffprobeAvailable = ffprobe.status === 0 && !ffprobe.error
const report = { schema: 'urai-first-memory-emulator-runner-v1', project, mode,
  localOnly: true, productionMutations: false, syntheticSourceOnly: true,
  node: process.versions.node, java21, ffmpegAvailable, ffprobeAvailable,
  missing, firebaseBackendProofExecuted: false }
if (mode === '--preflight') {
  console.log(JSON.stringify(report, null, 2))
  process.exit(missing.length || !java21 || !ffmpegAvailable || !ffprobeAvailable ? 1 : 0)
}
if (missing.length) throw Error('FULL_REPOSITORY_CHECKOUT_REQUIRED:' + missing.join(','))
if (!java21) throw Error('JAVA21_REQUIRED')
if (!ffmpegAvailable) throw Error('SYNTHETIC_OPUS_GENERATOR_FFMPEG_REQUIRED')
if (!ffprobeAvailable) throw Error('SYNTHETIC_OPUS_DURATION_FFPROBE_REQUIRED')
const env = { ...process.env, GCLOUD_PROJECT: project, GCP_PROJECT: project, GOOGLE_CLOUD_PROJECT: project }
function run(label, args) {
  console.log(`[RFINAL] ${label}`)
  const result = spawnSync(process.execPath, ['scripts/run-pnpm.mjs', ...args], {
    cwd: root, env, stdio: 'inherit', shell: false,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw Error(`${label}_FAILED_EXIT_${result.status ?? 'SIGNAL'}`)
}
run('MAINTAINED_FUNCTIONS_BUILD', ['--filter', 'urai-functions', 'build'])
run('ACTUAL_AUTH_FIRESTORE_FUNCTIONS_EMULATORS', ['exec', 'firebase', 'emulators:exec',
  '--project', project, '--config', 'firebase.captured-reality-emulator.json', '--only', 'auth,firestore,functions,storage',
  'node apps/functions/scripts/first-private-memory-emulator-proof.cjs'])
console.log(JSON.stringify({ ...report, firebaseBackendProofExecuted: true,
  result: 'PASS (synthetic local emulator only)', browserPlaybackVerified: false,
  protectedMediaUploadedInLocalEmulator: true, protectedPlaybackBytesVerified: false,
  cloudBucketIAMVerified: false, productionAccepted: false }, null, 2))
