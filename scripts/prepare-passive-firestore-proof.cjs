const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const proof = path.resolve(process.env.URAI_PASSIVE_SIGNAL_PROOF_OUTPUT_DIR || 'passive-firestore-proof')
assert.equal(path.basename(proof), 'passive-firestore-proof')
const fixture = 'apps/functions/test/fixtures/passiveSignals-before-consent-transaction.ts'
const raw = fs.readFileSync(fixture)
const gitBlob = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`), raw])).digest('hex')
assert.equal(gitBlob, '167eefc30f285c549051379d45e49853e847ec0e', 'Original fixture must retain actual pre-transaction source bytes')
assert.equal(process.env.GCLOUD_PROJECT, 'demo-urai-passive-consent-proof')
assert.ok(!process.env.GOOGLE_APPLICATION_CREDENTIALS)
fs.mkdirSync(path.join(proof, 'emulator'), { recursive: true })
fs.writeFileSync(path.join(proof, 'emulator/deny-all.rules'), "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} { allow read, write: if false; }\n  }\n}\n")
fs.writeFileSync(path.join(proof, 'emulator/firebase.json'), JSON.stringify({
  firestore: { rules: 'deny-all.rules' },
  emulators: {
    firestore: { host: '127.0.0.1', port: 8089 },
    hub: { host: '127.0.0.1', port: 4419 },
    logging: { host: '127.0.0.1', port: 4519 },
    ui: { enabled: false }, singleProjectMode: true,
  },
}, null, 2) + '\n')
const script = `
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const functionsRequire = require('node:module').createRequire(path.resolve('apps/functions/package.json'))
function installedVersion(name) {
  let directory = path.dirname(functionsRequire.resolve(name))
  while (true) {
    const manifest = path.join(directory, 'package.json')
    if (fs.existsSync(manifest)) {
      const metadata = JSON.parse(fs.readFileSync(manifest, 'utf8'))
      if (metadata.name === name) return metadata.version
    }
    const parent = path.dirname(directory)
    if (parent === directory) throw new Error('Installed package manifest not found: ' + name)
    directory = parent
  }
}

