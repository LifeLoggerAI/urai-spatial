#!/usr/bin/env node

import {
  deployedSha,
  inspectRouteContent,
  normalizePath,
  routeContracts,
  routeVariants,
} from './urai-live-route-contract.mjs'

const baseUrl = (process.env.URAI_DEPLOY_URL || '').trim().replace(/\/$/, '')
const requireLiveCommitSha = process.env.REQUIRE_LIVE_COMMIT_SHA === 'true'
const requireCustomDomain = process.env.REQUIRE_CUSTOM_DOMAIN === 'true'
const expectedDeployedSha = (process.env.URAI_EXPECTED_DEPLOYED_SHA || '').trim().toLowerCase()
const exactSha = /^[0-9a-f]{40}$/

if (!baseUrl) {
  console.error('URAI_DEPLOY_URL is required, for example https://urai.app')
  process.exit(1)
}

const parsedBase = new URL(baseUrl)
const canonicalOrigin = parsedBase.origin

if (requireCustomDomain && canonicalOrigin !== 'https://urai.app') {
  console.error(`REQUIRE_CUSTOM_DOMAIN=true requires the canonical https://urai.app origin, received ${canonicalOrigin}`)
  process.exit(1)
}

if (requireLiveCommitSha && !exactSha.test(expectedDeployedSha)) {
  console.error('REQUIRE_LIVE_COMMIT_SHA=true requires URAI_EXPECTED_DEPLOYED_SHA as an exact 40-character lowercase commit SHA')
  process.exit(1)
}

const failures = []
let checkCount = 0

async function fetchText(url, redirect = 'follow') {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'cache-control': 'no-cache',
      'user-agent': 'urai-live-smoke/5.0',
      accept: 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
    },
    cache: 'no-store',
    redirect,
    signal: AbortSignal.timeout(20_000),
  })
  return { response, body: await response.text() }
}

