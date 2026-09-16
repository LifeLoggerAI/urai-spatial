import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const sanctuary = fs.readFileSync(new URL('../src/spatial/assets/HomeLaunchSanctuaryV254.tsx', import.meta.url), 'utf8')

test('V282 Home destinations use scanned geology without acquiring interaction ownership', () => {
  assert.match(sanctuary, /destinationRevision:'v282-scanned-destination-geology'/)
  assert.match(sanctuary, /function DestinationGeology/)
  assert.match(sanctuary, /rock_face_01\/asset\.gltf/)
  assert.match(sanctuary, /rock_face_02\/asset\.gltf/)
  assert.match(sanctuary, /GROUND\.x/)
  assert.match(sanctuary, /LIFE_MAP\.x/)
  assert.match(sanctuary, /visualOnly:true,interactionOwner:false/)
  assert.match(sanctuary, /object\.raycast = \(\) => undefined/)
  assert.doesNotMatch(sanctuary, /onClick=/)
})

test('V282 retires procedural threshold scaffolds while preserving the semantic destination owners', () => {
  assert.match(sanctuary, /function RetireProceduralThresholdScaffolds/)
  assert.match(sanctuary, /home-aaa-v281-authored-valley-shoulders/)
  assert.match(sanctuary, /home-aaa-v281-rooted-ascent-structure/)
  assert.match(sanctuary, /home-aaa-v281-rooted-ascent-ribbons/)
  assert.match(sanctuary, /home-v225-grown-winding-memory-path/)
  assert.match(sanctuary, /object\.visible = false/)
  assert.match(sanctuary, /retired\.current\.forEach\(\(visible, object\) => \{ object\.visible = visible \}\)/)
  assert.doesNotMatch(sanctuary, /GroundPhysicalArchitecture|CosmicComposedLifeMapScene/)
})

test('V282 reduces fern crowding rather than hiding the entire authored understory', () => {
  assert.match(sanctuary, /Array\.from\(\{ length: 6 \}/)
  assert.match(sanctuary, /home-v254-authored-understory/)
  assert.match(sanctuary, /FernCluster/)
  assert.doesNotMatch(sanctuary, /Array\.from\(\{ length: 9 \}/)
})
