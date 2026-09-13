'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { LifeMapNode } from './lifeMapData'
import { lifeMapLocalPoint, lifeMapStage, lifeMapTerrainHeight } from './lifeMapSpatialLayout'
import type { LifeMapJourneyPhase } from './LifeMapProductionWorld'

type Point3 = [number, number, number]
type Props = { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }
type RaycastFn = THREE.Object3D['raycast']

const RETIRED_VISUAL_GROUPS = new Set([
  'life-map-v237-worn-lineage-path','life-map-memory-artifact-families','life-map-curved-semantic-paths','life-map-authored-chapter-regions','life-map-selected-arrival-sanctuary',
  'life-map-foreground-observatory','life-map-relationship-observatory','life-map-goal-horizon','life-map-achievement-monument',
  'life-map-v249-personal-universe-geography','life-map-v249-grounded-memory-places','life-map-v249-contextual-memory-sanctuary',
])

function seeded(seed:number,salt:number){const value=Math.sin(seed*91.317+salt*17.731)*43758.5453123;return value-Math.floor(value)}
function nodeSeed(node:LifeMapNode,index:number){return node.id.split('').reduce((sum,character)=>sum+character.charCodeAt(0),0)+index*37}

function memorySanctuaryGeometry(seed:number,accent:string,active:boolean){
  const geometry=new THREE.SphereGeometry(1,48,30)
  const position=geometry.getAttribute('position') as THREE.BufferAttribute
  const colors:number[]=[]
  const earth=new THREE.Color('#29362f'),mineral=new THREE.Color('#6f7c71'),moss=new THREE.Color('#53675c'),memory=new THREE.Color(accent)
  for(let index=0;index<position.count;index++){
    const nx=position.getX(index),ny=position.getY(index),nz=position.getZ(index)
    const angle=Math.atan2(nz,nx)
    const radial=Math.sqrt(nx*nx+nz*nz)
    const rim=Math.pow(THREE.MathUtils.clamp(radial,0,1),2.2)
    const basin=Math.exp(-(radial*radial)/.20)
    const cleft=Math.exp(-((nx*.72+nz*.34-.08)**2)/.055)*Math.max(0,.4+ny)
    const weather=.07*Math.sin(angle*(3+(seed%3))+seed*.071)+.035*Math.sin(nx*11+nz*9+seed*.13)
    const shoulder=active?.12*Math.exp(-(((nx-.42)/.34)**2+((nz+.08)/.46)**2)):0
    const recess=active?.10*Math.exp(-(((nx+.38)/.30)**2+((nz-.16)/.38)**2)):0
    const spread=active?1.26:1
    const x=nx*(1+weather+shoulder-recess)*spread
    const z=nz*(1+weather*.7)*(.90*spread)
    const dome=Math.max(0,1-radial*radial)
    const y=-.68 + dome*(active?.34:.20) - rim*.13 - cleft*.16 + basin*(active?.055:.015)
    position.setXYZ(index,x,y,z)
    const memoryWeight=(active?.12:.025)+(active?.18:.04)*THREE.MathUtils.clamp(cleft+basin*.32,0,1)
    const color=earth.clone().lerp(mineral,.24+.34*dome).lerp(moss,.12+.13*(1-dome)).lerp(memory,memoryWeight)
    colors.push(color.r,color.g,color.b)
  }
  position.needsUpdate=true
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry
}

