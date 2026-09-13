'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { LifeMapNode } from './lifeMapData'
import { lifeMapLocalPoint, lifeMapStage, lifeMapTerrainHeight } from './lifeMapSpatialLayout'
import type { LifeMapJourneyPhase } from './LifeMapProductionWorld'

type Props={nodes:LifeMapNode[];selected:LifeMapNode|null;phase:LifeMapJourneyPhase;reducedMotion:boolean;onSelect:(node:LifeMapNode)=>void}
type Point3=[number,number,number]
type RaycastFn=THREE.Object3D['raycast']

const RETIRED_VISUAL_GROUPS=new Set([
  'life-map-v237-worn-lineage-path','life-map-memory-artifact-families','life-map-curved-semantic-paths','life-map-authored-chapter-regions','life-map-selected-arrival-sanctuary',
  'life-map-foreground-observatory','life-map-relationship-observatory','life-map-goal-horizon','life-map-achievement-monument',
])

function seeded(seed:number,salt:number){const value=Math.sin(seed*91.317+salt*17.731)*43758.5453123;return value-Math.floor(value)}
function nodeSeed(node:LifeMapNode,index:number){return node.id.split('').reduce((sum,character)=>sum+character.charCodeAt(0),0)+index*37}

function memoryBody(seed:number,aura:string,active:boolean){
  const geometry=new THREE.SphereGeometry(1,48,36)
  const position=geometry.getAttribute('position') as THREE.BufferAttribute
  const colors=new Float32Array(position.count*3)
  const deep=new THREE.Color('#203331'),mid=new THREE.Color('#6f8d83'),warm=new THREE.Color('#d8b28a'),accent=new THREE.Color(aura)
  for(let index=0;index<position.count;index++){
    const nx=position.getX(index),ny=position.getY(index),nz=position.getZ(index),angle=Math.atan2(nz,nx)
    const upper=THREE.MathUtils.smoothstep(ny,-.05,.92),lower=THREE.MathUtils.smoothstep(-ny,.10,.98)
    const cleft=Math.exp(-((nx/.23)**2))*THREE.MathUtils.smoothstep(ny,.18,.96)
    const lobeA=Math.exp(-(((nx+.32)/.40)**2+((ny-.40)/.48)**2)),lobeB=Math.exp(-(((nx-.30)/.42)**2+((ny-.36)/.50)**2))
    const skin=.032*Math.sin(angle*5.2+ny*8.0+seed*.017)+.014*Math.sin(angle*10.1-ny*12.2)
    const taper=THREE.MathUtils.lerp(.40,1,THREE.MathUtils.smoothstep(ny,-.96,.12))
    let x=nx*(.68+.05*(seed%4))*taper*(1+skin+.10*lobeA+.07*lobeB)
    let z=nz*(.55+.03*((seed+2)%4))*taper*(1+skin*.65)
    let y=ny*(active?.96:.82)+.10*lobeA+.06*lobeB-.22*cleft-lower*.16
    x+=upper*.045
    const twist=(ny+.12)*(.08+(seeded(seed,12)-.5)*.13),cos=Math.cos(twist),sin=Math.sin(twist)
    const tx=x*cos-z*sin,tz=x*sin+z*cos
    position.setXYZ(index,tx,y,tz)
    const altitude=THREE.MathUtils.clamp((y+1.05)/2.1,0,1),fissure=THREE.MathUtils.clamp(cleft*.78+Math.abs(skin)*5.4,0,1)
    const color=deep.clone().lerp(mid,.28+.42*altitude).lerp(warm,.08+.18*upper).lerp(accent,(active?.16:.07)+fissure*(active?.30:.16))
    colors.set([color.r,color.g,color.b],index*3)
  }
  position.needsUpdate=true
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry
}

function rootTubes(seed:number,active:boolean){
  return Array.from({length:active?7:4},(_,index)=>{
    const angle=(Math.PI*2*index)/(active?7:4)+seeded(seed,60+index)*.34,length=(active?1.25:.72)+seeded(seed,70+index)*(active?.46:.24)
    const points=[new THREE.Vector3(0,-.44,0),new THREE.Vector3(Math.cos(angle)*length*.35,-.55,Math.sin(angle)*length*.35),new THREE.Vector3(Math.cos(angle+.12)*length*.72,-.60,Math.sin(angle+.12)*length*.72),new THREE.Vector3(Math.cos(angle-.08)*length,-.62,Math.sin(angle-.08)*length)]
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,active?.020:.011,6,false)
  })
}

