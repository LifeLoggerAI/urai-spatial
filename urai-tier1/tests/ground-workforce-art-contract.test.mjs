import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const groundPath = path.join(root, 'src/app/ground/page.tsx')
const assetsPath = path.join(root, 'src/spatial/assets/uraiAssets.ts')

const ground = fs.readFileSync(groundPath, 'utf8')
const assets = fs.readFileSync(assetsPath, 'utf8')

test('Ground uses the canonical provider-final workforce asset registry', () => {
  assert.match(ground, /import \{ avatarAssets \} from '@\/spatial\/assets\/uraiAssets'/)
  assert.match(ground, /data-workforce-art="provider-final"/)
  assert.match(ground, /background-image: var\(--helper-art\)/)
  assert.match(ground, /background-image: var\(--specialist-art\)/)
})

test('all six final specialist avatars are visible in the Ground council', () => {
  for (const key of ['relationshipLiaison', 'operator', 'builder', 'protector', 'mirror', 'guide']) {
    assert.match(ground, new RegExp(`avatarAssets\\.${key}\\.src`))
  }

  for (const file of [
    'relationship-liaison.webp',
    'operator.webp',
    'builder.webp',
    'protector.webp',
    'mirror.webp',
    'guide.webp',
  ]) {
    assert.match(assets, new RegExp(file.replace('.', '\\.')))
  }
})

test('active floor helpers use real avatar art instead of generic CSS silhouettes', () => {
  for (const key of ['receptionist', 'privacySteward', 'scheduleSteward', 'wellnessGuide', 'archivist']) {
    assert.match(ground, new RegExp(`avatarAssets\\.${key}\\.src`))
  }
  assert.doesNotMatch(ground, /\.helper i \{[^}]*background: linear-gradient/s)
})

test('Ground workforce remains mobile-safe and accessible', () => {
  assert.match(ground, /aria-label="Specialist council present in Ground"/)
  assert.match(ground, /aria-label=\{`\$\{specialist\.name\} private workforce avatar`\}/)
  assert.match(ground, /@media \(max-width: 760px\)/)
  assert.match(ground, /url\('\/assets\/urai\/ground\/ground-world-mobile\.webp'\)/)
  assert.match(ground, /@media \(prefers-reduced-motion: reduce\)/)
})
