import fs from 'node:fs'

const scanFiles = [
  'src/scene/HomeScene.tsx',
  'src/spatial/effects/ThreeSceneRoot.tsx',
  'src/spatial/cinematic/CinematicCameraRig.tsx',
  'src/spatial/scene/SpatialScene.tsx',
]

const blockedPatterns = [
  { pattern: 'PCFSoftShadowMap', reason: 'Three r183 deprecates PCFSoftShadowMap warning path' },
  { pattern: 'THREE.Clock', reason: 'Three r183 deprecates Clock warning path' },
  { pattern: 'new Clock', reason: 'Three r183 deprecates Clock warning path' },
  { pattern: 'sourceBadge="demo"', reason: 'debug source badge should not ship on launch routes' },
]

const failures = []
for (const file of scanFiles) {
  if (!fs.existsSync(file)) continue
  const text = fs.readFileSync(file, 'utf8')
  for (const item of blockedPatterns) {
    if (text.includes(item.pattern)) failures.push(`${file}: ${item.reason} (${item.pattern})`)
  }
}

const notes = [
  'React DevTools notice is development-only and not a Tier lock blocker.',
  'Cloud Workstations HMR websocket failures are tunnel/dev-environment warnings, not production app logic.',
]

if (failures.length) {
  console.error('[tier-console-audit] failed')
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}

console.log('[tier-console-audit] passed')
for (const note of notes) console.log(` - ${note}`)
