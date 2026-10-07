import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const [expectedHead, outputDirectory] = process.argv.slice(2)
if (!/^[a-f0-9]{40}$/.test(expectedHead || '') || !outputDirectory) throw new Error('Exact source head and proof directory are required.')
const actualHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
if (actualHead !== expectedHead) throw new Error('OAuth proof source head mismatch.')
const proofDirectory = path.resolve(outputDirectory)

function summary(filename) {
  const text = fs.readFileSync(path.join(proofDirectory, filename), 'utf8')
  const counts = {}
  for (const match of text.matchAll(/^(?:#|ℹ) (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/gm)) counts[match[1]] = Number(match[2])
  if (!(counts.tests > 0) || counts.pass !== counts.tests || ['fail', 'cancelled', 'skipped', 'todo'].some((key) => counts[key] !== 0)) {
    throw new Error(`OAuth proof has missing or unsuccessful test summary: ${filename}`)
  }
  return counts
}

const sourcePaths = [
  'apps/functions/src/googleWorkspaceOAuth.ts',
  'apps/functions/test/googleWorkspaceOAuth.test.js',
  'apps/functions/test/helpers/googleWorkspaceOAuthHarness.js',
  'apps/functions/test/fixtures/googleWorkspaceOAuth.before.ts',
  'apps/functions/scripts/google-oauth-privacy-receipt.mjs',
  '.github/workflows/google-oauth-privacy-fence.yml',
  'docs/GOOGLE_WORKSPACE_OAUTH_DISCONNECT_FENCE.md',
]
function hashes(filename) {
  const content = fs.readFileSync(filename)
  return {
    bytes: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
    gitBlob: createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex'),
  }
}
const receipt = {
  schema: 'urai-google-workspace-disconnect-fence-proof/v1',
  sourceHead: actualHead,
  nodeVersion: process.version,
  baselineSource: { head: 'a99ed54d411dc48d57168cda1bb225fff0991fad', blob: 'e4e6a39a7f6d66377a532397a3efda7459225ee9' },
  oauthSuite: summary('oauth-tests.tap'),
  fullFunctionsSuite: summary('functions-tests.log'),
  verification: {
    fullFunctionsTypecheck: 'passed before receipt generation',
    firebase: 'bounded serialized transaction double; not a Firestore emulator',
    google: 'bounded synthetic HTTPS double; no live provider calls',
    encryption: 'actual Node AES-256-GCM',
    liveProviderFlow: 'unproved',
    deployedRulesAndRuntimeParity: 'unproved',
  },
  sources: Object.fromEntries(sourcePaths.map((filename) => [filename, hashes(filename)])),
  logs: Object.fromEntries(['typecheck.log', 'oauth-tests.tap', 'functions-tests.log'].map((filename) => [filename, hashes(path.join(proofDirectory, filename))])),
}
const baseline = receipt.sources['apps/functions/test/fixtures/googleWorkspaceOAuth.before.ts']
if (baseline.gitBlob !== receipt.baselineSource.blob) throw new Error('Original OAuth regression fixture does not match its pinned source blob.')
fs.writeFileSync(path.join(proofDirectory, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify({ sourceHead: receipt.sourceHead, oauthSuite: receipt.oauthSuite, fullFunctionsSuite: receipt.fullFunctionsSuite }))