function memoryRootGeometry(point:Point3,seed:number,accent:string,active:boolean){
  const positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const earth=new THREE.Color('#3a443d'),worn=new THREE.Color('#8a7965'),memory=new THREE.Color(accent)
  let base=0
  const branches=active?5:3
  for(let branch=0;branch<branches;branch++){
    const segments=16,angle=seeded(seed,40+branch)*Math.PI*2,length=(active?2.0:1.25)+seeded(seed,55+branch)*(active?1.2:.7),normalX=-Math.sin(angle),normalZ=Math.cos(angle)
    for(let step=0;step<=segments;step++){
      const t=step/segments,bend=Math.sin(t*Math.PI)*(seeded(seed,80+branch)-.5)*.42
      const cx=Math.cos(angle)*length*t+normalX*bend,cz=Math.sin(angle)*length*t+normalZ*bend,width=(active?.075:.05)*(1-.58*t)
      for(const side of [-1,1] as const){
        const x=cx+normalX*width*side,z=cz+normalZ*width*side,worldX=point[0]+x,worldZ=point[2]+z
        const y=lifeMapTerrainHeight(worldX,worldZ)-point[1]+.05+.006*Math.sin(step*1.5+side)
        positions.push(x,y,z)
        const color=earth.clone().lerp(worn,.46+.26*(1-t)).lerp(memory,(active?.10:.035)*(1-t))
        colors.push(color.r,color.g,color.b)
      }
    }
    for(let step=0;step<segments;step++){const a=base+step*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d)}
    base+=(segments+1)*2
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function wornLineageTrailGeometry(){
  const rows=150,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const earth=new THREE.Color('#4f4a3d'),worn=new THREE.Color('#b28f68'),lichen=new THREE.Color('#758a79')
  for(let row=0;row<=rows;row++){
    const t=row/rows,z=6.2-t*44.9,center=.58*Math.sin((z+5.5)*.17)+.18*Math.sin(z*.51),width=.34+.12*(1-t)+.06*Math.sin(t*Math.PI*7.2)
    for(const side of [-1,1] as const){
      const x=center+side*Math.max(.21,width+.035*Math.sin(row*2.37+side)),y=lifeMapTerrainHeight(x,z)+.06
      positions.push(x,y,z)
      const color=earth.clone().lerp(worn,.58+.18*Math.sin(t*13+side)).lerp(lichen,.08+.10*(1-t));colors.push(color.r,color.g,color.b)
    }
  }
  for(let row=0;row<rows;row++){const a=row*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function sanctuaryParticles(seed:number){
  const count=150,positions=new Float32Array(count*3)
  for(let index=0;index<count;index++){
    const angle=index*2.39996323+seeded(seed,index)*.42,radius=.45+Math.sqrt((index+.5)/count)*2.1
    positions.set([Math.cos(angle)*radius,-.10+seeded(seed+index,18)*1.05,Math.sin(angle)*radius*.74],index*3)
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));return geometry
}

function RetireRejectedLifeMapVisuals(){
  const {scene}=useThree();const hidden=useRef(new Set<THREE.Object3D>()),raycasts=useRef(new Map<THREE.Object3D,RaycastFn>())
  useFrame(()=>{scene.traverse((object)=>{
    if(!RETIRED_VISUAL_GROUPS.has(object.name)||!object.visible)return
    object.visible=false
    if(!raycasts.current.has(object))raycasts.current.set(object,object.raycast)
    object.raycast=()=>undefined
    object.traverse((child)=>{if(!raycasts.current.has(child))raycasts.current.set(child,child.raycast);child.raycast=()=>undefined})
    hidden.current.add(object)
  })})
  useEffect(()=>()=>{hidden.current.forEach((object)=>{object.visible=true});raycasts.current.forEach((raycast,object)=>{object.raycast=raycast});hidden.current.clear();raycasts.current.clear()},[])
  return null
}

function MemorySanctuary({node,index,active,reducedMotion,onSelect,arrival}:{node:LifeMapNode;index:number;active:boolean;reducedMotion:boolean;onSelect:(node:LifeMapNode)=>void;arrival:boolean}){
  const root=useRef<THREE.Group>(null),seed=nodeSeed(node,index),point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node])
  const geometry=useMemo(()=>memorySanctuaryGeometry(seed,node.aura,active),[active,node.aura,seed]),roots=useMemo(()=>memoryRootGeometry(point,seed,node.aura,active),[active,node.aura,point,seed])
  useEffect(()=>()=>{geometry.dispose();roots.dispose()},[geometry,roots])
  useFrame(({clock})=>{if(!root.current||reducedMotion||!active)return;root.current.rotation.y=Math.sin(clock.elapsedTime*.13+seed)*.008})
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(node)}
  const scale=active?(arrival?1.12:1.02):(arrival?.66:.74)
  return <group position={point} name={`life-map-v250-memory-place-${node.id}`} userData={{artRevision:'v250-readable-memory-geography',visualRepair:'low-wide-memory-sanctuaries-preserve-context-and-never-become-monoliths',semanticNode:node.id}} onClick={activate}>
    <mesh geometry={roots} receiveShadow><meshStandardMaterial vertexColors color="#8c806d" roughness={1} metalness={0}/></mesh>
    <group ref={root} position={[0,active?-.03:-.12,0]} scale={[scale,active?.78:.58,scale*.92]} rotation={[0,seeded(seed,22)*Math.PI*2,0]}>
      <mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors color={active?'#81958a':'#5d6f64'} emissive={node.aura} emissiveIntensity={active?.055:.008} roughness={.96} metalness={0}/></mesh>
    </group>
    <pointLight position={[0,active?.32:.08,0]} color={node.aura} intensity={active?.22:.035} distance={active?3.0:1.35} decay={2}/>
  </group>
}

