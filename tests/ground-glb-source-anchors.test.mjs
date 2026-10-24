import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectGroundGlbAnchors, EXPECTED_GROUND_DESTINATIONS } from '../scripts/lib/ground-glb-source-anchors.mjs'
function fixture(){
 const nodes=[{name:'ground-world-root',children:[1]},{name:'ground-sacred-black-glass',mesh:0}]
 const entries=[]
 for(const [i,id] of EXPECTED_GROUND_DESTINATIONS.entries()){
   const xyz=[i*0.5,i*0.2,-3-i*2],n=nodes.length
   nodes[0].children.push(n)
   nodes.push({name:'ground-destination-'+id,translation:xyz,children:[n+1,n+2]})
   nodes.push({name:id+'-monumental-chamber',mesh:1})
   nodes.push({name:id+'-signal-rune',mesh:2})
   entries.push('id: "'+id+'",\nposition: ['+xyz.join(', ')+']')
 }
 const mesh=()=>({primitives:[{attributes:{POSITION:0},indices:1,mode:4}]})
 const doc={scene:0,scenes:[{nodes:[0]}],nodes,meshes:[mesh(),mesh(),mesh()],
   buffers:[{byteLength:256}],bufferViews:[{buffer:0,byteLength:72,byteOffset:0},{buffer:0,byteLength:12,byteOffset:72}],
   accessors:[{bufferView:0,componentType:5126,count:6,type:'VEC3'},
     {bufferView:1,componentType:5123,count:6,type:'SCALAR',min:[0],max:[5]}]}
 return {doc,source:entries.join('\n')}
}
function denied(change,code){const a=fixture();change(a);const r=inspectGroundGlbAnchors(a.doc,a.source);assert.equal(r.ok,false,JSON.stringify(r));assert.ok(r.failures.some(s=>s.includes(code)),JSON.stringify(r.failures))}
test('all 12 authored anchors align; no automatic release',()=>{const a=fixture(),r=inspectGroundGlbAnchors(a.doc,a.source);assert.equal(r.ok,true,JSON.stringify(r.failures));assert.equal(r.anchorMatches,12);assert.equal(r.renderedProof,false);assert.equal(r.releaseAuthorized,false)})
test('missing root denied',()=>denied(a=>a.doc.nodes[0].name='bad','GROUND_GLB_ROOT_NOT_UNIQUE'))
test('scene root detached denied',()=>denied(a=>a.doc.scenes[0].nodes=[],'GROUND_GLB_SCENE_ROOT_NOT_MOUNTED'))
test('terrain absent denied',()=>denied(a=>delete a.doc.nodes[1].mesh,'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('orphaned destination denied',()=>denied(a=>a.doc.nodes[0].children.pop(),'GROUND_GLB_DESTINATION_ORPHAN'))
test('missing council destination denied',()=>denied(a=>a.doc.nodes.find(n=>n.name==='ground-destination-council').name='lost','GROUND_GLB_DESTINATION_MISSING_OR_DUPLICATE:council'))
test('duplicate council identity denied',()=>denied(a=>a.doc.nodes.find(n=>n.name==='ground-destination-consent').name='ground-destination-council','GROUND_GLB_DESTINATION_MISSING_OR_DUPLICATE:council'))
test('missing chamber mesh denied',()=>denied(a=>delete a.doc.nodes.find(n=>n.name==='reception-monumental-chamber').mesh,'GROUND_GLB_CHAMBER_GEOMETRY_MISSING:reception'))
test('missing signal rune denied',()=>denied(a=>a.doc.nodes.find(n=>n.name==='reception-signal-rune').name='lost','GROUND_GLB_CHAMBER_SIGNAL_MISSING:reception'))
test('model coordinate drift denied',()=>denied(a=>a.doc.nodes.find(n=>n.name==='ground-destination-council').translation[0]++, 'GROUND_GLB_DESTINATION_COORDINATES_DRIFT:council'))
test('source coordinate drift denied',()=>denied(a=>a.source=a.source.replace('position: [4, 1.6, -19]','position: [14, 1.6, -19]'),'GROUND_GLB_DESTINATION_COORDINATES_DRIFT:consent'))
test('source destination identity removal denied',()=>denied(a=>a.source=a.source.replace('id: "focus"','id: "deleted"'),'GROUND_GLB_SOURCE_DESTINATION_SET_CHANGED'))
test('mesh index outside the GLB mesh table is denied',()=>denied(a=>a.doc.nodes.find(n=>n.name==='council-monumental-chamber').mesh=999,'GROUND_GLB_CHAMBER_GEOMETRY_MISSING:council'))
test('negative signal mesh index is denied',()=>denied(a=>a.doc.nodes.find(n=>n.name==='archive-signal-rune').mesh=-1,'GROUND_GLB_CHAMBER_SIGNAL_MISSING:archive'))
test('negative terrain mesh index is denied',()=>denied(a=>a.doc.nodes[1].mesh=-1,'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('terrain disconnected from live root is denied',()=>denied(a=>a.doc.nodes[0].children=a.doc.nodes[0].children.filter(n=>n!==1),'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('missing position cannot borrow the next destination position',()=>denied(a=>{
  const council=a.doc.nodes.find(n=>n.name==='ground-destination-council')
  const logistics=a.doc.nodes.find(n=>n.name==='ground-destination-logistics')
  council.translation=[...logistics.translation]
  a.source=a.source.replace('id: "council",\nposition: [1, 0.4, -7]', 'id: "council",')
},'GROUND_GLB_DESTINATION_COORDINATES_DRIFT:council'))

test('mesh with no primitives is not drawable terrain',()=>denied(a=>a.doc.meshes[0]={},'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('mesh with empty primitives cannot count as chamber geometry',()=>denied(a=>a.doc.meshes[1].primitives=[],'GROUND_GLB_CHAMBER_GEOMETRY_MISSING:reception'))
test('missing POSITION accessor is not drawable chamber geometry',()=>denied(a=>delete a.doc.meshes[1].primitives[0].attributes.POSITION,'GROUND_GLB_CHAMBER_GEOMETRY_MISSING:privacy'))
test('out-of-range position bufferView is not accepted',()=>denied(a=>a.doc.accessors[0].bufferView=999,'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('truncated position buffer bound is not accepted',()=>denied(a=>a.doc.bufferViews[0].byteOffset=500,'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('missing triangle indices accessor is not accepted',()=>denied(a=>a.doc.meshes[2].primitives[0].indices=998,'GROUND_GLB_CHAMBER_SIGNAL_MISSING:focus'))
test('out of bounds index maximum cannot reference nonexistent vertices',()=>denied(a=>a.doc.accessors[1].max=[7],'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('a second invalid primitive cannot piggyback on a valid primitive',()=>denied(a=>a.doc.meshes[0].primitives.push({attributes:{},mode:4}),'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('non-triangle primitive is not counted as monumental chamber',()=>denied(a=>a.doc.meshes[1].primitives[0].mode=0,'GROUND_GLB_CHAMBER_GEOMETRY_MISSING:replay'))
test('unavailable GLB buffer payload never masquerades as geometry',()=>denied(a=>a.doc.buffers=[],'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('accessor count cannot exceed underlying position byte view',()=>denied(a=>a.doc.accessors[0].count=700,'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('index accessor count cannot exceed declared view',()=>denied(a=>a.doc.accessors[1].count=900,'GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
test('noninteger glTF buffer references are not accepted',()=>denied(a=>a.doc.bufferViews[0].buffer='0','GROUND_GLB_TERRAIN_GEOMETRY_MISSING'))
