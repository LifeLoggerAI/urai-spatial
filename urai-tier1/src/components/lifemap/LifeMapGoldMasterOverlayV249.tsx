'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { LifeMapNode } from './lifeMapData'
import { lifeMapLocalPoint, lifeMapStage, lifeMapTerrainHeight } from './lifeMapSpatialLayout'
import type { LifeMapJourneyPhase } from './LifeMapProductionWorld'

type Props = { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }
type Point3 = [number, number, number]
type RaycastFn = THREE.Object3D['raycast']
type FamilyPart = { geometry: THREE.BufferGeometry; position: Point3; rotation: Point3; scale: Point3; opacity?: number }

const RETIRED_VISUAL_GROUPS = new Set([
  'life-map-v237-weathered-valley-floor', 'life-map-v237-worn-lineage-path', 'life-map-memory-artifact-families',
  'life-map-curved-semantic-paths', 'life-map-authored-chapter-regions', 'life-map-selected-arrival-sanctuary',
  'life-map-foreground-observatory', 'life-map-relationship-observatory', 'life-map-goal-horizon', 'life-map-achievement-monument',
])

const FAMILY_BASE: Record<LifeMapNode['type'], string> = {
  memory: '#82988c', season: '#748f87', ritual: '#9c846c', forecast: '#658796', threshold: '#987582',
  relationship: '#87979b', recovery: '#769587', legacy: '#817469',
}

function seeded(seed: number, salt: number) { const value = Math.sin(seed * 91.317 + salt * 17.731) * 43758.5453123; return value - Math.floor(value) }
function nodeSeed(node: LifeMapNode, index: number) { return node.id.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) + index * 37 }

function stoneGeometry(seed: number, detail = 2) {
  const geometry = new THREE.IcosahedronGeometry(1, detail)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const point = new THREE.Vector3()
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index)
    const direction = point.clone().normalize()
    const grain = 1 + .11 * Math.sin(direction.x * 5.7 + direction.z * 4.1 + seed * .013) + .05 * Math.sin(direction.y * 11.2 - direction.x * 7.4 + seed * .021)
    point.multiplyScalar(grain)
    position.setXYZ(index, point.x, point.y, point.z)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function memoryBody(seed: number, aura: string, active: boolean) {
  const geometry = new THREE.SphereGeometry(1, 40, 30)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color('#29413b'), mid = new THREE.Color('#86a69a'), warm = new THREE.Color('#e3bd91'), accent = new THREE.Color(aura)
  const asymmetry = (seeded(seed, 33) - .5) * .22
  for (let index = 0; index < position.count; index += 1) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index), angle = Math.atan2(nz, nx)
    const upper = THREE.MathUtils.smoothstep(ny, -.05, .92), lower = THREE.MathUtils.smoothstep(-ny, .10, .98)
    const cleft = Math.exp(-(((nx + asymmetry) / .28) ** 2)) * THREE.MathUtils.smoothstep(ny, .18, .96)
    const lobeA = Math.exp(-(((nx + .38 + asymmetry) / .48) ** 2 + ((ny - .40) / .56) ** 2))
    const lobeB = Math.exp(-(((nx - .34 + asymmetry) / .50) ** 2 + ((ny - .34) / .58) ** 2))
    const skin = .035 * Math.sin(angle * 4.6 + ny * 7.1 + seed * .017) + .016 * Math.sin(angle * 9.3 - ny * 11.0)
    const taper = THREE.MathUtils.lerp(.40, 1, THREE.MathUtils.smoothstep(ny, -.96, .12))
    let x = nx * (.70 + .04 * (seed % 4)) * taper * (1 + skin + .05 * lobeA + .03 * lobeB)
    let z = nz * (.57 + .025 * ((seed + 2) % 4)) * taper * (1 + skin * .55)
    const y = ny * (active ? .91 : .86) + .05 * lobeA + .03 * lobeB - .12 * cleft - lower * .14
    x += upper * (.06 + asymmetry * .10)
    const twist = (ny + .12) * (.11 + (seeded(seed, 12) - .5) * .16), cos = Math.cos(twist), sin = Math.sin(twist)
    const tx = x * cos - z * sin, tz = x * sin + z * cos
    position.setXYZ(index, tx, y, tz)
    const altitude = THREE.MathUtils.clamp((y + 1.05) / 2.1, 0, 1), fissure = THREE.MathUtils.clamp(cleft * .58 + Math.abs(skin) * 4.6, 0, 1)
    const color = deep.clone().lerp(mid, .34 + .44 * altitude).lerp(warm, .12 + .18 * upper).lerp(accent, (active ? .12 : .075) + fissure * (active ? .15 : .10))
    colors.set([color.r, color.g, color.b], index * 3)
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function tube(points: Point3[], radius: number) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))), 24, radius, 7, false) }