function motesGeometry(seed:number,active:boolean){
  const count=active?86:28,positions=new Float32Array(count*3)
  for(let index=0;index<count;index++){
    const angle=index*2.39996323+seeded(seed,index)*.5,radius=.38+Math.sqrt((index+.5)/count)*(active?1.35:.78)
    positions.set([Math.cos(angle)*radius,-.18+seeded(seed+index,17)*(active?1.55:.82),Math.sin(angle)*radius*.70],index*3)
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));return geometry
}

function overviewSkyGeometry(){
  const count=260,positions=new Float32Array(count*3),colors=new Float32Array(count*3),cool=new THREE.Color('#8fc6c0'),warm=new THREE.Color('#e2b88a')
  for(let index=0;index<count;index++){
    const depth=index/(count-1),band=index%6,z=5-depth*47+(band-3)*.42,x=(seeded(index,31)-.5)*(18-band*.7),y=lifeMapTerrainHeight(x,z)+.8+seeded(index,32)*5.8
    positions.set([x,y,z],index*3);const color=cool.clone().lerp(warm,seeded(index,33));colors.set([color.r,color.g,color.b],index*3)
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry
}

function trailGeometry(){
  const rows=130,positions:number[]=[],colors:number[]=[],indices:number[]=[],earth=new THREE.Color('#45493f'),worn=new THREE.Color('#a98b68')
  for(let row=0;row<=rows;row++){
    const t=row/rows,z=6-t*44,center=.52*Math.sin((z+4)*.17),width=.30+.08*Math.sin(t*Math.PI*6)
    for(const side of [-1,1] as const){const x=center+side*width,y=lifeMapTerrainHeight(x,z)+.055;positions.push(x,y,z);const color=earth.clone().lerp(worn,.48+.24*(1-t));colors.push(color.r,color.g,color.b)}
  }
  for(let row=0;row<rows;row++){const a=row*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function RetireRejectedLifeMapVisuals(){
  const {scene}=useThree()
  const hidden=useRef(new Set<THREE.Object3D>())
  const raycasts=useRef(new Map<THREE.Object3D,RaycastFn>())
  useFrame(()=>{scene.traverse((object)=>{
    if(!RETIRED_VISUAL_GROUPS.has(object.name)||!object.visible)return
    object.visible=false
    if(!raycasts.current.has(object))raycasts.current.set(object,object.raycast)
    object.raycast=()=>undefined
    object.traverse((child)=>{if(!raycasts.current.has(child))raycasts.current.set(child,child.raycast);child.raycast=()=>undefined})
    hidden.current.add(object)
  })})
  useEffect(()=>()=>{
    hidden.current.forEach((object)=>{object.visible=true})
    raycasts.current.forEach((raycast,object)=>{object.raycast=raycast})
    hidden.current.clear();raycasts.current.clear()
  },[])
  return null
}

function MemoryPlace({node,index,active,reducedMotion,onSelect,arrival}:{node:LifeMapNode;index:number;active:boolean;reducedMotion:boolean;onSelect:(node:LifeMapNode)=>void;arrival:boolean}){
  const root=useRef<THREE.Group>(null),seed=nodeSeed(node,index),point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node])
  const body=useMemo(()=>memoryBody(seed,node.aura,active),[active,node.aura,seed]),roots=useMemo(()=>rootTubes(seed,active),[active,seed]),motes=useMemo(()=>motesGeometry(seed,active),[active,seed])
  useEffect(()=>()=>{body.dispose();roots.forEach((geometry)=>geometry.dispose());motes.dispose()},[body,motes,roots])
  useFrame(({clock})=>{if(!root.current||reducedMotion)return;root.current.rotation.y=(seeded(seed,22)-.5)*.45+Math.sin(clock.elapsedTime*.16+seed)*.028})
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(node)}
  const scale=active?(arrival?.82:.74):(arrival?.46:.54),lift=active?(arrival?.72:.60):(arrival?.18:.26)
  return <group position={point} name={`life-map-v254-memory-place-${node.id}`} userData={{artRevision:'v254-luminous-memory-geography',visualRepair:'all-sites-remain-grounded-geography-selected-site-rises-without-isolating-context',semanticNode:node.id}} onClick={activate}>
    <group ref={root} position={[0,lift,0]} scale={scale}>
      <mesh geometry={body} castShadow receiveShadow><meshStandardMaterial vertexColors color="#ffffff" emissive={node.aura} emissiveIntensity={active?.32:.12} roughness={.58} metalness={0}/></mesh>
      {roots.map((geometry,rootIndex)=><mesh key={rootIndex} geometry={geometry} raycast={()=>null}><meshStandardMaterial color={rootIndex%2?'#ddb184':node.aura} emissive={node.aura} emissiveIntensity={active?.28:.10} roughness={.72} transparent opacity={active?.68:.40}/></mesh>)}
      <points geometry={motes} raycast={()=>null}><pointsMaterial color={node.aura} size={active?.050:.032} transparent opacity={active?.72:.44} depthWrite={false} sizeAttenuation/></points>
      <pointLight position={[0,.42,.32]} color={node.aura} intensity={active?1.35:.32} distance={active?5.8:3.2} decay={2}/>
    </group>
  </group>
}

