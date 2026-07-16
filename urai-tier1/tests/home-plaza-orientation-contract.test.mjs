import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/HomeSpatialCanvas.tsx'), 'utf8')

test('Home plaza cylinder stays horizontal and cannot become a portal-occluding wall', () => {
  assert.match(source, /<mesh position=\{\[0, -0\.035, -1\.5\]\} receiveShadow data-testid="urai-home-horizontal-plaza">/)
  assert.match(source, /<cylinderGeometry args=\{\[6\.3, 6\.8, 0\.12, 128\]\}/)
  assert.doesNotMatch(source, /<mesh rotation=\{\[-Math\.PI \/ 2, 0, 0\]\} position=\{\[0, -0\.035, -1\.5\]\}/)
})
