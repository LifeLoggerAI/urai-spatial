import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')

assert.ok(source.includes('function MemoryStar('), 'mounted Life Map must own a stellar Memory Star renderer')
assert.ok(source.includes('name={`life-map-memory-star-${node.id}`}'), 'each Memory Star must retain selected-memory identity in the scene graph')
assert.ok(source.includes('visualAuthority: "stellar-memory-not-node-graph"'), 'Memory Star must explicitly reject graph-node authority')
assert.ok(source.includes('stellarMorphology: "point-photosphere-layered-corona-no-visible-sphere"'), 'Memory Star must identify current photosphere/corona morphology')
assert.ok(source.includes('const photosphere = useMemo(() => makeDiscTexture(5.4, true), [])'), 'Memory Star must retain an authored photospheric layer')
assert.ok(source.includes('<sprite scale={[outer * 1.24, outer, 1]}>'), 'Memory Star must expose a bounded outer corona')
assert.ok(source.includes('<sprite scale={[mid * 1.10, mid, 1]}>'), 'Memory Star must expose an inner corona')
assert.ok(source.includes('<sprite scale={[hot, hot, 1]}>'), 'Memory Star must expose the hot photosphere')
assert.ok(source.includes('root.dataset.memoryStarPointerHit = node.id'), 'real pointer proof must bind to exact memory identity')
assert.ok(source.includes('onClick={(event) => { event.stopPropagation(); onSelect(node); }}'), 'visible stellar owner must retain direct selection ownership')
assert.ok(source.includes('<sphereGeometry args={[.30, 8, 6]} />'), 'Memory Star must retain a compact interaction hit volume')
assert.ok(source.includes('<meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />'), 'interaction sphere must remain visually invisible')
assert.ok(source.includes('function Constellations() { return <group name="life-map-constellations" visible={false}'), 'retired constellation graph must remain invisible')
assert.ok(source.includes('retiredVisualRole: "v260-no-explicit-graph-edges"'), 'retired graph grammar must remain explicitly non-authoritative')
assert.ok(!/function MemoryLens\(|life-map-anchored-paths|weathered-memory-outcrop|grounded-semantic-outcrops/.test(source), 'rejected node, path, and geology presentations must not re-enter the mounted runtime')

console.log('Mounted Life Map Memory Star stellar presentation contract passed')
