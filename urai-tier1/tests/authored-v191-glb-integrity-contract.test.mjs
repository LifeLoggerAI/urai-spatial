import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const root=new URL('../public/assets/urai/home-production/authored-v191/',import.meta.url)
const historical=[['home-continuous-landscape-v191.glb',25],['home-ground-place-v191.glb',4],['home-life-map-place-v191.glb',7],['urai-living-memory-heart-v191.glb',1]]
function inspectGlb(name){const bytes=readFileSync(new URL(name,root));assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8').trim());return{bytes,json}}

test('historical V191 GLBs remain structurally intact but do not confer current visual authority',()=>{for(const[name,meshCount]of historical){const{bytes,json}=inspectGlb(name);assert.ok(bytes.length<750_000);assert.equal(json.meshes.length,meshCount);assert.ok(json.accessors.every((a)=>a.count>0))}})

test('V224 direct runtime owns the visible topology after literal predecessor rejection',()=>{const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223Geometry.tsx',import.meta.url),'utf8');assert.match(source,/home-v224-sculpted-sanctuary-floor/);assert.match(source,/weathered-strata/);assert.match(source,/home-v224-rooted-memory-rib/);assert.match(source,/home-v224-distant-strata-buttress/);assert.match(source,/home-v197-ground-continuous-sheltering-memory-wall/);assert.match(source,/home-v200-life-map-integrated-weathered-memory-ledger-1/);assert.match(source,/home-v201-single-connected-folded-living-memory-mantle/);assert.doesNotMatch(source,/useGLTF\(/);assert.doesNotMatch(source,/AUTHORED_ORB/);assert.match(source,/MeshPhysicalMaterial|meshPhysicalMaterial/)})

test('V224 navigation surface remains high-density and invisible while visible depth is non-heightfield',()=>{const source=readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223Geometry.tsx',import.meta.url),'utf8');assert.match(source,/const xs = 100, zs = 100/);assert.match(source,/cliffGeometry/);assert.match(source,/TubeGeometry/);assert.match(source,/visible=\{false\}/)})