function semanticFamilyParts(node: LifeMapNode, seed: number, active: boolean): FamilyPart[] {
  const stone = () => stoneGeometry(seed + Math.floor(seeded(seed, 91) * 997))
  if (node.type === 'memory') return [{ geometry: memoryBody(seed, node.aura, active), position: [0, 0, 0], rotation: [0, -.16, 0], scale: [.86, 1.02, .76] }]
  if (node.type === 'season') return [{ geometry: tube([[-.6,-.2,.1],[-.3,.2,0],[0,.38,-.12],[.38,.16,-.2],[.62,-.1,-.12]], .06), position:[0,0,0], rotation:[0,0,0], scale:[1,1,1] }, { geometry: stone(), position:[-.42,-.32,.08], rotation:[0,.4,-.08], scale:[.34,.28,.48] }]
  if (node.type === 'ritual') return [
    { geometry: stoneGeometry(seed+1), position:[0,-.32,0], rotation:[0,.2,0], scale:[.58,.26,.48] },
    { geometry: stoneGeometry(seed+2), position:[.04,0,-.03], rotation:[.04,-.38,.08], scale:[.43,.24,.34] },
    { geometry: stoneGeometry(seed+3), position:[-.03,.28,-.02], rotation:[-.05,.31,-.04], scale:[.28,.21,.25] },
  ]
  if (node.type === 'forecast') return [
    { geometry: stone(), position:[-.12,-.34,.18], rotation:[0,.2,0], scale:[.38,.23,.50], opacity: node.locked ? .62 : .92 },
    { geometry: tube([[-.34,-.32,.20],[-.18,.02,-.05],[-.05,.34,-.36],[.06,.64,-.72]], .035), position:[0,0,0], rotation:[0,0,0], scale:[1,1,1], opacity:.86 },
    { geometry: tube([[.10,-.30,.18],[.22,.04,-.10],[.34,.31,-.42],[.46,.54,-.78]], .027), position:[0,0,0], rotation:[0,0,0], scale:[1,1,1], opacity:.72 },
  ]
  if (node.type === 'threshold') return [
    { geometry: stoneGeometry(seed+11), position:[-.28,.04,0], rotation:[.02,-.12,-.16], scale:[.25,.92,.30] },
    { geometry: stoneGeometry(seed+12), position:[.31,-.02,-.05], rotation:[-.02,.16,.14], scale:[.27,.82,.32] },
  ]
  if (node.type === 'relationship') return [
    { geometry: stoneGeometry(seed+21), position:[-.44,-.18,.02], rotation:[0,-.3,.05], scale:[.42,.42,.38] },
    { geometry: stoneGeometry(seed+22), position:[.47,-.16,-.03], rotation:[.02,.32,-.04], scale:[.34,.36,.42] },
    { geometry: tube([[-.42,-.02,0],[-.18,.25,-.08],[.18,.23,-.10],[.44,.02,-.02]], .035), position:[0,0,0], rotation:[0,0,0], scale:[1,1,1], opacity:.76 },
  ]
  if (node.type === 'recovery') return [
    { geometry: stone(), position:[0,-.30,0], rotation:[0,.2,0], scale:[.52,.27,.54] },
    ...[-1,0,1].map((side, branch) => ({ geometry:tube([[0,-.28,0],[side*.10,.02,-.03],[side*(.24+branch*.025),.30,-.10-branch*.05],[side*(.34+branch*.035),.58+branch*.06,-.16-branch*.08]], .032-branch*.004), position:[0,0,0] as Point3, rotation:[0,0,0] as Point3, scale:[1,1,1] as Point3 })),
  ]
  const spiralPoints = Array.from({ length: 15 }, (_, index) => { const t=index/14, angle=t*Math.PI*3.15, radius=.12+t*.48; return [Math.cos(angle)*radius,-.30+t*.72,Math.sin(angle)*radius*.58] as Point3 })
  return [{ geometry:tube(spiralPoints,.038), position:[0,0,0], rotation:[0,0,0], scale:[1,1,1] }, { geometry:stone(), position:[0,-.34,.02], rotation:[0,-.2,0], scale:[.64,.23,.62] }]
}