const proof = path.resolve(process.env.URAI_PASSIVE_SIGNAL_PROOF_OUTPUT_DIR || 'passive-firestore-proof')
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
assert.equal(process.env.GCLOUD_PROJECT, 'demo-urai-passive-consent-proof')
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8089')
assert.ok(!process.env.GOOGLE_APPLICATION_CREDENTIALS)
const results = []
let valid = true
for (const mode of ['original', 'repaired']) {
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'test/passive-signals-firestore-transaction.test.js'], {
    cwd: 'apps/functions', encoding: 'utf8', timeout: 360000,
    env: { ...process.env, URAI_PASSIVE_SIGNAL_HANDLER_MODE: mode, URAI_PASSIVE_SIGNAL_PROOF_OUTPUT_DIR: proof },
  })
  const text = (result.stdout || '') + (result.stderr || '')
  fs.writeFileSync(path.join(proof, mode + '.tap'), text)
  process.stdout.write(text)
  const casesPath = path.join(proof, mode + '-cases.json')
  const cases = fs.existsSync(casesPath) ? JSON.parse(fs.readFileSync(casesPath, 'utf8')).cases : []
  const positive = cases.filter((item) => item.role === 'positive')
  const regression = cases.filter((item) => item.role === 'regression')
  const originalReproduced = result.status !== 0 && positive.length === 8 && positive.every((item) => item.passed) &&
    regression.length === 6 && regression.every((item) => !item.passed && item.ordering === 'VIOLATION_SIGNAL_COMMITTED_AFTER_REVOCATION')
  const repairPassed = result.status === 0 && cases.length === 14 && cases.every((item) => item.passed)
  valid = valid && (mode === 'original' ? originalReproduced : repairPassed)
  results.push({ mode, exitStatus: result.status, signal: result.signal, tests: cases.length,
    positivePassed: positive.filter((item) => item.passed).length,
    regressionPassed: regression.filter((item) => item.passed).length,
    regressionFailed: regression.filter((item) => !item.passed).length,
    originalActualRegressionReproduced: mode === 'original' ? originalReproduced : undefined,
    repairActualCasesPassed: mode === 'repaired' ? repairPassed : undefined,
    tapSha256: hash(path.join(proof, mode + '.tap')),
    casesSha256: fs.existsSync(casesPath) ? hash(casesPath) : null,
  })
}
const functionsProof = path.join(proof, 'functions-suite', 'passive-firestore-proof')
const full = spawnSync(process.execPath, ['scripts/run-tests.mjs'], {
  cwd: 'apps/functions', encoding: 'utf8', timeout: 360000,
  env: { ...process.env, URAI_PASSIVE_SIGNAL_HANDLER_MODE: 'repaired', URAI_PASSIVE_SIGNAL_PROOF_OUTPUT_DIR: functionsProof },
})
const fullText = (full.stdout || '') + (full.stderr || '')
fs.writeFileSync(path.join(proof, 'functions-suite.tap'), fullText)
process.stdout.write(fullText)
const tests = Number(fullText.match(/^# tests (\\d+)$/m)?.[1] || 0)
const passed = full.status === 0 && tests > 0 && /^# fail 0$/m.test(fullText) && /^# skipped 0$/m.test(fullText)
valid = valid && passed
const functionsSuite = { exitStatus: full.status, signal: full.signal, tests, passed,
  tapSha256: hash(path.join(proof, 'functions-suite.tap')),
  casesSha256: fs.existsSync(path.join(functionsProof, 'repaired-cases.json')) ? hash(path.join(functionsProof, 'repaired-cases.json')) : null }
const emulatorJars = fs.readdirSync(process.env.FIREBASE_EMULATORS_PATH).filter((name) => /^cloud-firestore-emulator.*[.]jar$/.test(name))
assert.equal(emulatorJars.length, 1, 'One actual executed Firestore emulator jar required')
const emulatorJar = path.join(process.env.FIREBASE_EMULATORS_PATH, emulatorJars[0])
const java = spawnSync('java', ['-version'], { encoding: 'utf8' })
assert.equal(java.status, 0)
fs.writeFileSync(path.join(proof, 'receipt.json'), JSON.stringify({
  schemaVersion: 'urai-passive-consent-real-firestore-native-receipt-v1',
  sourceSha: process.env.URAI_PROOF_SOURCE_SHA,
  nodeVersion: process.version,
  firebaseAdminVersion: installedVersion('firebase-admin'),
  firebaseFunctionsVersion: installedVersion('firebase-functions'),
  typeScriptVersion: installedVersion('typescript'),
  firebaseCliVersion: installedVersion('firebase-tools'),
  project: process.env.GCLOUD_PROJECT, emulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
  javaRuntime: String(java.stdout || '') + String(java.stderr || ''),
  emulatorJar: emulatorJars[0], emulatorJarSha256: hash(emulatorJar),
  originalSourceGitBlob: '167eefc30f285c549051379d45e49853e847ec0e',
  sourceSha256: hash('apps/functions/src/passiveSignals.ts'),
  compiledModuleSha256: hash('apps/functions/lib/apps/functions/src/passiveSignals.js'),
  originalFixtureSha256: hash('apps/functions/test/fixtures/passiveSignals-before-consent-transaction.ts'),
  originalCompiledSha256: hash('apps/functions/test/proof-original/passiveSignals-before-consent-transaction.js'),
  testSha256: hash('apps/functions/test/passive-signals-firestore-transaction.test.js'),
  rulesSha256: hash(path.join(proof, 'emulator/deny-all.rules')),
  rulesMode: 'deny-all-client-rules-admin-sdk-transaction-test',
  realFirestoreEmulatorAndSdk: true,
  syntheticCallableContextAndReadScheduling: true,
  jwtOrAppCheckVerification: false, firestoreRulesVerification: false,
  productionOrDeploymentVerification: false, shipAuthorized: false,
  results, functionsSuite, state: valid ? 'ACTUAL_EMULATOR_ORDERING_VERIFIED' : 'FAILED',
}, null, 2) + '\\n')
process.exit(valid ? 0 : 1)
`
fs.writeFileSync(path.join(proof, 'run-real-firestore.cjs'), script)
