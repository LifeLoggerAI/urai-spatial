import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const world = read('src/components/lifemap/LifeMapProductionWorld.tsx')
const navigator = read('src/components/lifemap/LifeMapSemanticNavigator.tsx')

function sliceBetween(source, start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  assert.notEqual(from, -1, `missing start marker: ${start}`)
  assert.notEqual(to, -1, `missing end marker: ${end}`)
  return source.slice(from, to)
}

test('semantic result is the authored native world-label owner before route persistence', () => {
  assert.match(world, /import \{ Html, Line, Stars \} from "@react-three\/drei"/)
  assert.match(world, /<button className="life-map-world-label" data-life-map-node-id=\{node\.id\}/)
  assert.match(world, /document\.addEventListener\("click", handleWorldLabelClick, true\)/)
  assert.match(world, /target\.dataset\.lifeMapNodeId/)
  assert.match(world, /if \(node\) onSelect\(node\)/)
  assert.match(world, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onSelect\(node\); \}\}/)
  assert.match(navigator, /querySelectorAll<HTMLButtonElement>\("button\.life-map-world-label"\)/)
  assert.match(navigator, /button\.getAttribute\("role"\) !== "listitem"/)
  assert.match(navigator, /className="life-map-world-label" data-life-map-node-id=\{node\.id\} role="listitem"/)
  const selection = sliceBetween(navigator, 'const selectNode = useCallback', 'const overview = useCallback')
  assert.ok(selection.indexOf('activateWorldLabel(node)') < selection.indexOf('router.replace'), 'scene ownership must resolve before route persistence')
})

test('Quiet Reset pattern memories resolve to an authored settling sanctuary', () => {
  assert.match(world, /function GroundingSanctuary/)
  assert.match(world, /data-grounding-language="settling-rhythm"/)
  assert.match(world, /family === "pattern" \? <GroundingSanctuary/)
  const grounding = sliceBetween(world, 'function GroundingSanctuary', 'function ArrivalSanctuary')
  assert.match(grounding, /life-map-grounding-witness-stones/)
  assert.match(grounding, /<Ground seed=\{500\}/)
  assert.match(grounding, /<Current key=\{y\}/)
})

test('overview composition is opaque, authored, and independently framed for portrait', () => {
  assert.match(world, /function ChapterTerritory/)
  assert.match(world, /function ForegroundObservatory/)
  assert.match(world, /life-map-authored-chapter-regions/)
  assert.match(world, /life-map-foreground-observatory/)
  assert.match(world, /const portrait = size\.height > size\.width/)
  assert.match(world, /portrait \? \[0\.5, 0\.92, 0\.74\]/)
  assert.match(world, /roughness=\{0\.72\}/)
})

test('visual repair preserves adaptive performance and evidence budgets', () => {
  assert.match(world, /qualityTier === "low" \? 80 : qualityTier === "medium" \? 150 : 240/)
  assert.match(world, /profile\.tier === "low" \? 420 : profile\.tier === "medium" \? 760 : 1160/)
  assert.match(world, /active=\{profile\.postprocessing\}/)
  assert.match(world, /if \(!group\.current \|\| reducedMotion\) return/)
  for (const marker of ['life-map-white-gold-life-core', 'life-map-curved-semantic-paths', 'life-map-memory-artifact-families', 'life-map-intimate-memory-chamber']) assert.match(world, new RegExp(marker))
})
