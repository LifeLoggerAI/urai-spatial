#!/usr/bin/env node
// One UrAi Genesis R887: source-preserving, fail-closed Firebase Functions predeploy custody.
// prepare: derive a short-lived Firebase config that retains the canonical export guard and
// compiler hook; verify: recheck the attested compiled bytes AFTER that compiler hook.
// This offline gate does not deploy or establish provider-side package/revision identity.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyFunctionsBuild } from './R883_VERIFY_FUNCTIONS_BUILD.mjs'

const sha40 = /^[0-9a-f]{40}$/
const runPattern = /^[1-9][0-9]*$/
const canonicalName = 'firebase.json'
const governedName = 'firebase.r887.governed.json'
const manifestName = 'deployment-receipt/predeploy/functions-build-evidence.json'
const configEvidenceName = 'deployment-receipt/predeploy/r887-governed-config-evidence.json'
const postbuildEvidenceName = 'deployment-receipt/predeploy/r887-post-predeploy-evidence.json'
const finalGuard = 'node scripts/r887-guard-functions-predeploy.mjs --mode verify'
const originalHooks = [
  'node scripts/check-spatial-export-deployment-boundary.mjs',
  'pnpm --filter urai-functions build',
]
const digest = value => createHash('sha256').update(value).digest('hex')
const parse = file => JSON.parse(regularBytes(file).toString('utf8'))

