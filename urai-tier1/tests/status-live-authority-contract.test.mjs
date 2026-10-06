import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const page = read('src/app/status/page.tsx')
const authority = read('src/app/status/StatusReleaseAuthority.tsx')
const previewIdentity = read('src/app/status/PreviewBuildIdentity.tsx')
const launchTruth = read('src/data/launchTruth.ts')
const legacyLayer = read('src/app/UraiAutonomousV1Layer.tsx')

test('Status server shell remains neutral until the protected fingerprint validates', () => {
  assert.match(page, /StatusReleaseAuthority/)
  assert.match(page, /data-production-certification="fingerprint-gated"/)
  assert.match(page, /fingerprint-gated release authority/)
  assert.doesNotMatch(page, /Production: verified live/)
  assert.doesNotMatch(page, /\['\/status', 'verified live'/)
  assert.doesNotMatch(page, /pending-current-main-evidence/)
})

test('Embedded build identity is limited to allowlisted non-production preview hosts', () => {
  assert.match(page, /PreviewBuildIdentity/)
  assert.match(page, /NEXT_PUBLIC_URAI_BUILD_SHA/)
  assert.doesNotMatch(page, /data-preview-build-identity=\{embeddedBuildSha\}/)
  assert.match(previewIdentity, /isAllowedPreviewHostname\(window\.location\.hostname\)/)
  assert.match(previewIdentity, /normalized === 'localhost'/)
  assert.match(previewIdentity, /normalized === '127\.0\.0\.1'/)
  assert.match(previewIdentity, /normalized === '\[::1\]'/)
  assert.match(previewIdentity, /normalized\.endsWith\('\.web\.app'\)/)
  assert.match(previewIdentity, /normalized\.endsWith\('\.firebaseapp\.com'\)/)
  assert.doesNotMatch(previewIdentity, /window\.location\.origin !== 'https:\/\/urai\.app'/)
  assert.match(previewIdentity, /if \(!isPreviewOrigin\) return null/)
  assert.match(previewIdentity, /data-preview-build-identity=\{fullSha\}/)
  assert.match(previewIdentity, /Embedded build identity · non-authoritative/)
  assert.match(previewIdentity, /allowlisted non-production preview origins/)
  assert.match(previewIdentity, /never substitutes for the protected urai\.app release fingerprint/)
  assert.match(previewIdentity, /grants no production authority/)
})

test('Canonical Status page is not covered by the legacy autonomous realm layer', () => {
  const compiled = ts.transpileModule(legacyLayer, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  for (const pathname of ['/status', '/status/', '/status/details']) {
    const exports = {}
    vm.runInNewContext(compiled, { exports, require(id) {
      if (id === 'next/navigation') return { usePathname: () => pathname }
      if (id === 'react/jsx-runtime') return { jsx: () => ({ legacyOverlay: true }) }
      return { default: () => null }
    } })
    assert.equal(exports.default(), null, `${pathname} must not mount a legacy overlay`)
  }
  assert.doesNotMatch(legacyLayer, /pathname\.startsWith\("\/status"\)/)
  assert.doesNotMatch(legacyLayer, /return <UraiAutonomousV1Realms[^>]*status/)
})

test('Only canonical production requests and validates the complete protected fingerprint', () => {
  assert.match(authority, /window\.location\.origin !== 'https:\/\/urai\.app'/)
  assert.match(authority, /setState\(\{ kind: 'preview' \}\)/)
  assert.match(authority, /fetch\(`\/release-fingerprint\.json\?_\=\$\{Date\.now\(\)\}`/)
  assert.match(authority, /cache: 'no-store'/)
  assert.match(authority, /contentType\.includes\('application\/json'\)/)
  assert.match(authority, /schemaVersion !== 'urai-release-fingerprint-1'/)
  assert.match(authority, /\['authoritySha', 'releaseSha', 'rollbackSha'\]/)
  assert.match(authority, /item\.authoritySha !== item\.releaseSha/)
  assert.match(authority, /item\.releaseSha === item\.rollbackSha/)
  assert.match(authority, /item\.firebaseProject !== 'urai-4dc1d'/)
  assert.match(authority, /item\.liveUrl !== 'https:\/\/urai\.app'/)
  assert.match(authority, /item\.deploymentScope !== 'hosting-only'/)
  assert.match(authority, /item\.certification === 'pending-post-deploy-smoke'/)
  assert.match(authority, /item\.certification !== 'verified-post-deploy-smoke'/)
  assert.match(authority, /Release fingerprint certification is pending post-deploy smoke/)
  assert.match(authority, /Release fingerprint certification state is not recognized/)
  assert.match(authority, /Workflow run ID is invalid/)
  assert.match(authority, /does not request or substitute the protected production fingerprint/)
  assert.match(authority, /protected production release SHA is hidden while authority is unresolved/)
  assert.match(authority, /role="alert"/)
})

test('Verified claims and route badges are gated on ready fingerprint state', () => {
  assert.match(authority, /const isReady = state\.kind === 'ready'/)
  assert.match(authority, /isReady \? launchTruth\.safeClaim : unresolvedCopy/)
  assert.match(authority, /isReady \? 'verified live' : 'authority unresolved'/)
  assert.match(authority, /Production certification is hidden because the protected fingerprint could not be validated/)
  assert.match(authority, /Production certification is not displayed on this origin or state/)
  assert.match(authority, /Autonomous real-world actions are not enabled and remain human-approved only/)
  assert.match(authority, /\['\/status', 'certified-live'/)
  assert.match(authority, /\['\/privacy-controls', 'certified-live'/)
})

test('Static launch truth fails closed until the protected fingerprint certifies the exact deployment', () => {
  assert.match(launchTruth, /id: 'DEPLOY-SHA'[\s\S]*state: 'pending'/)
  assert.match(launchTruth, /id: 'ROLLBACK-SHA'[\s\S]*state: 'pending'/)
  assert.match(launchTruth, /id: 'STATUS-TRUTH'[\s\S]*state: 'pending'/)
  assert.match(launchTruth, /path: '\/status'[\s\S]*state: 'certification-pending'/)
  assert.match(launchTruth, /path: '\/privacy-controls'[\s\S]*state: 'certification-pending'/)
  assert.match(launchTruth, /id: 'XR-DEVICE-PROOF'[\s\S]*state: 'blocked'/)
  assert.match(launchTruth, /path: '\/spatial\/ar-vr'[\s\S]*state: 'preview'/)
  assert.match(launchTruth, /protected urai\.app fingerprint validates verified-post-deploy-smoke/)
  assert.match(launchTruth, /source code, historical receipts, static route metadata/)
  assert.doesNotMatch(launchTruth, /state: 'certified-live'/)
})
