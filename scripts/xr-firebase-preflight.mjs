import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const requiredFiles = [
  'firebase.json',
  'firebase.static.json',
  '.github/workflows/spatial-live-deploy.yml',
  'urai-tier1/package.json',
  'urai-tier1/tests/xr-runtime-contract.test.mjs',
  'urai-tier1/src/spatial/xr/uraiXrRoomRuntime.ts',
  'urai-tier1/src/spatial/xr/useUraiXrRoom.ts',
  'urai-tier1/scripts/xr/xr-websocket-server.mjs',
  'urai-tier1/scripts/xr/bake-navmesh.mjs',
]

const missing = requiredFiles.filter((file) => !existsSync(file))
if (missing.length) {
  console.error('[xr:firebase:preflight] missing required files:')
  for (const file of missing) console.error(`- ${file}`)
  process.exit(1)
}

const firebaseConfig = JSON.parse(await readFile('firebase.json', 'utf8'))
if (firebaseConfig.hosting?.source !== 'urai-tier1') {
  console.error('[xr:firebase:preflight] firebase hosting source must be urai-tier1')
  process.exit(1)
}

const staticConfig = JSON.parse(await readFile('firebase.static.json', 'utf8'))
if (staticConfig.hosting?.public !== 'urai-tier1/out' || staticConfig.hosting?.rewrites?.length !== 0) {
  console.error('[xr:firebase:preflight] canonical static hosting must publish urai-tier1/out without rewrites')
  process.exit(1)
}

const tierPackage = JSON.parse(await readFile('urai-tier1/package.json', 'utf8'))
const requiredScripts = ['xr:contract', 'xr:navmesh:bake', 'xr:verify', 'build', 'typecheck']
const missingScripts = requiredScripts.filter((script) => !tierPackage.scripts?.[script])
if (missingScripts.length) {
  console.error('[xr:firebase:preflight] missing urai-tier1 scripts:')
  for (const script of missingScripts) console.error(`- ${script}`)
  process.exit(1)
}

const rootPackage = JSON.parse(await readFile('package.json', 'utf8'))
const rootScripts = ['xr:contract', 'xr:verify', 'live:deploy']
const missingRootScripts = rootScripts.filter((script) => !rootPackage.scripts?.[script])
if (missingRootScripts.length) {
  console.error('[xr:firebase:preflight] missing root scripts:')
  for (const script of missingRootScripts) console.error(`- ${script}`)
  process.exit(1)
}
if (rootPackage.scripts?.['live:deploy'] !== 'node scripts/live-release.mjs --deploy-prebuilt') {
  console.error('[xr:firebase:preflight] live:deploy must deploy only a preverified immutable release bundle')
  process.exit(1)
}

const expectedSecretNames = [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FIREBASE_PROJECT_ID',
  'URAI_XR_SESSION_SECRET',
  'URAI_XR_ICE_SERVERS_JSON',
]

console.log(JSON.stringify({
  ok: true,
  service: 'urai-spatial-xr',
  firebaseHostingSource: firebaseConfig.hosting.source,
  staticHostingPublic: staticConfig.hosting.public,
  requiredFiles: requiredFiles.length,
  requiredScripts,
  expectedSecretNames,
  productionAuthority: '.github/workflows/spatial-live-deploy.yml',
}, null, 2))
