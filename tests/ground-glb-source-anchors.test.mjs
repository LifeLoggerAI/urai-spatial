import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectGroundGlbAnchors, EXPECTED_GROUND_DESTINATIONS } from '../scripts/lib/ground-glb-source-anchors.mjs'
function fixture(){
 const nodes=[{name:'ground-world-root',children:[]},{name:'ground-sacred-black-glass',mesh:0}]
 const entries=[]
 for(const [i,id] of EXPECTED_GROUND_DESTINATIONS.entries()){
   const xyz=[i*0.5,i*0.2,-3-i*2],n=nodes.length
   nodes[0].children.push(n)
   nodes.push({name:'ground-destination-'+id,translation:xyz,children:[n+1,n+2]})
   nodes.push({name:id+'-monumental-chamber',mesh:1})
   nodes.push({name:id+'-signal-rune',mesh:2})
   entries.push('id: "'+id+'",\nposition: ['+xyz.join(', ')+']')
 }
 return {doc:{scene:0,scenes:[{nodes:[0]}],nodes,meshes:[{},{},{}]},source:entries.join('\n')}
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
