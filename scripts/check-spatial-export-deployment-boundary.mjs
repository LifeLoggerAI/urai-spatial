import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function verifySpatialExportDeploymentBoundary({ index, operations, firebase, projects }) {
  const errors = []
  const pairs = {
    createExportRequest:'createSpatialExportRequest', cancelExportRequest:'cancelSpatialExportRequest',
    createDeletionRequest:'createSpatialDeletionRequest', cancelDeletionRequest:'cancelSpatialDeletionRequest',
  }
  const exported = [...index.matchAll(/export\s*\{([^}]+)\}/g)].flatMap(match => match[1].split(',').map(value => value.trim()).filter(Boolean))
  for (const [internal, owned] of Object.entries(pairs)) {
    if (!exported.includes(`${internal} as ${owned}`)) errors.push(`Missing distinct Spatial export: ${owned}`)
    if (exported.includes(internal) || new RegExp(`export\\s+(?:const|function)\\s+${internal}\\b`).test(index)) errors.push(`Canonical Privacy namespace collision: ${internal}`)
  }
  for(const owned of ['getOperationalExportDownloadUrl','downloadOperationalExportPackage']) if(!exported.includes(owned)) errors.push(`Missing distinct operational export: ${owned}`)
  for(const canonical of ['getExportDownloadUrl','downloadExportPackage']) if(exported.includes(canonical)) errors.push(`Canonical Privacy namespace collision: ${canonical}`)
  if (/getSignedUrl\s*\(/.test(operations)) errors.push('Operational exports must not issue irrevocable Storage credentials')
  if (!operations.includes('consentRecords/${uid}_data_export') || !operations.includes('privacyDeletionTombstones/${uid}') ||
      !operations.includes('readIssuedExportDownload') || !operations.includes('CANONICAL_EXPORT_CONSENT_REQUIRED')) errors.push('Canonical or issued download authority is absent')
  if (firebase.functions?.source !== 'apps/functions' || firebase.functions?.codebase !== 'urai-spatial-functions' || firebase.functions?.runtime !== 'nodejs22') errors.push('Functions source/codebase/runtime authority changed')
  if (!Object.values(projects.projects ?? {}).length || Object.values(projects.projects ?? {}).some(value=>value !== 'urai-4dc1d')) errors.push('Spatial project aliases must bind exactly urai-4dc1d')
  const routes = firebase.hosting?.rewrites?.filter(route=>route.source === '/api/privacy/export/download') ?? []
  if (routes.length !== 1 || routes[0].function?.functionId !== 'downloadOperationalExportPackage' || routes[0].function?.region !== 'us-central1') errors.push('Hosting export delivery must bind the distinct Spatial function')
  if (!firebase.functions?.predeploy?.includes('node scripts/check-spatial-export-deployment-boundary.mjs')) errors.push('Functions predeploy must verify namespace and source authority')
  return errors
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = verifySpatialExportDeploymentBoundary({
    index:fs.readFileSync('apps/functions/src/index.ts','utf8'), operations:fs.readFileSync('apps/functions/src/privacyOperations.ts','utf8'),
    firebase:JSON.parse(fs.readFileSync('firebase.json','utf8')), projects:JSON.parse(fs.readFileSync('.firebaserc','utf8')),
  })
  if (errors.length) { for (const error of errors) console.error(error); process.exitCode = 1 }
  else console.log('Spatial export namespace/project/source boundaries pass. Deployment and release approval remain separate required authorities.')
}
