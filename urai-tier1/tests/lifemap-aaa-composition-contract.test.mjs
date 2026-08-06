import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const world = read('src/components/lifemap/LifeMapProductionWorld.tsx')
const navigator = read('src/components/lifemap/LifeMapSemanticNavigator.tsx')
const selectionBroker = read('src/components/lifemap/lifeMapSelection.ts')

function sliceBetween(source, start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  assert.notEqual(from, -1, `missing start marker: ${start}`)
  assert.notEqual(to, -1, `missing end marker: ${end}`)
  return source.slice(from, to)
}

test('semantic result requests the authoritative world owner without hidden-label re-entry', () => {
  assert.match(world, /import \{ Line, Sparkles, Stars \} from "@react-three\/drei"/)
  assert.doesNotMatch(world, /\bHtml\b|life-map-world-label|handleWorldLabelClick|document\.addEventListener\("click"/)
  assert.match(world, /window\.addEventListener\(LIFE_MAP_SELECTION_EVENT, handleSelectionRequest\)/)
  assert.match(world, /const detail = readLifeMapSelection\(event\)/)
  assert.match(world, /const node = nodes\.find\(\(candidate\) => candidate\.id === detail\.nodeId\)/)
  assert.match(world, /if \(node\) onSelect\(node\)/)
  assert.match(world, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onSelect\(node\); \}\}/)
  assert.match(navigator, /className="life-map-semantic-result" data-life-map-semantic-result data-life-map-node-id=\{node\.id\} role="listitem"/)
  assert.match(navigator, /requestLifeMapSelection\(node\.id, source\)/)
  assert.doesNotMatch(navigator, /querySelectorAll<HTMLButtonElement>\("button\.life-map-world-label"\)|activateWorldLabel|owner\.click\(\)/)
  assert.match(selectionBroker, /window\.dispatchEvent\(new CustomEvent<LifeMapSelectionDetail>/)
})

test('pattern memories retain authored settling geometry inside the selected arrival sanctuary', () => {
  assert.match(world, /function PatternArtifact/)
  assert.match(world, /family === "pattern"\) return <PatternArtifact/)
  assert.match(world, /function ArrivalSanctuary/)
  assert.match(world, /name="life-map-selected-arrival-sanctuary"/)
  const pattern = sliceBetween(world, 'function PatternArtifact', 'function AchievementArtifact')
  assert.match(pattern, /\[-0\.22, 0, 0\.22\]\.map/)
  assert.match(pattern, /<Current key=\{y\}/)
  assert.match(pattern, /color=\{index === 1 \? ICE : node\.aura\}/)
  const arrival = sliceBetween(world, 'function ArrivalSanctuary', 'function ArchiveParticles')
  assert.match(arrival, /if \(!selected \|\| phase !== "arrival"\) return null/)
  assert.match(arrival, /<ringGeometry args=\{\[1\.3, 4\.6, 160\]\}/)
  assert.match(arrival, /<pointLight color=\{selected\.aura\} intensity=\{12\}/)
})

test('overview composition is opaque, authored, and independently framed for portrait', () => {
  assert.match(world, /function ChapterTerritories/)
  assert.match(world, /function ForegroundObservatory/)
  assert.match(world, /life-map-authored-chapter-regions/)
  assert.match(world, /life-map-foreground-observatory/)
  assert.match(world, /name="life-map-authored-environment"[\s\S]*<sphereGeometry args=\{\[86, 40, 28\]\}[\s\S]*side=\{THREE\.BackSide\}/)
  assert.match(world, /const portrait = size\.height > size\.width/)
  assert.match(world, /portrait \? \[0\.5, 0\.92, 0\.74\]/)
  assert.match(world, /portrait \? \[0, -0\.36, 1\.3\]/)
})

test('visual repair preserves adaptive performance and evidence budgets', () => {
  assert.match(world, /qualityTier === "low" \? 150 : qualityTier === "medium" \? 260 : 420/)
  assert.match(world, /profile\.tier === "low" \? 620 : profile\.tier === "medium" \? 1100 : 1900/)
  assert.match(world, /profile\.tier === "low" \? 70 : 160/)
  assert.match(world, /active=\{profile\.postprocessing\}/)
  assert.match(world, /if \(!root\.current \|\| reducedMotion\) return/)
  for (const marker of ['life-map-white-gold-life-core', 'life-map-curved-semantic-paths', 'life-map-memory-artifact-families', 'life-map-selected-arrival-sanctuary']) assert.match(world, new RegExp(marker))
})