function motesGeometry(seed:number, active:boolean) {
  const count = active ? 14 : 6, positions=new Float32Array(count*3)
  for(let index=0;index<count;index+=1){const angle=index*2.39996323+seeded(seed,index)*.5,radius=.24+Math.sqrt((index+.5)/count)*(active ? .82 : .48);positions.set([Math.cos(angle)*radius,-.08+seeded(seed+index,17)*(active ? .84 : .48),Math.sin(angle)*radius*.62],index*3)}
  const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.BufferAttribute(positions,3)); return geometry
}

function authoredTerrainGeometry() {
  const columns=112, rows=156, positions:number[]=[], colors:number[]=[], indices:number[]=[]
  const shadow=new THREE.Color('#293c37'), earth=new THREE.Color('#607668'), moss=new THREE.Color('#829a82'), history=new THREE.Color('#927964'), stone=new THREE.Color('#b6b59c')
  for(let row=0;row<=rows;row+=1){const v=row/rows,z=7-v*47;for(let column=0;column<=columns;column+=1){const u=column/columns,x=-15+u*30,y=lifeMapTerrainHeight(x,z);positions.push(x,y+.035,z);const age=THREE.MathUtils.clamp((-z+4)/45,0,1),exposed=THREE.MathUtils.clamp((y+4.4)/2.4,0,1),basin=Math.exp(-((x*x)/90+((z+14)*(z+14))/520)),micro=.5+.5*Math.sin(x*1.37+z*.83)*Math.cos(z*.57-x*.41);const color=shadow.clone().lerp(earth,.34+exposed*.34).lerp(moss,.11+basin*.18).lerp(history,.04+age*.12).lerp(stone,micro*.045+exposed*.07);colors.push(color.r,color.g,color.b)}}
  const stride=columns+1;for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){const a=row*stride+column,b=a+1,c=a+stride,d=c+1;if((row+column)%2)indices.push(a,c,b,b,c,d);else indices.push(a,c,d,a,d,b)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function trailGeometry(){const rows=130,positions:number[]=[],colors:number[]=[],indices:number[]=[],earth=new THREE.Color('#5d5547'),worn=new THREE.Color('#d5b68a');for(let row=0;row<=rows;row+=1){const t=row/rows,z=6-t*44,center=.46*Math.sin((z+4)*.14),width=.22+.05*Math.sin(t*Math.PI*4.4);for(const side of[-1,1]as const){const x=center+side*width,y=lifeMapTerrainHeight(x,z)+.07;positions.push(x,y,z);const color=earth.clone().lerp(worn,.54+.20*(1-t));colors.push(color.r,color.g,color.b)}}for(let row=0;row<rows;row+=1){const a=row*2,b=a+1,c=a+2,d=c+1;indices.push(a,c,b,b,c,d)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry}

function RetireRejectedLifeMapVisuals(){const{scene}=useThree(),hidden=useRef(new Set<THREE.Object3D>()),raycasts=useRef(new Map<THREE.Object3D,RaycastFn>());useFrame(()=>{scene.traverse(object=>{if(!RETIRED_VISUAL_GROUPS.has(object.name)||!object.visible)return;object.visible=false;if(!raycasts.current.has(object))raycasts.current.set(object,object.raycast);object.raycast = () => undefined;object.traverse(child=>{if(!raycasts.current.has(child))raycasts.current.set(child,child.raycast);child.raycast = () => undefined});hidden.current.add(object)})});useEffect(()=>()=>{hidden.current.forEach(object=>{object.visible=true});raycasts.current.forEach((raycast, object) => { object.raycast = raycast });hidden.current.clear();raycasts.current.clear()},[]);return null}

function MemoryPlace({node,index,active,reducedMotion,onSelect,arrival}:{node:LifeMapNode;index:number;active:boolean;reducedMotion:boolean;onSelect:(node:LifeMapNode)=>void;arrival:boolean}){const root=useRef<THREE.Group>(null),seed=nodeSeed(node,index),point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]);const parts=useMemo(()=>semanticFamilyParts(node,seed,active),[active,node,seed]),motes=useMemo(()=>motesGeometry(seed,active),[active,seed]);useEffect(()=>()=>{parts.forEach(part=>part.geometry.dispose());motes.dispose()},[motes,parts]);useFrame(({clock})=>{if(!root.current||reducedMotion)return;root.current.rotation.y=(seeded(seed,22)-.5)*.34+Math.sin(clock.elapsedTime*.12+seed)*.010});const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(node)};const scale=active?(arrival ? .96 : .86):.70,lift=active?(arrival ? .64 : .48):.30;return <group position={point} name={`life-map-v256-memory-place-${node.id}`} userData={{artRevision:'v257-lived-place-families',semanticFamily: node.type,semanticNode:node.id}} onClick={activate}><group ref={root} position={[0,lift,0]} scale={scale}>{parts.map((part,partIndex)=><mesh key={partIndex} geometry={part.geometry} position={part.position} rotation={part.rotation} scale={part.scale} castShadow receiveShadow><meshStandardMaterial vertexColors={node.type==='memory'} color={node.type==='memory'?'#ffffff':FAMILY_BASE[node.type]} emissive={node.aura} emissiveIntensity={active ? .07 : .018} roughness={.88} metalness={0} transparent={(part.opacity??1)<1} opacity={part.opacity??1}/></mesh>)}<points geometry={motes} raycast={()=>null}><pointsMaterial color={node.aura} size={active ? .032 : .020} transparent opacity={active ? .34 : .12} depthWrite={false} sizeAttenuation/></points><pointLight position={[0,.46,.32]} color={node.aura} intensity={active ? .34 : .06} distance={active?4.8:2.2} decay={2}/></group></group>}

