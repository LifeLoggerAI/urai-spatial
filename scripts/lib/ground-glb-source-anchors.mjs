// Ground GLB source-only structural check: not a render or art certificate.
export const EXPECTED_GROUND_DESTINATIONS = Object.freeze([
  'reception','privacy','council','logistics','wellness','archive',
  'mirror','passport','consent','atlas','focus','replay',
])
export function inspectGroundGlbAnchors(document, source) {
  const failures=[], fail=msg=>failures.push(msg)
  const nodes=Array.isArray(document?.nodes)?document.nodes:[]
  const named=name=>nodes.map((value,index)=>({value,index})).filter(x=>x.value?.name===name)
  const root=named('ground-world-root')
  if(root.length!==1)fail('GROUND_GLB_ROOT_NOT_UNIQUE')
  const scene=document?.scenes?.[document.scene??0]
  if(root.length!==1||!scene?.nodes?.includes(root[0].index))fail('GROUND_GLB_SCENE_ROOT_NOT_MOUNTED')
  const children=root.length===1&&Array.isArray(root[0].value.children)?root[0].value.children:[]
  const terrain=named('ground-sacred-black-glass')
  if(terrain.length!==1||!Number.isInteger(terrain[0].value.mesh)||terrain[0].value.mesh>=((document?.meshes??[]).length))fail('GROUND_GLB_TERRAIN_GEOMETRY_MISSING')
  const expected=EXPECTED_GROUND_DESTINATIONS
  const sourceIds=[...String(source??'').matchAll(/^\s*id: "([a-z][a-z0-9]*)",\s*$/gm)].map(x=>x[1])
  if(sourceIds.length!==12||new Set(sourceIds).size!==12||expected.some(id=>!sourceIds.includes(id)))fail('GROUND_GLB_SOURCE_DESTINATION_SET_CHANGED')
  const allAnchors=nodes.filter(x=>x?.name?.startsWith('ground-destination-'))
  if(allAnchors.length!==12)fail('GROUND_GLB_ANCHOR_COUNT_CHANGED')
  let matched=0
  for(const id of expected){
    const a=named('ground-destination-'+id)
    if(a.length!==1){fail('GROUND_GLB_DESTINATION_MISSING_OR_DUPLICATE:'+id);continue}
    if(!children.includes(a[0].index))fail('GROUND_GLB_DESTINATION_ORPHAN:'+id)
    const c=(a[0].value.children??[]).map(i=>nodes[i]).filter(Boolean)
    if(!c.some(x=>x.name===id+'-monumental-chamber'&&Number.isInteger(x.mesh)))fail('GROUND_GLB_CHAMBER_GEOMETRY_MISSING:'+id)
    if(!c.some(x=>x.name===id+'-signal-rune'&&Number.isInteger(x.mesh)))fail('GROUND_GLB_CHAMBER_SIGNAL_MISSING:'+id)
    const hit=String(source??'').match(new RegExp('^\\s*id: "'+id+'",\\s*$[\\s\\S]*?^\\s*position: \\[([^\\]]+)\\]','m'))
    const expectedCoord=hit?.[1].split(',').map(x=>Number(x.trim()))
    const actual=a[0].value.translation
    if(!expectedCoord||expectedCoord.length!==3||expectedCoord.some(x=>!Number.isFinite(x))||!Array.isArray(actual)||actual.length!==3||actual.some((x,i)=>!Number.isFinite(x)||Math.abs(x-expectedCoord[i])>0.00001))fail('GROUND_GLB_DESTINATION_COORDINATES_DRIFT:'+id)
    else matched++
  }
  return {ok:failures.length===0,anchorMatches:matched,renderedProof:false,artApproved:false,releaseAuthorized:false,failures}
}
