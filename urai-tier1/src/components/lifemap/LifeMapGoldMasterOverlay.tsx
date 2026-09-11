'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { LifeMapNode } from './lifeMapData'
import { lifeMapLocalPoint, lifeMapStage, lifeMapTerrainHeight } from './lifeMapSpatialLayout'
import type { LifeMapJourneyPhase } from './LifeMapProductionWorld'

type Point3 = [number, number, number]

type Props = { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }

const RETIRED_VISUAL_GROUPS = new Set(['life-map-v237-worn-lineage-path','life-map-memory-artifact-families','life-map-curved-semantic-paths','life-map-authored-chapter-regions','life-map-selected-arrival-sanctuary'])

function seeded(seed:number,salt:number){const value=Math.sin(seed*91.317+salt*17.731)*43758.5453123;return value-Math.floor(value)}
function nodeSeed(node:LifeMapNode,index:number){return node.id.split('').reduce((sum,character)=>sum+character.charCodeAt(0),0)+index*37}

function weatheredOutcropGeometry(seed:number,accent:string,active:boolean){
  const geometry=new THREE.SphereGeometry(1,40,28)
  const position=geometry.getAttribute('position') as THREE.BufferAttribute
  const colors:number[]=[]
  const deep=new THREE.Color('#1b2b27'),mineral=new THREE.Color('#78867a'),memory=new THREE.Color(accent)
  const family=seed%5
  for(let index=0;index<position.count;index++){
    const nx=position.getX(index),ny=position.getY(index),nz=position.getZ(index)
    const azimuth=Math.atan2(nz,nx)
    const crown=Math.max(0,ny)
    const lower=Math.max(0,-ny)
    const lobe=.18*Math.sin(azimuth*(2+(family%2)) + seed*.071)*(.35+.65*crown)
    const scar=.12*Math.sin(azimuth*5.2+ny*4.4+seed*.113)+.055*Math.cos(azimuth*9.1-ny*6.2)
    const cleft=Math.exp(-((nx*.92+nz*.28-.03)**2)/.045)*Math.pow(crown,1.7)
    const radial=1+lobe+scar*.45-.16*cleft
    let x=nx*radial*(1.30+family*.035)
    let z=nz*radial*(.92+(4-family)*.026)
    const twist=(ny+.3)*(.16+(seeded(seed,12)-.5)*.12)
    const cos=Math.cos(twist),sin=Math.sin(twist),tx=x*cos-z*sin,tz=x*sin+z*cos
    x=tx+.13*ny+(seeded(seed,4)-.5)*.12
    z=tz
    let y=ny*(.82+(family%3)*.075)+.11*Math.sin(nx*3.8+nz*2.4+seed*.09)*crown
    y-=lower*(.34+.18*lower)
    y-=.46
    position.setXYZ(index,x,y,z)
    const height=THREE.MathUtils.clamp((y+.72)/1.45,0,1)
    const seam=THREE.MathUtils.clamp(cleft*.72+Math.abs(scar)*.9,0,1)
    const color=deep.clone().lerp(mineral,.24+.50*height).lerp(memory,(active?.18:.055)+seam*(active?.17:.055))
    colors.push(color.r,color.g,color.b)
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function wornLineageTrailGeometry(){
  const rows=150,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const earth=new THREE.Color('#45473d'),worn=new THREE.Color('#9a8367'),lichen=new THREE.Color('#718176')
  for(let row=0;row<=rows;row++){
    const t=row/rows,z=6.2-t*44.9,center=.58*Math.sin((z+5.5)*.17)+.18*Math.sin(z*.51),irregular=.035*Math.sin(row*1.91)+.025*Math.sin(row*.47),width=.27+.10*(1-t)+.055*Math.sin(t*Math.PI*7.2)+irregular
    for(const side of [-1,1] as const){
      const edgeNoise=.045*Math.sin(row*2.37+side*1.4),x=center+side*Math.max(.17,width+edgeNoise),y=lifeMapTerrainHeight(x,z)+.055+.012*Math.sin(row*1.7+side)
      positions.push(x,y,z)
      const age=.5+.5*Math.sin(t*17.3+side*.8),color=earth.clone().lerp(worn,.48+age*.22).lerp(lichen,.08+.12*(1-t));colors.push(color.r,color.g,color.b)
    }
  }
  for(let row=0;row<rows;row++){const a=row*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function sanctuaryFloorGeometry(point:Point3,accent:string){
  const geometry=new THREE.CylinderGeometry(4.8,5.35,.42,56,6,false)
  const position=geometry.getAttribute('position') as THREE.BufferAttribute
  const colors:number[]=[]
  const shadow=new THREE.Color('#22312a'),stone=new THREE.Color('#69786a'),history=new THREE.Color(accent)
  for(let index=0;index<position.count;index++){
    const x=position.getX(index),y0=position.getY(index),z=position.getZ(index),radius=Math.hypot(x,z)/5.35
    const terrain=lifeMapTerrainHeight(point[0]+x,point[2]+z)-point[1]
    const weather=.07*Math.sin(x*1.35+z*.91)+.035*Math.cos(x*3.7-z*2.1)
    const bank=Math.pow(THREE.MathUtils.clamp(radius-.48,0,.52)/.52,1.35)*.74
    const y=y0>0?terrain+.08+weather+bank:terrain-.34+weather*.25
    position.setY(index,y)
    const edge=THREE.MathUtils.clamp(radius,0,1),color=shadow.clone().lerp(stone,.34+.42*edge).lerp(history,.028+.055*(1-edge));colors.push(color.r,color.g,color.b)
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry
}

function sanctuaryParticles(seed:number){const count=96,positions=new Float32Array(count*3);for(let index=0;index<count;index++){const angle=index*2.39996323+seeded(seed,index)*.42,radius=.9+Math.sqrt((index+.5)/count)*3.4;positions.set([Math.cos(angle)*radius,-.14+seeded(seed+index,18)*1.35,Math.sin(angle)*radius*.72],index*3)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));return geometry}

function RetireRejectedLifeMapVisuals(){
  const {scene}=useThree()
  const hidden=useRef(new Set<THREE.Object3D>())
  useFrame(()=>{scene.traverse((object)=>{if(!RETIRED_VISUAL_GROUPS.has(object.name)||!object.visible)return;object.visible=false;hidden.current.add(object)})})
  useEffect(()=>()=>{hidden.current.forEach((object)=>{object.visible=true});hidden.current.clear()},[])
  return null
}

function MemoryOutcrop({node,index,active,reducedMotion,onSelect,arrival}:{node:LifeMapNode;index:number;active:boolean;reducedMotion:boolean;onSelect:(node:LifeMapNode)=>void;arrival:boolean}){
  const root=useRef<THREE.Group>(null),seed=nodeSeed(node,index),point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]),geometry=useMemo(()=>weatheredOutcropGeometry(seed,node.aura,active),[active,node.aura,seed])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(({clock})=>{if(!root.current||reducedMotion||!active)return;root.current.rotation.y=Math.sin(clock.elapsedTime*.16+seed)*.014;const breath=1+Math.sin(clock.elapsedTime*.52+seed*.07)*.006;root.current.scale.setScalar(breath*(arrival?1.34:1))})
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(node)}
  const scale=arrival&&active?1.34:1
  return <group ref={root} position={point} scale={scale} rotation={[0,seeded(seed,22)*Math.PI*2,0]} name={`life-map-v239-memory-site-${node.id}`} userData={{artRevision:'v239-rooted-closed-weathered-memory-site',semanticNode:node.id}} onClick={activate}><mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors color="#9ba89a" emissive={node.aura} emissiveIntensity={active?.085:.012} roughness={.96} metalness={0}/></mesh><pointLight position={[0,.18,0]} color={node.aura} intensity={active?1.15:.10} distance={active?5.1:2.1} decay={2}/></group>
}

function SelectedSanctuary({node,index,reducedMotion}:{node:LifeMapNode;index:number;reducedMotion:boolean}){
  const point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]),floor=useMemo(()=>sanctuaryFloorGeometry(point,node.aura),[node.aura,point]),particles=useMemo(()=>sanctuaryParticles(nodeSeed(node,index)),[index,node])
  useEffect(()=>()=>{floor.dispose();particles.dispose()},[floor,particles])
  return <group position={point} name="life-map-v239-intimate-memory-sanctuary" userData={{scaleMode:'intimate',visualIntent:'rooted-weathered-memory-place-no-tubes-no-rings'}}><mesh geometry={floor} castShadow receiveShadow><meshStandardMaterial vertexColors color="#879486" emissive="#1c3029" emissiveIntensity={.12} roughness={.98} metalness={0}/></mesh><points geometry={particles}><pointsMaterial color={node.aura} size={.028} transparent opacity={reducedMotion?.28:.38} depthWrite={false} sizeAttenuation/></points><pointLight position={[-1.8,1.2,.8]} color={node.aura} intensity={1.35} distance={7.4} decay={2}/><pointLight position={[2.2,.7,-1.5]} color="#d6d0b7" intensity={.64} distance={6.2} decay={2}/></group>
}

