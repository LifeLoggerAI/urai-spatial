import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { currentXrReleaseAuthority, expectedConditionalXrStatus } from './lib/xr-release-authority.mjs'

const governedRoutes = ['/xr', '/spatial/ar-vr']
const previewRoute = '/spatial/ar-vr'
const previewMarkers = [
  /data-xr-release-state=["']technical-preview["']/,
  /data-xr-immersive-authority=["']disabled["']/,
  /URAI AR \/ VR \/ XR entry chamber/,
  /Live WebXR headset sessions remain disabled/,
]

function guardedPath(output, artifact) {
  const candidate = path.join(output, artifact)
  if (!candidate.startsWith(output + path.sep)) throw new Error('Governed artifact escaped static output')
  for (let ancestor = candidate; ancestor !== output; ancestor = path.dirname(ancestor)) {
    try {
      if (lstatSync(ancestor).isSymbolicLink()) throw new Error('Governed route artifact must not traverse a symlink')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  return candidate
}

export function enforceStaticLaunchBoundary(outputDirectory) {
  const output = path.resolve(outputDirectory)
  if (!lstatSync(output).isDirectory() || lstatSync(output).isSymbolicLink()) {
    throw new Error('Static output must be a real directory')
  }
  const proofBytes = readFileSync(path.join(output, 'api/system/deploy-proof'))
  const proof = JSON.parse(proofBytes)
  if (proof.service !== 'urai-spatial-deploy-proof' || proof.repository !== 'LifeLoggerAI/urai-spatial') {
    throw new Error('Canonical compiled deployment proof is required')
  }
  const sourceAuthority = currentXrReleaseAuthority()
  const routes = proof.conditionalRoutes
  if (!Array.isArray(routes) || routes.length !== governedRoutes.length
    || new Set(routes.map(entry => entry.route)).size !== governedRoutes.length) {
    throw new Error('Complete unique conditional route authority is required')
  }
  for (const entry of routes) {
    if (!governedRoutes.includes(entry.route) || typeof entry.enabled !== 'boolean'
      || entry.enabled !== sourceAuthority.enabled
      || entry.expectedStatus !== expectedConditionalXrStatus(entry.route, sourceAuthority)
      || entry.previewOnly !== (entry.route === previewRoute && !entry.enabled)) {
      throw new Error('Conditional route authority is inconsistent')
    }
  }

  // /xr is unavailable as an immersive session. Its artifacts must not be
  // exposed with a static host's status-200 fallback.
  // /spatial/ar-vr remains a non-immersive, marked technical preview.
  const disposition = routes.map(entry => {
    const removed = []
    const relative = entry.route.slice(1)
    const html = [relative + '/index.html', relative + '.html']
    const artifacts = [...html, relative + '/index.txt', relative + '.txt']
    if (!entry.enabled && entry.route === '/xr') {
      for (const artifact of artifacts) {
        if (existsSync(guardedPath(output, artifact))) removed.push(artifact)
      }
    }
    if (!entry.enabled && entry.route === previewRoute) {
      let verified = 0
      for (const artifact of html) {
        const file = guardedPath(output, artifact)
        if (!existsSync(file)) continue
        const bytes = readFileSync(file, 'utf8')
        if (!previewMarkers.every(marker => marker.test(bytes))) {
          throw new Error('XR technical preview HTML markers or disabled session authority are missing')
        }
        verified += 1
      }
      if (!verified) {
        throw new Error('XR technical preview must be a rendered page, not an empty directory')
      }
    }
    return { ...entry, artifactsRemoved: removed }
  })
  for (const entry of disposition) {
    for (const artifact of entry.artifactsRemoved) rmSync(guardedPath(output, artifact))
  }

  const receipt = {
    schemaVersion: 'urai-static-launch-boundary-1',
    sourceSha: proof.deploymentFreshness?.commitSha || 'unknown',
    compiledProofSha256: createHash('sha256').update(proofBytes).digest('hex'),
    routes: disposition,
    releaseClassification: 'NO-GO',
    deviceAcceptance: false,
    providerActivation: false,
  }
  writeFileSync(path.join(output, 'static-launch-boundary.json'), JSON.stringify(receipt, null, 2) + '\n')
  return receipt
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(enforceStaticLaunchBoundary(process.argv[2] || 'urai-tier1/out')))
}