function SelectedSanctuary({node,index,reducedMotion}:{node:LifeMapNode;index:number;reducedMotion:boolean}){
  const point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node])
  const branches=useMemo(()=>Array.from({length:10},(_,branch)=>{const side=branch%2?-1:1,offset=Math.floor(branch/2),points=[new THREE.Vector3(side*1.6,-.30,-1.0),new THREE.Vector3(side*(1.18-offset*.06),.18+offset*.10,-.62),new THREE.Vector3(side*(.70-offset*.035),.88+offset*.11,-.08),new THREE.Vector3(side*(.34-offset*.018),1.52+offset*.08,.40)];return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),38,.015+(branch%3)*.003,6,false)}),[])
  useEffect(()=>()=>branches.forEach((geometry)=>geometry.dispose()),[branches])
  return <group position={[point[0],point[1]+.04,point[2]]} name="life-map-v254-contextual-memory-sanctuary" userData={{visualOnly:true,interactionOwner:false,scaleMode:'intimate-with-context'}}>
    {branches.map((geometry,branch)=><mesh key={branch} geometry={geometry} raycast={()=>null}><meshStandardMaterial color={branch%2?node.aura:'#e5d3ad'} emissive={node.aura} emissiveIntensity={.34} roughness={.62} transparent opacity={reducedMotion?.42:.60}/></mesh>)}
    <pointLight position={[-1,1,.7]} color={node.aura} intensity={1.0} distance={6.6} decay={2}/><pointLight position={[1.2,.7,-.7]} color="#ddb184" intensity={.62} distance={5.8} decay={2}/>
  </group>
}

export function LifeMapGoldMasterOverlay({nodes,selected,phase,reducedMotion,onSelect}:Props){
  const {size}=useThree(),portrait=size.height>size.width,stage=lifeMapStage(Boolean(selected),portrait),trail=useMemo(trailGeometry,[]),sky=useMemo(overviewSkyGeometry,[])
  useEffect(()=>()=>{trail.dispose();sky.dispose()},[sky,trail])
  const selectedIndex=selected?Math.max(0,nodes.findIndex((node)=>node.id===selected.id)):-1,arrival=Boolean(selected&&phase==='arrival')
  return <><RetireRejectedLifeMapVisuals/><group name="life-map-v249-personal-universe-geography" scale={stage.scale} position={stage.position} userData={{artRevision:'v254-luminous-personal-universe',visualRepair:'surrounding-geography-remains-visible-through-selection-and-arrival'}}>
    <mesh geometry={trail} receiveShadow name="life-map-v254-lineage-footpath"><meshStandardMaterial vertexColors color="#b6a489" emissive="#62513f" emissiveIntensity={.07} roughness={.93}/></mesh>
    <points geometry={sky} raycast={()=>null} name="life-map-v254-personal-memory-sky"><pointsMaterial vertexColors size={.046} transparent opacity={.62} depthWrite={false} sizeAttenuation/></points>
    <group name="life-map-v249-grounded-memory-places" userData={{visualRepair:'all-sites-remain-grounded-geography-selected-site-rises-without-isolating-context'}}>{nodes.map((node)=>{const index=Math.max(0,nodes.findIndex((candidate)=>candidate.id===node.id));return <MemoryPlace key={node.id} node={node} index={index} active={selected?.id===node.id} arrival={arrival} reducedMotion={reducedMotion} onSelect={onSelect}/>})}</group>
    {arrival&&selected?<SelectedSanctuary node={selected} index={selectedIndex} reducedMotion={reducedMotion}/>:null}
  </group></>
}
