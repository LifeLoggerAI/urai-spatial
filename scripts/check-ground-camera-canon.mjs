import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const groundPage = readFileSync(resolve(root, 'urai-tier1/src/app/ground/page.tsx'), 'utf8')
const xrPage = readFileSync(resolve(root, 'urai-tier1/src/app/spatial/ar-vr/page.tsx'), 'utf8')
const groundCss = readFileSync(resolve(root, 'urai-tier1/src/app/ground/GroundAaaWorld.module.css'), 'utf8')

const checks = [
  ['ground route declares first-person camera', groundPage.includes('data-camera-mode="first-person"')],
  ['ground route declares Home avatar and orb anchor', groundPage.includes('data-home-avatar-orb="anchored-at-home"')],
  ['ground route states no Home avatar and no Home orb', groundPage.includes('No Home avatar. No Home orb.')],
  ['ground route links XR entry', groundPage.includes('/spatial/ar-vr')],
  ['ground css has camera drop transition', groundCss.includes('@keyframes cameraDrop')],
  ['ground css does not render old orb core', !groundCss.includes('.orbCore') && !groundPage.includes('orbCore')],
  ['xr route declares first-person Ground mode', xrPage.includes('data-ground-camera-mode="first-person"')],
  ['xr route declares Home avatar and orb anchor', xrPage.includes('data-home-avatar-orb="anchored-at-home"')],
]

const failed = checks.filter(([, ok]) => !ok)

for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
}

if (failed.length) {
  console.error(`\nGROUND_CAMERA_CANON=FAIL (${failed.length} failed)`)
  process.exit(1)
}

console.log('\nGROUND_CAMERA_CANON=PASS')