function TerritoryMarker({node,index}:{node:LifeMapNode;index:number}){const point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]),seed=nodeSeed(node,index);const rocks=useMemo(()=>[0,1,2].map(offset=>stoneGeometry(seed+701+offset,2)),[seed]);const scar=useMemo(()=>tube([[-.8,-.20,.34],[-.3,-.06,.1],[.2,.08,-.1],[.72,-.14,-.32]],.025),[]);useEffect(()=>()=>{rocks.forEach(g=>g.dispose());scar.dispose()},[rocks,scar]);const rotation=seeded(seed,704)*Math.PI;return <group position={[point[0],point[1]-.24,point[2]-.34]} rotation={[0,rotation,0]} name={`life-map-v256-chapter-landmark-${node.eraId||node.id}`} userData={{visualOnly:true,interactionOwner:false,chapterLandmark:true,landform:'weathered-outcrop-not-slab'}} raycast={()=>null}><mesh geometry={rocks[0]} position={[-.42,.06,.12]} scale={[.42,.72,.48]} castShadow receiveShadow><meshStandardMaterial color="#56695f" roughness={.98}/></mesh><mesh geometry={rocks[1]} position={[.20,.26,-.08]} scale={[.34,.92,.37]} castShadow receiveShadow><meshStandardMaterial color="#69796c" roughness={.98}/></mesh><mesh geometry={rocks[2]} position={[.54,-.02,.18]} scale={[.28,.52,.34]} castShadow receiveShadow><meshStandardMaterial color="#4b5d55" roughness={.98}/></mesh><mesh geometry={scar} raycast={()=>null}><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={.04} roughness={.92} transparent opacity={.34}/></mesh></group>}

