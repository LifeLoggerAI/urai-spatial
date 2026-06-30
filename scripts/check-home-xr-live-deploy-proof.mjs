#!/usr/bin/env node
const baseUrl = (process.env.URAI_DEPLOY_URL || process.env.LIVE_URL || 'https://urai-4dc1d.web.app').replace(/\/$/, '')
const requireLiveCommitSha = process.env.REQUIRE_LIVE_COMMIT_SHA === 'true'

const endpoints = [
  '/',
  '/home',
  '/ground',
  '/life-map',
  '/status',
  '/spatial/ar-vr',
  '/api/system/urai-spatial-lock',
  '/api/system/deploy-proof',
]

const forbiddenPatterns = [
  /Launch build is compiling successfully/i,
  /Full app deployment is being finalized/i,
  /Opening your spatial field/i,
  /Preparing the scene/i,
  /prototype/i,
  /placeholder/i,
]

const requiredDeployProofPatterns = [
  /urai-spatial-deploy-proof/i,
  /urai-spatial-public-surface-2026-06-29-homeworldproduction/i,
  /urai-spatial-deploy-proof-v2-2026-06-30/i,
  /commitShaKnown/i,
]

const results = []
const failures = []

for (const endpoint of endpoints) {
  const url = `${baseUrl}${endpoint}`
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'urai-home-xr-live-deploy-proof/1.3',
        accept: 'text/html,application/json,*/*;q=0.8',
      },
    })
    const body = await response.text()
    const hasUraiMarker = /urai|spatial|life map|xr|home|deploy-proof/i.test(body)
    const forbidden = forbiddenPatterns.find((marker) => marker.test(body))
    const deployProofMissing =
      endpoint === '/api/system/deploy-proof' &&
      requiredDeployProofPatterns.some((pattern) => !pattern.test(body))
    const liveCommitShaMissing =
      endpoint === '/api/system/deploy-proof' &&
      requireLiveCommitSha &&
      /"commitSha"\s*:\s*"unknown"/i.test(body)

    results.push({
      endpoint,
      status: response.status,
      ok: response.ok,
      hasUraiMarker,
      deployProofMissing,
      liveCommitShaMissing,
      forbidden: forbidden?.source || null,
    })

    if (!response.ok || !hasUraiMarker || forbidden || deployProofMissing || liveCommitShaMissing) {
      failures.push(`${url} status=${response.status} marker=${hasUraiMarker} deployProofMissing=${deployProofMissing} liveCommitShaMissing=${liveCommitShaMissing} forbidden=${forbidden?.source || 'none'}`)
    }
  } catch (error) {
    failures.push(`${url} failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length > 0) {
  console.error('[check-home-xr-live-deploy-proof] failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  service: 'urai-home-xr-live-deploy-proof',
  baseUrl,
  requireLiveCommitSha,
  results,
}, null, 2))
