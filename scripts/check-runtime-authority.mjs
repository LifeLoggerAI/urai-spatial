import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const requiredFiles = [
  'urai-tier1/src/spatial/layout/TierOneExperience.tsx',
  'urai-tier1/src/scene/HomeScene.tsx',
  'urai-tier1/src/app/page.tsx',
  'urai-tier1/src/app/home/page.tsx',
  'urai-tier1/src/app/ascent/page.tsx',
  'urai-tier1/src/app/life-map/page.tsx',
  'urai-tier1/src/app/focus/page.tsx',
  'urai-tier1/src/app/replay/page.tsx',
  'urai-tier1/src/app/mirror/page.tsx',
  'docs/ARCHITECTURE_LOCK.md',
  'docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md',
]

const failures = []

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8')
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`Missing required runtime authority file: ${file}`)
}

function requireText(file, text, label = text) {
  if (!existsSync(resolve(root, file))) return
  const body = read(file)
  if (!body.includes(text)) failures.push(`${file} must include ${label}`)
}

requireText('urai-tier1/src/spatial/layout/TierOneExperience.tsx', 'HomeScene', 'HomeScene runtime mount')
requireText('urai-tier1/src/app/page.tsx', 'TierOneExperience', 'TierOneExperience root route')
requireText('urai-tier1/src/app/life-map/page.tsx', 'mode="life-map"', 'LifeMap routed mode')
requireText('urai-tier1/src/app/focus/page.tsx', 'mode="focus"', 'Focus routed mode')
requireText('urai-tier1/src/app/replay/page.tsx', 'mode="replay"', 'Replay routed mode')
requireText('urai-tier1/src/app/ascent/page.tsx', 'mode="ascent"', 'Ascent routed mode')
requireText('urai-tier1/src/scene/HomeScene.tsx', 'data-scene-mode', 'current scene mode attribute')
requireText('urai-tier1/src/scene/HomeScene.tsx', 'urai-scene-stage', 'canonical scene stage class')
requireText('docs/ARCHITECTURE_LOCK.md', 'TierOneExperience', 'canonical architecture mount')
requireText('docs/ARCHITECTURE_LOCK.md', 'HomeScene', 'canonical HomeScene authority')
requireText('docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md', 'TierOneExperience', 'source of truth route mount')
requireText('docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md', 'HomeScene', 'source of truth HomeScene authority')

if (existsSync(resolve(root, 'docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md'))) {
  const doc = read('docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md')
  const legacyLaunchAuthority = /SpatialScene\.tsx[`\s\S]{0,160}(canonical|launch|production authority)/i.test(doc)
  if (legacyLaunchAuthority) {
    failures.push('Source-of-truth doc still suggests SpatialScene.tsx is canonical launch authority.')
  }
}

if (failures.length) {
  console.error('Runtime authority check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Runtime authority check passed: TierOneExperience -> HomeScene is the canonical routed launch path.')
