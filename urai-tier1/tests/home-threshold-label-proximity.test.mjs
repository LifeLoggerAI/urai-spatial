import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../package.json', import.meta.url))
const ts = require('typescript')
const source = fs.readFileSync(new URL('../src/spatial/layout/HomeThresholdVisibility.ts', import.meta.url), 'utf8')
const rendered = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exported = {}
vm.runInNewContext(rendered, { exports: exported }, { filename: 'HomeThresholdVisibility.ts' })
const { showHomeThresholdLabel } = exported

for (const phase of ['HOME', 'ASCENT', 'LIFE_MAP', 'GROUND_DESCENT', 'REPLAY']) {
  for (const proximity of [null, 'orb', 'ground', 'life-map']) {
    for (const destination of ['ground', 'life-map']) {
      test(`${phase}, near ${proximity}, target ${destination}: show only when approaching`, () => {
        assert.equal(showHomeThresholdLabel(phase, proximity, destination), phase === 'HOME' && proximity === destination)
      })
    }
  }
}

test('current original scene conditions labels without altering physical threshold colliders', () => {
  const renderer = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
  assert.match(renderer, /import \{ showHomeThresholdLabel \} from '\.\/HomeThresholdVisibility'/)
  assert.match(renderer, /function Thresholds\(\{ onGround, onLifeMap, nearby \}/)
  assert.match(renderer, /thresholds\.filter\(\(\{ destination \}\) => showHomeThresholdLabel\(phase, nearby, destination\)\)/)
  assert.match(renderer, /<Thresholds onGround=\{props\.onGround\} onLifeMap=\{props\.onLifeMap\} nearby=\{props\.nearby\} \/>/)
  // The authored scene and readiness probe share the same preview identity, but
  // Scene's nearby prop is no longer adjacent to the preview prop in JSX.
  assert.match(renderer, /<Scene key=\{previewW13V3 \? 'w13-v3' : 'canonical'\} previewW13V3=\{previewW13V3\}/)
  assert.match(renderer, /<Scene key=\{previewW13V3 \? 'w13-v3' : 'canonical'\}[^\n]* nearby=\{nearby\}/)
  assert.match(renderer, /<SceneReady key=\{props\.previewW13V3 \? 'w13-v3' : 'canonical'\} previewW13V3=\{props\.previewW13V3\}/)
  assert.match(renderer, /name="home-ground-environmental-threshold"/)
  assert.match(renderer, /name="home-life-map-sky-lookout"/)
  assert.match(renderer, /onClick=\{\(e\) => \{ e\.stopPropagation\(\); onGround\(\) \}\}/)
  assert.match(renderer, /onClick=\{\(e\) => \{ e\.stopPropagation\(\); onLifeMap\(\) \}\}/)
  assert.match(renderer, /aria-hidden="true"/)
  assert.match(renderer, /data-home-nearby=\{nearby \?\? 'none'\}/)
  assert.match(renderer, /role="status" aria-live="polite"/)
  assert.doesNotMatch(renderer, /phase === 'HOME' \? thresholds\.map/)
})
