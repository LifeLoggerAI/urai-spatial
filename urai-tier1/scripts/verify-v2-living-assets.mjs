import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourcePath = path.join(root, 'src/spatial/assets/uraiV2Assets.ts')
const publicRoot = path.join(root, 'public/assets/urai/v2')
const receiptPath = path.join(root, 'v2-asset-proof.json')
const source = fs.readFileSync(sourcePath, 'utf8')

const groups = {
  helperSpecs: 'helpers',
  objectSpecs: 'objects',
  starSpecs: 'stars',
  focusSpecs: 'focus',
  replaySpecs: 'replay',
  mirrorSpecs: 'mirror',
  passportSpecs: 'passport',
  onboardingSpecs: 'onboarding',
  accessibilitySpecs: 'accessibility',
}

const expected = []
for (const [name, folder] of Object.entries(groups)) {
  const block = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\] as const`))
  if (!block) throw new Error(`Missing V2 registry group: ${name}`)
  for (const match of block[1].matchAll(/^\s*\['([^']+)'/gm)) {
    expected.push(`${folder}/${match[1]}.webp`)
  }
}

if (expected.length !== 80) {
  throw new Error(`V2 registry must resolve to 80 assets; found ${expected.length}`)
}

const missing = expected.filter((relative) => !fs.existsSync(path.join(publicRoot, relative)))
const present = expected.length - missing.length
const required = process.env.V2_ASSET_REQUIRED === '1'
const receipt = {
  schemaVersion: '1.0.0',
  expected: expected.length,
  present,
  missing: missing.length,
  required,
  missingPaths: missing,
}
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
console.log(`V2_ASSETS_EXPECTED=${expected.length}`)
console.log(`V2_ASSETS_PRESENT=${present}`)
console.log(`V2_ASSETS_MISSING=${missing.length}`)
console.log(`V2_ASSET_RECEIPT=${receiptPath}`)

if (required && missing.length) {
  console.error(`V2 promotion is incomplete: ${missing.length} canonical assets are missing.`)
  process.exit(1)
}