for (const contract of routeContracts) {
  for (const requestedUrl of routeVariants(baseUrl, contract.route)) {
    checkCount += 1
    try {
      const { response, body } = await fetchText(requestedUrl)
      const finalUrl = new URL(response.url)
      const contentType = response.headers.get('content-type')?.toLowerCase() || ''
      const findings = inspectRouteContent(contract, body)
      const observedSha = deployedSha(response, body)
      const shaMismatch = requireLiveCommitSha && observedSha !== expectedDeployedSha
      const pathMismatch = normalizePath(finalUrl.pathname) !== normalizePath(requestedUrl.pathname)
      const queryMismatch = finalUrl.search !== requestedUrl.search
      const originMismatch = finalUrl.origin !== canonicalOrigin

      if (
        !response.ok ||
        !contentType.includes('text/html') ||
        !findings.passed ||
        pathMismatch ||
        queryMismatch ||
        originMismatch ||
        shaMismatch
      ) {
        failures.push(
          `${requestedUrl} returned ${response.status} finalUrl=${response.url} contentType=${contentType || 'missing'} ` +
            `missing=${findings.missingMarkers.join('|') || 'none'} forbidden=${findings.forbiddenMarkers.join('|') || 'none'} ` +
            `originMismatch=${originMismatch} pathMismatch=${pathMismatch} queryMismatch=${queryMismatch} ` +
            `expectedDeployedSha=${expectedDeployedSha || 'not-required'} observedDeployedSha=${observedSha || 'none'}`,
        )
      } else {
        console.log(`OK ${response.status} ${requestedUrl} -> ${response.url}`)
      }
    } catch (error) {
      failures.push(`${requestedUrl} failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

if (requireLiveCommitSha) {
  checkCount += 2
  try {
    const fingerprintUrl = new URL('/release-fingerprint.json', `${baseUrl}/`)
    const { response, body } = await fetchText(fingerprintUrl, 'manual')
    let fingerprint = null
    try { fingerprint = JSON.parse(body) } catch {}
    const finalUrl = new URL(response.url)
    const fingerprintFailures = [
      !response.ok && `http-${response.status}`,
      !response.headers.get('content-type')?.toLowerCase().includes('application/json') && 'content-type',
      finalUrl.origin !== canonicalOrigin && 'origin',
      normalizePath(finalUrl.pathname) !== '/release-fingerprint.json' && 'path',
      finalUrl.search !== '' && 'query',
      fingerprint?.schemaVersion !== 'urai-release-fingerprint-1' && 'schema',
      fingerprint?.repository !== 'LifeLoggerAI/urai-spatial' && 'repository',
      fingerprint?.releaseSha !== expectedDeployedSha && 'release-sha',
      !exactSha.test(fingerprint?.rollbackSha || '') && 'rollback-sha',
      !exactSha.test(fingerprint?.authoritySha || '') && 'authority-sha',
      fingerprint?.rollbackSha === fingerprint?.releaseSha && 'rollback-distinctness',
      fingerprint?.firebaseProject !== 'urai-4dc1d' && 'firebase-project',
      fingerprint?.liveUrl !== 'https://urai.app' && 'live-url',
      fingerprint?.deploymentScope !== 'hosting-only' && 'deployment-scope',
      !/^\d+$/.test(String(fingerprint?.workflowRunId || '')) && 'workflow-run-id',
    ].filter(Boolean)
    if (fingerprintFailures.length > 0) {
      failures.push(`${fingerprintUrl} failed fingerprint authority: ${fingerprintFailures.join('|')}`)
    } else {
      console.log(`OK release fingerprint ${fingerprint.releaseSha} workflowRunId=${fingerprint.workflowRunId}`)
    }
  } catch (error) {
    failures.push(`release fingerprint failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  try {
    const proofUrl = new URL('/api/system/deploy-proof', `${baseUrl}/`)
    const { response, body } = await fetchText(proofUrl, 'manual')
    let proof = null
    try { proof = JSON.parse(body) } catch {}
    const finalUrl = new URL(response.url)
    const proofFailures = [
      !response.ok && `http-${response.status}`,
      finalUrl.origin !== canonicalOrigin && 'origin',
      normalizePath(finalUrl.pathname) !== '/api/system/deploy-proof' && 'path',
      proof?.service !== 'urai-spatial-deploy-proof' && 'service',
      proof?.repository !== 'LifeLoggerAI/urai-spatial' && 'repository',
      proof?.proofSchemaVersion !== 'urai-spatial-deploy-proof-v2-2026-06-30' && 'schema',
      proof?.deploymentFreshness?.commitShaKnown !== true && 'commit-sha-known',
      proof?.deploymentFreshness?.commitSha !== expectedDeployedSha && 'freshness-sha',
      proof?.environment?.commitSha !== expectedDeployedSha && 'environment-sha',
    ].filter(Boolean)
    if (proofFailures.length > 0) {
      failures.push(`${proofUrl} failed deploy-proof consistency: ${proofFailures.join('|')}`)
    } else {
      console.log(`OK static deploy proof agrees with release fingerprint ${expectedDeployedSha}`)
    }
  } catch (error) {
    failures.push(`deploy proof failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (requireCustomDomain) {
  const redirectCases = [
    ['http://urai.app/status/?urai_redirect_probe=1', 'https://urai.app/status/?urai_redirect_probe=1'],
    ['https://www.urai.app/status/?urai_redirect_probe=1', 'https://urai.app/status/?urai_redirect_probe=1'],
    ['http://www.urai.app/status/?urai_redirect_probe=1', 'https://urai.app/status/?urai_redirect_probe=1'],
  ]
  for (const [source, expected] of redirectCases) {
    checkCount += 1
    try {
      const { response } = await fetchText(source, 'manual')
      const location = response.headers.get('location')
      const destination = location ? new URL(location, source).toString() : ''
      if (![301, 308].includes(response.status) || destination !== expected) {
        failures.push(`${source} must permanently redirect in one hop to ${expected}; status=${response.status} location=${location || 'missing'}`)
      } else {
        console.log(`OK ${response.status} ${source} -> ${destination}`)
      }
    } catch (error) {
      failures.push(`${source} redirect check failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

if (failures.length > 0) {
  console.error('URAI live smoke failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `URAI live smoke passed ${checkCount} checks using the shared current route contract, exact origin/path/query/SHA authority, stale and legacy rejection, fingerprint/deploy-proof consistency, and canonical redirects. requireLiveCommitSha=${requireLiveCommitSha} requireCustomDomain=${requireCustomDomain} expectedDeployedSha=${expectedDeployedSha || 'not-required'}`,
)
