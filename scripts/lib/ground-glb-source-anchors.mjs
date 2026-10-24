// Ground GLB source-only structural check: not a render or art certificate.
export const EXPECTED_GROUND_DESTINATIONS = Object.freeze([
  'reception','privacy','council','logistics','wellness','archive',
  'mirror','passport','consent','atlas','focus','replay',
])
export function inspectGroundGlbAnchors(document, source) {
  const failures=[], fail=msg=>failures.push(msg)
  const nodes=Array.isArray(document?.nodes)?document.nodes:[]
  const meshes=Array.isArray(document?.meshes)?document.meshes:[]
  const accessors=Array.isArray(document?.accessors)?document.accessors:[]
  const bufferViews=Array.isArray(document?.bufferViews)?document.bufferViews:[]
  const buffers=Array.isArray(document?.buffers)?document.buffers:[]
  // A mesh table index alone is not drawable geometry. Validate real triangle
  // primitives and bounded accessor/view references in the authored Ground GLB.
  // This is structural evidence only, not GPU decode, art approval or release.
  const validView=index=>{
    if(!Number.isInteger(index)||index<0||index>=bufferViews.length)return false
    const view=bufferViews[index]
    if(!Number.isInteger(view?.buffer)||view.buffer<0||view.buffer>=buffers.length)return false
    const buffer=buffers[view.buffer]
    const offset=view?.byteOffset??0
    return Number.isSafeInteger(view?.byteLength)&&view.byteLength>0&&
      Number.isSafeInteger(offset)&&offset>=0&&
      Number.isSafeInteger(buffer?.byteLength)&&buffer.byteLength>0&&
      offset<=buffer.byteLength-view.byteLength
  }
  const validAccessor=(index,type,minCount)=>{
    if(!Number.isInteger(index)||index<0||index>=accessors.length)return false
    const a=accessors[index]
    const components=type==='VEC3'?[5120,5121,5122,5123,5126]:[5121,5123,5125]
    if(a?.type!==type||!components.includes(a.componentType)||
       !Number.isSafeInteger(a.count)||a.count<minCount||
       !Number.isSafeInteger(a.byteOffset??0)||(a.byteOffset??0)<0||
       !validView(a.bufferView))return false
    const view=bufferViews[a.bufferView]
    const size=({5120:1,5121:1,5122:2,5123:2,5125:4,5126:4})[a.componentType]*(type==='VEC3'?3:1)
    const stride=view.byteStride??size
    const remaining=view.byteLength-(a.byteOffset??0)-size
    return Number.isSafeInteger(stride)&&stride>=size&&remaining>=0&&
      a.count<=1+Math.floor(remaining/stride)
  }
  const validPrimitive=p=>{
    if(!p||((p.mode??4)!==4)||!validAccessor(p.attributes?.POSITION,'VEC3',3))return false
    const vertexCount=accessors[p.attributes.POSITION].count
    if(p.indices===undefined)return vertexCount%3===0
    if(!validAccessor(p.indices,'SCALAR',3))return false
    const indices=accessors[p.indices]
    return indices.count%3===0&&
      (!Array.isArray(indices.min)||
        (indices.min.length===1&&Number.isInteger(indices.min[0])&&indices.min[0]>=0))&&
      (!Array.isArray(indices.max)||
        (indices.max.length===1&&Number.isInteger(indices.max[0])&&indices.max[0]>=0&&indices.max[0]<vertexCount))
  }
  const validMesh=node=>{
    if(!Number.isInteger(node?.mesh)||node.mesh<0||node.mesh>=meshes.length)return false
    const primitives=meshes[node.mesh]?.primitives
    return Array.isArray(primitives)&&primitives.length>0&&primitives.every(validPrimitive)
  }
  const named=name=>nodes.map((value,index)=>({value,index})).filter(x=>x.value?.name===name)
  const root=named('ground-world-root')
  if(root.length!==1)fail('GROUND_GLB_ROOT_NOT_UNIQUE')
  const scene=document?.scenes?.[document.scene??0]
  if(root.length!==1||!scene?.nodes?.includes(root[0].index))fail('GROUND_GLB_SCENE_ROOT_NOT_MOUNTED')
  const children=root.length===1&&Array.isArray(root[0].value.children)?root[0].value.children:[]
  const terrain=named('ground-sacred-black-glass')
  if(terrain.length!==1||!validMesh(terrain[0].value)||!children.includes(terrain[0].index))fail('GROUND_GLB_TERRAIN_GEOMETRY_MISSING')
  const expected=EXPECTED_GROUND_DESTINATIONS
  const sourceText=String(source??'')
  const sourceEntries=[...sourceText.matchAll(/^\s*id: "([a-z][a-z0-9]*)",?\s*$/gm)]
  const sourceIds=sourceEntries.map(x=>x[1])
  const positions=new Map()
  for(let i=0;i<sourceEntries.length;i++){
    const entry=sourceEntries[i]
    const body=sourceText.slice(entry.index+entry[0].length,sourceEntries[i+1]?.index??sourceText.length)
    const found=[...body.matchAll(/^\s*position:\s*\[([^\]\r\n]+)\],?\s*$/gm)]
    // Never read the next destination's coordinates when this one is missing.
    if(found.length===1)positions.set(entry[1],found[0][1].split(',').map(x=>Number(x.trim())))
  }
  if(sourceIds.length!==12||new Set(sourceIds).size!==12||expected.some(id=>!sourceIds.includes(id)))fail('GROUND_GLB_SOURCE_DESTINATION_SET_CHANGED')
  const allAnchors=nodes.filter(x=>x?.name?.startsWith('ground-destination-'))
  if(allAnchors.length!==12)fail('GROUND_GLB_ANCHOR_COUNT_CHANGED')
  let matched=0
  for(const id of expected){
    const a=named('ground-destination-'+id)
    if(a.length!==1){fail('GROUND_GLB_DESTINATION_MISSING_OR_DUPLICATE:'+id);continue}
    if(!children.includes(a[0].index))fail('GROUND_GLB_DESTINATION_ORPHAN:'+id)
    const c=(a[0].value.children??[]).map(i=>nodes[i]).filter(Boolean)
    if(!c.some(x=>x.name===id+'-monumental-chamber'&&validMesh(x)))fail('GROUND_GLB_CHAMBER_GEOMETRY_MISSING:'+id)
    if(!c.some(x=>x.name===id+'-signal-rune'&&validMesh(x)))fail('GROUND_GLB_CHAMBER_SIGNAL_MISSING:'+id)
    const expectedCoord=positions.get(id)
    const actual=a[0].value.translation
    if(!expectedCoord||expectedCoord.length!==3||expectedCoord.some(x=>!Number.isFinite(x))||!Array.isArray(actual)||actual.length!==3||actual.some((x,i)=>!Number.isFinite(x)||Math.abs(x-expectedCoord[i])>0.00001))fail('GROUND_GLB_DESTINATION_COORDINATES_DRIFT:'+id)
    else matched++
  }
  return {ok:failures.length===0,anchorMatches:matched,renderedProof:false,artApproved:false,releaseAuthorized:false,failures}
}