function regularBytes(file) {
  const st = lstatSync(file)
  if (!st.isFile() || st.isSymbolicLink()) throw new Error(`Refusing non-regular file: ${file}`)
  return readFileSync(file)
}
function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim()
}
function validateContext(root, env, phase) {
  const releaseSha = env.RELEASE_SHA
  const runId = env.GITHUB_RUN_ID
  if (!sha40.test(releaseSha || '') || !runPattern.test(runId || '')) {
    throw new Error('Exact release commit and positive numeric Actions run ID required')
  }
  if (env.GITHUB_REPOSITORY !== 'LifeLoggerAI/urai-spatial' || env.FIREBASE_PROJECT !== 'urai-4dc1d') {
    throw new Error('Wrong canonical repository or Firebase project')
  }
  if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Node 22 required')
  if (git(root, ['rev-parse', 'HEAD']) !== releaseSha) throw new Error('Source HEAD differs from release SHA')
  try { git(root, ['diff', '--quiet', 'HEAD', '--', canonicalName]) }
  catch { throw new Error('Canonical Firebase config differs from Git HEAD') }
  if (phase === 'verify') {
    if (!env.PROJECT_DIR || resolve(env.PROJECT_DIR) !== root) throw new Error('Firebase PROJECT_DIR differs from checkout root')
    if (!env.RESOURCE_DIR || resolve(env.RESOURCE_DIR) !== join(root, 'apps/functions')) {
      throw new Error('Firebase RESOURCE_DIR differs from attested Functions source')
    }
    if (env.GCLOUD_PROJECT !== env.FIREBASE_PROJECT) throw new Error('Firebase hook active project mismatch')
  }
  return { releaseSha, runId }
}
export function deriveGovernedConfig(canonical) {
  if (!canonical || typeof canonical !== 'object' || Array.isArray(canonical)) throw new Error('Malformed Firebase config')
  const f = canonical.functions
  if (!f || typeof f !== 'object' || Array.isArray(f) || f.source !== 'apps/functions' ||
      f.codebase !== 'urai-spatial-functions' || f.runtime !== 'nodejs22') {
    throw new Error('Canonical Firebase Functions identity changed')
  }
  if (!Array.isArray(f.predeploy) || JSON.stringify(f.predeploy) !== JSON.stringify(originalHooks)) {
    throw new Error('Canonical export guard or compiler predeploy hooks changed')
  }
  if (f.postdeploy !== undefined) throw new Error('Unreviewed Functions postdeploy hook')
  return { ...canonical, functions: { ...f, predeploy: [...originalHooks, finalGuard] } }
}
function expectedConfig(root) { return deriveGovernedConfig(parse(join(root, canonicalName))) }
function manifestArgs(root, {releaseSha, runId}) {
  return {repoRoot:root,expectedSha:releaseSha,runId,manifestPath:join(root,manifestName)}
}
export function prepareGovernedFunctions({repoRoot, env = process.env}) {
  const root = resolve(repoRoot)
  const ctx = validateContext(root, env, 'prepare')
  const configPath = join(root, governedName)
  const receiptPath = join(root, configEvidenceName)
  if (existsSync(configPath) || existsSync(receiptPath)) throw new Error('Refusing to overwrite generated config or prior receipt')
  const build = verifyFunctionsBuild(manifestArgs(root,ctx))
  const canonicalBytes = regularBytes(join(root,canonicalName))
  const derived = expectedConfig(root)
  const bytes = Buffer.from(JSON.stringify(derived, null, 2) + '\n')
  writeFileSync(configPath, bytes, {flag:'wx',mode:0o600})
  const evidence = {
    schemaVersion:'urai-r887-governed-functions-config-1',
    repository:env.GITHUB_REPOSITORY,project:env.FIREBASE_PROJECT,
    releaseSha:ctx.releaseSha,workflowRunId:ctx.runId,
    originalFirebaseSha256:digest(canonicalBytes),
    governedConfigSha256:digest(regularBytes(configPath)),
    buildInputsSha256:build.buildInputsSha256,
    compiledOutputDigestSha256:build.compiledOutputDigestSha256,
    originalPredeployHooks:originalHooks,
    appendedPostbuildHook:finalGuard,
    productionCertified:false,
  }
  writeFileSync(receiptPath, JSON.stringify(evidence,null,2)+'\n', {flag:'wx',mode:0o600})
  return {pass:true,phase:'prepare',config:governedName,releaseSha:ctx.releaseSha,productionCertified:false}
}
export function verifyAfterFirebasePredeploy({repoRoot,env = process.env}) {
  const root = resolve(repoRoot)
  const ctx = validateContext(root, env, 'verify')
  const evidence = parse(join(root,configEvidenceName))
  const generatedBytes = regularBytes(join(root,governedName))
  const config = JSON.parse(generatedBytes.toString('utf8'))
  assert.deepEqual(config,expectedConfig(root),'Governed Firebase config differs from canonical preserved hooks')
  const expected = {
    repository:env.GITHUB_REPOSITORY,project:env.FIREBASE_PROJECT,
    releaseSha:ctx.releaseSha,workflowRunId:ctx.runId,
    originalFirebaseSha256:digest(regularBytes(join(root,canonicalName))),
    governedConfigSha256:digest(generatedBytes),
  }
  for (const [key,value] of Object.entries(expected)) {
    if (evidence[key] !== value) throw new Error(`Governed Firebase config receipt ${key} mismatch`)
  }
  if (evidence.schemaVersion !== 'urai-r887-governed-functions-config-1' || evidence.productionCertified !== false ||
      JSON.stringify(evidence.originalPredeployHooks) !== JSON.stringify(originalHooks) || evidence.appendedPostbuildHook !== finalGuard) {
    throw new Error('Invalid governed Firebase predeploy custody receipt')
  }
  const verified = verifyFunctionsBuild(manifestArgs(root,ctx))
  if (verified.buildInputsSha256 !== evidence.buildInputsSha256 ||
      verified.compiledOutputDigestSha256 !== evidence.compiledOutputDigestSha256) {
    throw new Error('Postpredeploy Functions bytes differ from recorded custody')
  }
  const result = {
    schemaVersion:'urai-r887-functions-post-predeploy-1',
    releaseSha:ctx.releaseSha,workflowRunId:ctx.runId,
    governedConfigSha256:digest(generatedBytes),
    buildInputsSha256:verified.buildInputsSha256,
    compiledOutputDigestSha256:verified.compiledOutputDigestSha256,
    providerReadback:false,productionCertified:false,
  }
  writeFileSync(join(root,postbuildEvidenceName),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600})
  return {pass:true,phase:'verify',releaseSha:ctx.releaseSha,compiledOutputDigestSha256:verified.compiledOutputDigestSha256,productionCertified:false}
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [modeFlag,mode] = process.argv.slice(2)
    if (process.argv.length !== 4 || modeFlag !== '--mode') throw new Error('Expected --mode prepare or --mode verify')
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const result = mode === 'prepare' ? prepareGovernedFunctions({repoRoot:root}) :
      mode === 'verify' ? verifyAfterFirebasePredeploy({repoRoot:root}) :
      (()=>{throw new Error('Unknown governed predeploy mode')})()
    process.stdout.write(JSON.stringify(result)+'\n')
  } catch (error) {
    process.stderr.write(`R887 HOLD: Firebase Functions post-predeploy integrity refused (${error instanceof Error ? error.message : String(error)})\n`)
    process.exitCode = 1
  }
}
