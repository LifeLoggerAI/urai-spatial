import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const governedRoutes = ['/xr', '/spatial/ar-vr']

export function enforceStaticLaunchBoundary(outputDirectory) {
  const output = path.resolve(outputDirectory)
  if (!lstatSync(output).isDirectory() || lstatSync(output).isSymbolicLink()) throw new Error('Static output must be a real directory')
  const proofBytes = readFileSync(path.join(output, 'api/system/deploy-proof'))
  const proof = JSON.parse(proofBytes)
  if (proof.service !== 'urai-spatial-deploy-proof' || proof.repository !== 'LifeLoggerAI/urai-spatial') throw new Error('Canonical compiled deployment proof is required')
  const routes = proof.conditionalRoutes
  if (!Array.isArray(routes) || routes.length !== governedRoutes.length || new Set(routes.map(entry => entry.route)).size !== governedRoutes.length) throw new Error('Complete unique conditional route authority is required')
  for (const entry of routes) {
    if (!governedRoutes.includes(entry.route) || typeof entry.enabled !== 'boolean' || entry.expectedStatus !== (entry.enabled ? 200 : 404)) throw new Error('Conditional route authority is inconsistent')
  }
  // Next's static exporter retains an HTML file for a notFound() page. Static
  // hosts would serve that file with status 200, so disabled route artifacts
  // must be absent as well as having no renderable XR component.
  const disposition = routes.map(entry => {
    const removed = []
    if (!entry.enabled) {
      const relative = entry.route.slice(1)
      for (const artifact of [`${relative}/index.html`, `${relative}/index.txt`, `${relative}.html`, `${relative}.txt`]) {
        const candidate = path.join(output, artifact)
        for (let ancestor = candidate; ancestor !== output; ancestor = path.dirname(ancestor)) {
          try {
            if (lstatSync(ancestor).isSymbolicLink()) throw new Error('Governed route artifact must not traverse a symlink')
          } catch (error) { if (error.code !== 'ENOENT') throw error }
        }
        if (existsSync(candidate)) {
          removed.push(artifact)
        }
      }
    }
    return { ...entry, artifactsRemoved: removed }
  })
  for (const entry of disposition) for (const artifact of entry.artifactsRemoved) rmSync(path.join(output, artifact))
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