export function LifeMapGoldMasterOverlay({nodes,selected,phase,reducedMotion,onSelect}:Props){
  const {size}=useThree(),portrait=size.height>size.width,stage=lifeMapStage(Boolean(selected),portrait),trail=useMemo(wornLineageTrailGeometry,[])
  useEffect(()=>()=>trail.dispose(),[trail])
  const selectedIndex=selected?Math.max(0,nodes.findIndex((node)=>node.id===selected.id)):-1,arrival=Boolean(selected&&phase==='arrival')
  const visibleNodes=arrival&&selected?[selected]:nodes
  return <><RetireRejectedLifeMapVisuals/><group name="life-map-v239-gold-master-world" scale={stage.scale} position={stage.position} userData={{artRevision:'v239-rooted-volumetric-memory-geography-gold-master-candidate'}}><mesh geometry={trail} receiveShadow name="life-map-v239-eroded-lineage-footpath"><meshStandardMaterial vertexColors color="#8d806b" roughness={1} metalness={0}/></mesh><group name="life-map-v239-grounded-memory-sites">{visibleNodes.map((node)=>{const index=Math.max(0,nodes.findIndex((candidate)=>candidate.id===node.id));return <MemoryOutcrop key={node.id} node={node} index={index} active={selected?.id===node.id} arrival={arrival} reducedMotion={reducedMotion} onSelect={onSelect}/>})}</group>{arrival&&selected?<SelectedSanctuary node={selected} index={selectedIndex} reducedMotion={reducedMotion}/>:null}</group></>
}