function SelectedSanctuary({node,index,reducedMotion}:{node:LifeMapNode;index:number;reducedMotion:boolean}){const point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]);const branches=useMemo(()=>Array.from({length:5},(_,branch)=>{const side=branch%2?-1:1,offset=Math.floor(branch/2);return tube([[side*(1.7+offset*.14),-.42,-1.34-offset*.18],[side*(1.16+offset*.10),-.16,-.78],[side*(.72+offset*.06),.18,-.22],[side*(.42+offset*.04),.58,.12]],.012+(branch%2)*.002)}),[]);useEffect(()=>()=>branches.forEach(geometry=>geometry.dispose()),[branches]);return <group position={[point[0],point[1]-.02,point[2]]} name="life-map-v256-contextual-memory-sanctuary" userData={{visualOnly:true,interactionOwner:false,scaleMode:'intimate-with-context',arrivalMeaning: 'inside-history-not-node-zoom'}}>{branches.map((geometry,branch)=><mesh key={branch} geometry={geometry} raycast={()=>null}><meshStandardMaterial color={branch%2?node.aura:'#d1b996'} emissive={node.aura} emissiveIntensity={.055} roughness={.86} transparent opacity={reducedMotion ? .19 : .26}/></mesh>)}<pointLight position={[-.76,.72,.54]} color={node.aura} intensity={.38} distance={5.2} decay={2}/><pointLight position={[.92,.44,-.58]} color="#ddb184" intensity={.15} distance={3.8} decay={2}/></group>}

export function LifeMapGoldMasterOverlay({nodes,selected,phase,reducedMotion,onSelect}:Props){const{size}=useThree(),portrait=size.height>size.width,stage=lifeMapStage(Boolean(selected),portrait);const terrain=useMemo(authoredTerrainGeometry,[]),trail=useMemo(trailGeometry,[]);useEffect(()=>()=>{terrain.dispose();trail.dispose()},[terrain,trail]);const selectedIndex=selected?Math.max(0,nodes.findIndex(node=>node.id===selected.id)):-1,arrival=Boolean(selected&&phase==='arrival');const territories=useMemo(()=>{const seen=new Set<string>(),result:{node:LifeMapNode;index:number}[]=[];nodes.forEach((node,index)=>{const key=node.eraId||node.id;if(!seen.has(key)){seen.add(key);result.push({node,index})}});return result},[nodes]);return <><RetireRejectedLifeMapVisuals/><group visible={false} name="life-map-v249-personal-universe-geography" scale={stage.scale} position={stage.position} userData={{artRevision:'v257-lived-personal-universe-retired',visualRepair:'historical-geology-retained-as-nonvisual-provenance'}}><mesh geometry={terrain} receiveShadow castShadow name="life-map-v256-authored-memory-terrain" userData={{visualAuthority: 'authored-chapter-geography',topology:'continuous-explorable-world'}}><meshStandardMaterial vertexColors color="#d7dcc9" emissive="#12211d" emissiveIntensity={.025} roughness={.97} metalness={0} side={THREE.DoubleSide}/></mesh><mesh geometry={trail} receiveShadow name="life-map-v256-worn-lineage-footpath"><meshStandardMaterial vertexColors color="#e0c297" emissive="#3a2c22" emissiveIntensity={.025} roughness={.94}/></mesh><group name="life-map-v256-authored-chapter-territories" userData={{visualOnly:true,interactionOwner:false}}>{territories.map(({node,index})=><TerritoryMarker key={node.eraId||node.id} node={node} index={index}/>)}</group><group name="life-map-v249-grounded-memory-places" userData={{visualRepair:'all-sites-remain-grounded-geography-selected-site-rises-without-isolating-context',semanticFamilies: 'memory-season-ritual-forecast-threshold-relationship-recovery-legacy'}}>{nodes.map((node,index)=><MemoryPlace key={node.id} node={node} index={index} active={selected?.id===node.id} arrival={arrival} reducedMotion={reducedMotion} onSelect={onSelect}/>)}</group>{arrival&&selected?<SelectedSanctuary node={selected} index={selectedIndex} reducedMotion={reducedMotion}/>:null}</group></>}