function SelectedSanctuary({node,index,reducedMotion}:{node:LifeMapNode;index:number;reducedMotion:boolean}){
  const point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]),particles=useMemo(()=>sanctuaryParticles(nodeSeed(node,index)),[index,node])
  useEffect(()=>()=>particles.dispose(),[particles])
  return <group position={[point[0],point[1]-.08,point[2]]} name="life-map-v250-contextual-memory-sanctuary" userData={{scaleMode:'intimate-with-context',visualIntent:'selected-memory-glows-within-surrounding-personal-geography'}}>
    <points geometry={particles}><pointsMaterial color={node.aura} size={.026} transparent opacity={reducedMotion?.18:.26} depthWrite={false} sizeAttenuation/></points>
    <pointLight position={[-1.0,.68,.6]} color={node.aura} intensity={.24} distance={3.8} decay={2}/><pointLight position={[1.25,.42,-.8]} color="#e2d0ad" intensity={.16} distance={3.5} decay={2}/>
  </group>
}

export function LifeMapGoldMasterOverlay({nodes,selected,phase,reducedMotion,onSelect}:Props){
  const {size}=useThree(),portrait=size.height>size.width,stage=lifeMapStage(Boolean(selected),portrait),trail=useMemo(wornLineageTrailGeometry,[])
  useEffect(()=>()=>trail.dispose(),[trail])
  const selectedIndex=selected?Math.max(0,nodes.findIndex((node)=>node.id===selected.id)):-1,arrival=Boolean(selected&&phase==='arrival')
  return <><RetireRejectedLifeMapVisuals/><group name="life-map-v250-personal-universe-geography" scale={stage.scale} position={stage.position} userData={{artRevision:'v250-readable-personal-universe',visualRepair:'surrounding-geography-remains-visible-through-selection-and-arrival'}}>
    <mesh geometry={trail} receiveShadow name="life-map-v250-eroded-lineage-footpath"><meshStandardMaterial vertexColors color="#a58d6f" emissive="#31251b" emissiveIntensity={.08} roughness={1} metalness={0}/></mesh>
    <group name="life-map-v250-grounded-memory-places">{nodes.map((node,index)=><MemorySanctuary key={node.id} node={node} index={index} active={selected?.id===node.id} arrival={arrival} reducedMotion={reducedMotion} onSelect={onSelect}/>)}</group>
    {arrival&&selected?<SelectedSanctuary node={selected} index={selectedIndex} reducedMotion={reducedMotion}/>:null}
  </group></>
}
