#!/usr/bin/env node
import fs from 'node:fs'

const requiredFiles = [
  'firebase.json',
  'scripts/xr-firebase-preflight.mjs',
  'scripts/check-spatial-assets.mjs',
  'urai-tier1/public/xr/navmeshes/home-platform-v1.json',
  'urai-tier1/src/spatial/xr/uraiXrRoomRuntime.ts',
  'urai-tier1/src/spatial/xr/useUraiXrRoom.ts',
]

const missing = requiredFiles.filter((file) => !fs.existsSync(file))
if (missing.length > 0) {
  console.error('[check-home-xr-lock] missing required files:')
  for (const file of missing) console.error(`- ${file}`)
  process.exit(1)
}

const firebaseConfig = JSON.parse(fs.readFileSync('firebase.json', 'utf8'))
if (firebaseConfig.hosting?.source !== 'urai-tier1') {
  console.error('[check-home-xr-lock] firebase hosting source must be urai-tier1')
  process.exit(1)
}

if (!['nodejs20', 'nodejs22'].includes(firebaseConfig.functions?.runtime)) {
  console.error(`[check-home-xr-lock] Firebase Functions runtime must be nodejs20 or nodejs22 for current Firebase Frameworks support, found ${firebaseConfig.functions?.runtime}`)
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  service: 'urai-home-xr-lock',
  firebaseHostingSource: firebaseConfig.hosting.source,
  functionsRuntime: firebaseConfig.functions.runtime,
  requiredFiles: requiredFiles.length,
}, null, 2))
