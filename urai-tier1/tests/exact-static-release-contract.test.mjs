import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { resolvePython3 } from '../../scripts/python3-runtime.mjs'
import { enforceStaticLaunchBoundary } from '../../scripts/enforce-static-launch-boundary.mjs'

const normalize = (source) => source.replace(/\r\n?/g, '\n')
const testDir = path.dirname(fileURLToPath(import.meta.url))
const tier1Root = path.resolve(testDir, '..')
const repoRoot = path.resolve(tier1Root, '..')
const readTier1 = (file) => normalize(readFileSync(path.join(tier1Root, file), 'utf8'))
const readRepo = (file) => normalize(readFileSync(path.join(repoRoot, file), 'utf8'))

async function findOwnedPreviewPort() {
  const socket = createServer()
  await new Promise((resolve, reject) => {
    socket.once('error', reject)
    socket.listen(0, '127.0.0.1', resolve)
  })
  const port = socket.address().port
  await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()))
  return port
}

async function stopOwnedPreview(server) {
  if (!server || server.exitCode !== null || server.signalCode !== null) return
  await new Promise(resolve => {
    let settled = false
    let timer
    const done = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      server.off('close', done)
      resolve()
    }
    server.once('close', done)
    timer = setTimeout(done, 2500)
    try { server.kill('SIGTERM') } catch { done() }
    if (server.exitCode !== null || server.signalCode !== null) done()
  })
}

const hosting = JSON.parse(readRepo('firebase.static.json')).hosting
const dynamicHosting = JSON.parse(readRepo('firebase.json')).hosting
const layout = readTier1('src/app/layout.tsx')
const operator = readRepo('scripts/live-release.mjs')
const workflow = readRepo('.github/workflows/spatial-live-deploy.yml')
const bundleBuilder = readRepo('scripts/create-static-release-bundle.mjs')
const credentialBoundary = readRepo('scripts/verify-release-credential-boundary.mjs')
const verifier = readRepo('scripts/urai-post-deploy-smoke.mjs')
const legacyBootstrapVerifier = readRepo('scripts/verify-legacy-live-bootstrap.mjs')

function hasAll(source, markers, label) {
  for (const marker of markers) assert.ok(source.includes(marker), `missing ${label} marker: ${marker}`)
}

function job(source, name) {
  const marker = `\n  ${name}:\n`
  const start = source.indexOf(marker)
  assert.ok(start >= 0, `missing workflow job: ${name}`)
  const rest = source.slice(start + marker.length)
  const next = rest.search(/\n  [A-Za-z0-9_-]+:\n/)
  return next < 0 ? rest : rest.slice(0, next)
}

test('Firebase publishes the canonical static export with full governed provider and commerce rewrites', () => {
  assert.equal(hosting.public, 'urai-tier1/out')
  assert.equal(hosting.cleanUrls, true)
  assert.equal(hosting.trailingSlash, true)
  const commerceRewrites = [
    { source: '/api/stripe/create-checkout-session', function: { functionId: 'createStripeCheckout', region: 'us-central1' } },
    { source: '/api/stripe/create-portal-session', function: { functionId: 'createStripeCustomerPortal', region: 'us-central1' } },
    { source: '/api/entitlement', function: { functionId: 'getStripeEntitlement', region: 'us-central1' } },
    { source: '/api/stripe/webhook', function: { functionId: 'handleStripeWebhook', region: 'us-central1' } },
  ]
  assert.deepEqual(hosting.rewrites, [...dynamicHosting.rewrites, ...commerceRewrites])
  assert.ok(hosting.ignore.includes('**/.*'))
  assert.equal(hosting.rewrites.some((rewrite) => rewrite.source === '**' || rewrite.source === '/**'), false)
})
test('public output carries exact deployment identity or an unverified state', () => {
  hasAll(layout, ['NEXT_PUBLIC_URAI_BUILD_SHA','process.env.GITHUB_SHA','data-deployed-sha','data-deployment-evidence','unverified'], 'layout')
})

