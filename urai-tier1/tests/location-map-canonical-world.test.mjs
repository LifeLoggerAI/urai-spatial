import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const app = join(root, 'urai-tier1')
const scene = readFileSync(join(app, 'src/spatial/places/LocationMapScene.tsx'), 'utf8')
const layer = readFileSync(join(app, 'src/app/UraiAutonomousV1Layer.tsx'), 'utf8')
const css = readFileSync(join(app, 'src/spatial/places/location-map-scene.css'), 'utf8')

assert.doesNotMatch(layer, /pathname\.startsWith\(["']\/location-map["']\)/, 'Legacy autonomous layer must not own Location Map.')
assert.match(scene, /data-location-map-owner="canonical-route"/, 'Location Map must identify its canonical route owner.')
assert.match(scene, /data-location-map-renderer="layered-spatial-atlas"/, 'Location Map must render the spatial atlas rather than a poster owner.')
assert.match(scene, /privacyMode/, 'Private-mode query state must be preserved.')
assert.match(scene, /entryPortal/, 'Entry portal query state must be preserved.')
assert.match(scene, /cameraCheckpoint/, 'Camera checkpoint query state must be preserved.')
assert.match(scene, /placeId/, 'Selected place identity must be durable in route state.')
assert.match(scene, /setActiveIndex\(index\)/, 'URL-restored place selection must synchronize keyboard navigation state.')
assert.match(scene, /event\.stopPropagation\(\)/, 'Beacon arrow navigation must not bubble into atlas camera controls.')
assert.match(scene, /Disclosed sample places/, 'Fallback demo data must be explicitly disclosed.')
assert.match(scene, /no personal location history is displayed/i, 'Selected demo places must retain a truthful disclosure.')
assert.match(scene, /data-private-memory-mounted="false"/, 'Signed-out threshold must certify that private memory data is not mounted.')
assert.match(scene, /Open disclosed sample/, 'Demo places must require an explicit sample action.')
assert.match(scene, /USER_KEY/, 'Private atlas access must have an explicit authenticated-user boundary.')
assert.match(scene, /role="application"/, 'The visual atlas must expose a keyboard-operable interaction surface.')
assert.match(scene, /Escape/, 'Escape return behavior must remain documented and implemented.')
assert.match(scene, /aria-live="polite"/, 'Selection changes must be announced to assistive technology.')
assert.match(scene, /prefers-reduced-motion/, 'Reduced-motion mode must be detected.')
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Reduced-motion styling must be present.')
assert.match(css, /\.locationAtlasCamera/, 'Near, middle and far atlas depth must be route-owned.')
assert.match(css, /\.locationAtlasBeacon/, 'Grounded place beacons must be route-owned.')
assert.match(css, /@media\s*\(max-width:\s*620px\)/, 'Mobile composition must be intentional rather than desktop scaling.')

console.log('URAI canonical Location Map world contract passed.')
