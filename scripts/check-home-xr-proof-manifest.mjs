#!/usr/bin/env node
import fs from 'node:fs'

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const requiredScripts = [
  'xr:verify',
  'verify:assets',
  'verify:routes',
  'check:firebase',
  'smoke:home-xr:live',
  'deploy:xr:firebase',
]

const missingScripts = requiredScripts.filter((script) => !packageJson.scripts?.[script])
if (missingScripts.length > 0) {
  console.error('[check-home-xr-proof-manifest] missing package scripts:')
  for (const script of missingScripts) console.error(`- ${script}`)
  process.exit(1)
}

const proofFiles = [
  'scripts/check-home-xr-lock.mjs',
  'scripts/check-home-xr-proof-manifest.mjs',
  'scripts/smoke-home-xr-live-url.mjs',
  'scripts/check-spatial-assets.mjs',
]

const missingFiles = proofFiles.filter((file) => !fs.existsSync(file))
if (missingFiles.length > 0) {
  console.error('[check-home-xr-proof-manifest] missing proof files:')
  for (const file of missingFiles) console.error(`- ${file}`)
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  service: 'urai-home-xr-proof-manifest',
  requiredScripts,
  proofFiles,
}, null, 2))