test('release operator is fail-closed and rejects deploy or long-lived credential authority', () => {
  hasAll(operator, ["process.argv.includes('--deploy')","process.argv.includes('--deploy-prebuilt')",'forbiddenCredentialEnv','FIREBASE_SERVICE_ACCOUNT_JSON','FIREBASE_PRIVATE_KEY','FIREBASE_CLIENT_EMAIL','FIREBASE_TOKEN','URAI Spatial production release is NO-GO','No provider credentials were loaded and no production mutation was attempted.'], 'operator')
  assert.doesNotMatch(operator, /firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|gcloud\s+deploy|pnpm\s+live:deploy/)
  assert.doesNotMatch(operator, /writeTemporaryServiceAccount|resolveManagedCredentialPath|--only['"],?\s*['"]hosting/)
})

test('bundle producer remains deterministic while quarantined operator cannot deploy it', () => {
  const marker = 'return files.sort((left, right) => left.relative.localeCompare(right.relative))'
  assert.ok(bundleBuilder.includes(marker))
  assert.ok(!operator.includes('validateAndMaterializePrebuiltBundle'))
  assert.ok(!operator.includes(marker))
})

test('canonical production workflow is exact-head verification-only with isolated WIF proof', () => {
  const verify = job(workflow, 'verify')
  const wif = job(workflow, 'prove-wif-runtime-identity')
  hasAll(workflow, ['name: URAI Canonical Production Release Verification','permissions:','contents: read','EXACT_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}','workflow_dispatch:'], 'verification workflow')
  hasAll(verify, ['Verify canonical source with production release quarantined','Checkout exact source','ref: ${{ env.EXACT_HEAD_SHA }}','persist-credentials: false','Prove exact clean source','pnpm install --frozen-lockfile','node scripts/audit-production-workflow-authority.mjs','node scripts/verify-release-credential-boundary.mjs','node scripts/verify-release-credential-boundary-static.mjs','Record NO-GO release classification','Production release and Hosting recovery are intentionally quarantined.','Upload verification evidence'], 'verification job')
  hasAll(wif, ['Prove short-lived Google WIF identity',"if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",'id-token: write','google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',"workload_identity_provider: 'projects/952723774155/locations/global/workloadIdentityPools/urai-github-prod/providers/github-actions'","service_account: 'urai-spatial-github-deployer@urai-4dc1d.iam.gserviceaccount.com'",'Production mutation command: none'], 'WIF proof job')
  assert.doesNotMatch(workflow, /environment:\s*production/)
  assert.doesNotMatch(workflow, /FIREBASE_SERVICE_ACCOUNT_JSON/)
  assert.doesNotMatch(workflow, /node scripts\/live-release\.mjs --deploy-prebuilt/)
  assert.doesNotMatch(workflow, /firebase\s+deploy|firebase\s+hosting:clone/)
})

test('authority bundle remains deterministic and credential verifier binds quarantine state', () => {
  hasAll(bundleBuilder, ["schemaVersion: 'urai-static-release-bundle-1'",'assertCleanAuthorityCheckout()','authoritySha','targetSha','rollbackSha','Release bundle source must not contain symlinks','isFirebaseIgnoredPath',"relative.split('/').some((segment) => segment.startsWith('.'))",'Static output contains a Firebase-ignored dot path','Copied release bundle bytes do not match the source output','fingerprintSha256','fileCount','totalBytes','sha256'], 'bundle attester')
  assert.doesNotMatch(bundleBuilder, /path\.posix\.basename\(relative\)\.startsWith\('\.'\)/)
  hasAll(credentialBoundary, ["schemaVersion: 'urai-release-credential-boundary-7'","mode: 'quarantine-no-go'",'exactHeadVerificationOnly: true','productionMutationAvailable: false','productionCredentialsAvailable: false','mainOnlyReadOnlyWifProofConfigured: true','runtimeMutationIntentDetected','providerWifIamProofRequiredBeforeMutation: true','independentReviewRequiredBeforeMutation: true',"releaseClassification: 'NO-GO'"], 'credential boundary')
  assert.doesNotMatch(credentialBoundary, /writeTemporaryServiceAccount|managedCredentialPathRequiredForProductionWrite|firebaseCliResolvedFromCurrentAuthority/)
})

test('live verification binds canonical routes, origin, SHA, authority, and fingerprint', () => {
  hasAll(verifier, ['URAI_EXPECTED_DEPLOYED_SHA','URAI_EXPECTED_ROLLBACK_SHA','release-fingerprint.json','urai-release-fingerprint-1',"redirect: 'manual'",'finalUrl.origin === canonicalOrigin','payload?.authoritySha === expectedAuthoritySha','sha === expectedSha','live-content-parity-6','hydratedIdentityProof'], 'live verifier')
})

test('Focus live verification requires the real static chamber and rejects the obsolete loading shell', () => {
  const expected = "['/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', ['urai-final-focus-chamber', 'URAI Focus stellar memory field', 'data-focus-spatial'], ['Focus loading']]"
  const obsolete = "['/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', ['Focus loading'], []]"
  assert.ok(verifier.includes(expected))
  assert.ok(!verifier.includes(obsolete))
})

test('legacy bootstrap verifier remains dormant and bounded while quarantined workflow cannot invoke it', () => {
  assert.ok(!workflow.includes('BOOTSTRAP_LEGACY_URAI_APP'))
  assert.ok(!workflow.includes('URAI_LEGACY_BOOTSTRAP_CONFIRM'))
  assert.ok(!credentialBoundary.includes('legacyBootstrapRequested'))
  assert.ok(!credentialBoundary.includes('verifyLegacyLiveBootstrap'))
  hasAll(legacyBootstrapVerifier, ["schemaVersion: 'urai-legacy-live-bootstrap-provenance-1'",'valid release fingerprint already exists','recognized-legacy-html','Legacy bootstrap recovery SHA must be distinct from current main',"runGit(['merge-base', '--is-ancestor', recoverySha, currentMainSha])","path.join(evidenceDirectory, 'live-rollback-provenance.json')",'normalFingerprintDeployRequiredAfterBootstrap: true'], 'legacy bootstrap verifier')
})

test('quarantined production verification binds exact source identity without claiming live SHA proof', () => {
  hasAll(workflow, ['EXACT_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}','test "$(git rev-parse HEAD)" = "$EXACT_HEAD_SHA"','test -z "$(git status --porcelain --untracked-files=all)"','Classification: NO-GO','Commit: $EXACT_HEAD_SHA'], 'exact source verification')
  assert.doesNotMatch(workflow, /grep -R --fixed-strings --include='\*\.html'/)
  assert.doesNotMatch(workflow, /URAI_EXPECTED_DEPLOYED_SHA|URAI_EXPECTED_ROLLBACK_SHA/)
})

test('manual trigger remains verification-only and exposes no deploy or rollback path', () => {
  hasAll(workflow, ['workflow_dispatch:','Verify production authority is fail-closed','Production mutation is forbidden while provider WIF/IAM and runtime identity remain unproven.','Re-enable only after short-lived provider identity, WIF/IAM trust, least privilege, runtime read-back, rollback evidence, and historical credential revocation are independently verified.'], 'quarantined manual verification')
  assert.doesNotMatch(workflow, /rollback_sha:|release_sha:|confirm:/)
  assert.doesNotMatch(workflow, /build-release-output:|attest-release-bundle:|rollback-verify:|\n  deploy:\n/)
  assert.doesNotMatch(workflow, /gh workflow run spatial-live-deploy\.yml/)
})


test('authority bundle requires public login, privacy policy, and support pages in static export', () => {
  for (const routePage of ['login/index.html', 'privacy-policy/index.html', 'support/index.html']) {
    assert.ok(bundleBuilder.includes(`'${routePage}'`), `bundle builder must require ${routePage}`)
  }
  assert.ok(bundleBuilder.includes('Static output is missing required public route'))
})

function withConditionalExport(routes, inspect) {
  const output = mkdtempSync(path.join(os.tmpdir(), 'urai-static-boundary-'))
  try {
    mkdirSync(path.join(output, 'api/system'), {recursive:true})
    writeFileSync(path.join(output, 'api/system/deploy-proof'), JSON.stringify({service:'urai-spatial-deploy-proof',repository:'LifeLoggerAI/urai-spatial',conditionalRoutes:routes,deploymentFreshness:{commitSha:'a'.repeat(40)}}))
    for (const route of ['xr', 'spatial/ar-vr', 'home']) {
      mkdirSync(path.join(output, route), {recursive:true})
      writeFileSync(path.join(output, route, 'index.html'), route === 'spatial/ar-vr' ? '<main data-xr-release-state="technical-preview" data-xr-immersive-authority="disabled"><h1>URAI AR / VR / XR entry chamber</h1>Live WebXR headset sessions remain disabled</main>' : `<main>${route}</main>`)
      writeFileSync(path.join(output, `${route}.html`), route === 'spatial/ar-vr' ? '<main data-xr-release-state="technical-preview" data-xr-immersive-authority="disabled"><h1>URAI AR / VR / XR entry chamber</h1>Live WebXR headset sessions remain disabled</main>' : `<main>${route}</main>`)
    }
    mkdirSync(path.join(output,'xr/navmeshes'),{recursive:true})
    writeFileSync(path.join(output,'xr/navmeshes/home-platform-v1.json'),'verified-existing-navmesh')
    inspect(output)
  } finally { rmSync(output, {recursive:true,force:true}) }
}

test('static export removes disabled immersive XR but preserves audited technical preview and unrelated Home bytes', () => {
  withConditionalExport(['/xr','/spatial/ar-vr'].map(route=>({route,enabled:false,expectedStatus:route==='/xr'?404:200,previewOnly:route==='/spatial/ar-vr'})), output=>{
    const before=readFileSync(path.join(output,'home/index.html'))
    const receipt=enforceStaticLaunchBoundary(output)
    assert.equal(existsSync(path.join(output,'xr/index.html')),false)
    assert.equal(existsSync(path.join(output,'xr.html')),false)
    assert.equal(existsSync(path.join(output,'spatial/ar-vr/index.html')),true)
    assert.equal(existsSync(path.join(output,'spatial/ar-vr.html')),true)
    assert.deepEqual(readFileSync(path.join(output,'home/index.html')),before)
    assert.equal(readFileSync(path.join(output,'xr/navmeshes/home-platform-v1.json'),'utf8'),'verified-existing-navmesh')
    assert.equal(receipt.sourceSha,'a'.repeat(40))
    assert.equal(receipt.deviceAcceptance,false)
    assert.equal(enforceStaticLaunchBoundary(output).routes.every(route=>route.artifactsRemoved.length===0),true)
  })
})

test('static export preserves explicitly enabled XR artifacts without granting device acceptance', () => {
  withConditionalExport(['/xr','/spatial/ar-vr'].map(route=>({route,enabled:false,expectedStatus:route==='/xr'?404:200,previewOnly:route==='/spatial/ar-vr'})), output=>{
    const receipt=enforceStaticLaunchBoundary(output)
    assert.equal(existsSync(path.join(output,'xr/index.html')),false)
    assert.equal(existsSync(path.join(output,'spatial/ar-vr/index.html')),true)
    assert.equal(receipt.deviceAcceptance,false)
  })
})

test('inconsistent, duplicate, or incomplete conditional authority fails before removing exports', () => {
  for (const routes of [
    [{route:'/xr',enabled:false,expectedStatus:200},{route:'/spatial/ar-vr',enabled:false,expectedStatus:404}],
    [{route:'/xr',enabled:false,expectedStatus:404},{route:'/xr',enabled:false,expectedStatus:404}],
    [{route:'/xr',enabled:false,expectedStatus:404}],
  ]) withConditionalExport(routes,output=>{
    assert.throws(()=>enforceStaticLaunchBoundary(output),/authority/)
    assert.equal(existsSync(path.join(output,'xr/index.html')),true)
  })
})

test('both native static-build entry points enforce compiled conditional launch boundaries', () => {
  const scripts=JSON.parse(readRepo('package.json')).scripts
  for(const key of ['build:static','next-export']) assert.ok(scripts[key].endsWith('&& node scripts/enforce-static-launch-boundary.mjs'))
})

test('actual local preview serves canonical 404s and retained navmesh bytes without directory listings', async () => {
  const output=mkdtempSync(path.join(os.tmpdir(),'urai-preview-status-'))
  let server, serverLaunchError
  try {
    mkdirSync(path.join(output,'api/system'),{recursive:true})
    mkdirSync(path.join(output,'xr/navmeshes'),{recursive:true})
    mkdirSync(path.join(output,'home'),{recursive:true})
    writeFileSync(path.join(output,'api/system/deploy-proof'),JSON.stringify({conditionalRoutes:['/xr','/spatial/ar-vr'].map(route=>({route,enabled:false,expectedStatus:route==='/xr'?404:200,previewOnly:route==='/spatial/ar-vr'}))}))
    writeFileSync(path.join(output,'404.html'),'<main><h1>This destination is unavailable.</h1><a href="/home/">Return Home</a></main>')
    writeFileSync(path.join(output,'home/index.html'),'<main>Existing Home</main>')
    mkdirSync(path.join(output,'spatial/ar-vr'),{recursive:true})
    writeFileSync(path.join(output,'spatial/ar-vr/index.html'),'<main data-xr-release-state="technical-preview" data-xr-immersive-authority="disabled">URAI AR / VR / XR entry chamber - Live WebXR headset sessions remain disabled</main>')
    writeFileSync(path.join(output,'xr/navmeshes/home-platform-v1.json'),'existing-navmesh')
    const python = resolvePython3()
    const port = await findOwnedPreviewPort()
    server = spawn(python.command,[...python.prefix,path.join(repoRoot,'scripts/serve-static-preview.py'),'--directory',output,'--port',String(port)],{stdio:'ignore',windowsHide:true})
    server.on('error', error => { serverLaunchError = error })
    const base = `http://127.0.0.1:${port}`
    let ready=false
    for(let attempt=0;attempt<100;attempt++) {
      if(serverLaunchError || server.exitCode !== null || server.signalCode !== null) throw new Error('OWNED_PREVIEW_FAILED: ' + String(serverLaunchError || server.exitCode || server.signalCode))
      try {if((await fetch(`${base}/home/`,{signal:AbortSignal.timeout(1500)})).ok){ready=true;break}} catch {}
      await new Promise(resolve=>setTimeout(resolve,20))
    }
    assert.equal(ready,true,'owned preview server must start')
    for(const route of ['/xr','/xr/','/xr/navmeshes/']) {
      const response=await fetch(base+route,{redirect:'manual'})
      assert.equal(response.status,404,route)
      assert.match(await response.text(),/This destination is unavailable/)
      assert.equal(response.headers.get('x-content-type-options'),'nosniff')
    }
    // The finite static server canonicalizes directory URLs before serving
    // the real exported preview. Neither the intermediate 301 nor final 200
    // may authorize immersive WebXR; /xr itself must remain a strict 404.
    const canonical=await fetch(base+'/spatial/ar-vr',{redirect:'manual'})
    assert.equal(canonical.status,301,'unslashed directory must only redirect locally')
    assert.equal(new URL(canonical.headers.get('location'),base).pathname,'/spatial/ar-vr/')
    for(const route of ['/spatial/ar-vr','/spatial/ar-vr/']) {
      const response=await fetch(base+route,{redirect:'follow'})
      assert.equal(response.status,200,route)
      assert.equal(new URL(response.url).pathname,'/spatial/ar-vr/')
      const html=await response.text()
      assert.match(html,/data-xr-release-state=["']technical-preview["']/)
      assert.match(html,/data-xr-immersive-authority=["']disabled["']/)
      assert.match(html,/Live WebXR headset sessions remain disabled/)
    }
    const mesh=await fetch(`${base}/xr/navmeshes/home-platform-v1.json`)
    assert.equal(mesh.status,200)
    assert.equal(await mesh.text(),'existing-navmesh')
    assert.match(await (await fetch(`${base}/home/`)).text(),/Existing Home/)
  } finally {
    await stopOwnedPreview(server)
    rmSync(output,{recursive:true,force:true})
  }
})

test('already exited preview child closes without a pending cleanup promise', async () => {
  const child = spawn(process.execPath, ['-e', 'process.exit(8)'], { stdio: 'ignore' })
  await new Promise(resolve => child.once('close', resolve))
  await stopOwnedPreview(child)
  assert.equal(child.exitCode, 8)
})

test('failed preview executable does not strand cleanup', async () => {
  const child = spawn(path.join(os.tmpdir(), 'not-installed-urai-preview-application'), [], { stdio: 'ignore' })
  let spawnError
  child.on('error', error => { spawnError = error })
  await new Promise(resolve => child.once('close', resolve))
  await stopOwnedPreview(child)
  assert.equal(spawnError?.code, 'ENOENT')
})
