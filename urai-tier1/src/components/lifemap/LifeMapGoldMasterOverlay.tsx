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
  const geometry=new THREE.SphereGeometry(1,48,34)
  const position=geometry.getAttribute('position') as THREE.BufferAttribute
  const colors:number[]=[]
  const deep=new THREE.Color('#17231f'),mineral=new THREE.Color('#7f897b'),lichen=new THREE.Color('#596b5d'),memory=new THREE.Color(accent)
  const family=seed%5
  const axisX=[1.28,.86,1.42,.96,1.16][family]
  const axisY=[.68,1.08,.74,.92,.82][family]
  const axisZ=[.86,1.02,.72,1.26,.94][family]
  const bias=(seeded(seed,31)-.5)*.38
  for(let index=0;index<position.count;index++){
    const nx=position.getX(index),ny=position.getY(index),nz=position.getZ(index)
    const azimuth=Math.atan2(nz,nx), crown=Math.max(0,ny), lower=Math.max(0,-ny)
    const coarse=.16*Math.sin(azimuth*(2+(family%3))+ny*3.1+seed*.071)
    const middle=.09*Math.cos(azimuth*5.4-ny*5.8+seed*.113)
    const fine=.045*Math.sin(nx*11.3+nz*8.1+ny*7.7+seed*.021)
    const cleft=Math.exp(-((nx*.86+nz*.34-.05)**2)/.038)*Math.pow(crown,1.45)
    const sideDent=Math.exp(-(((nx-bias)*.82)**2+(nz+.18)**2)/.16)*(.35+.65*crown)
    const shoulder=Math.exp(-(((nx+bias*.7)*.72)**2+(nz-.42)**2)/.20)*Math.max(0,.65+ny)
    const radial=1+coarse+middle+fine-.24*cleft-.15*sideDent+.10*shoulder
    let x=nx*radial*axisX
    let z=nz*radial*axisZ
    const twist=(ny+.25)*(.18+(seeded(seed,12)-.5)*.18)
    const cos=Math.cos(twist),sin=Math.sin(twist),tx=x*cos-z*sin,tz=x*sin+z*cos
    x=tx+.20*ny+bias*.18
    z=tz+.07*Math.sin(ny*5.2+seed)
    let y=ny*axisY+.12*Math.sin(nx*4.1+nz*3.3+seed*.09)*crown-.11*sideDent
    y-=lower*(.30+.22*lower)
    y-=.43
    position.setXYZ(index,x,y,z)
    const height=THREE.MathUtils.clamp((y+.78)/1.55,0,1)
    const scar=THREE.MathUtils.clamp(cleft*.9+sideDent*.45+Math.abs(middle)*2.2,0,1)
    const color=deep.clone().lerp(mineral,.20+.48*height).lerp(lichen,.12+.12*(1-height)).lerp(memory,(active?.12:.035)+scar*(active?.11:.025))
    colors.push(color.r,color.g,color.b)
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry
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

function sanctuaryParticles(seed:number){const count=128,positions=new Float32Array(count*3);for(let index=0;index<count;index++){const angle=index*2.39996323+seeded(seed,index)*.42,radius=.65+Math.sqrt((index+.5)/count)*2.45;positions.set([Math.cos(angle)*radius,-.22+seeded(seed+index,18)*1.65,Math.sin(angle)*radius*.68],index*3)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));return geometry}

function RetireRejectedLifeMapVisuals(){
  const {scene}=useThree();const hidden=useRef(new Set<THREE.Object3D>())
  useFrame(()=>{scene.traverse((object)=>{if(!RETIRED_VISUAL_GROUPS.has(object.name)||!object.visible)return;object.visible=false;hidden.current.add(object)})})
  useEffect(()=>()=>{hidden.current.forEach((object)=>{object.visible=true});hidden.current.clear()},[])
  return null
}

function MemoryOutcrop({node,index,active,reducedMotion,onSelect,arrival}:{node:LifeMapNode;index:number;active:boolean;reducedMotion:boolean;onSelect:(node:LifeMapNode)=>void;arrival:boolean}){
  const root=useRef<THREE.Group>(null),seed=nodeSeed(node,index),point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]),geometry=useMemo(()=>weatheredOutcropGeometry(seed,node.aura,active),[active,node.aura,seed])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(({clock})=>{if(!root.current||reducedMotion||!active)return;root.current.rotation.y=Math.sin(clock.elapsedTime*.14+seed)*.010;const breath=1+Math.sin(clock.elapsedTime*.46+seed*.07)*.004;root.current.scale.setScalar(breath*(arrival?1.08:1))})
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(node)}
  const scale=arrival&&active?1.08:1
  return <group ref={root} position={point} scale={scale} rotation={[0,seeded(seed,22)*Math.PI*2,0]} name={`life-map-v240-memory-site-${node.id}`} userData={{artRevision:'v240-rooted-scarred-asymmetric-memory-site',semanticNode:node.id}} onClick={activate}><mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors color="#899487" emissive={node.aura} emissiveIntensity={active?.045:.006} roughness={.98} metalness={0}/></mesh><pointLight position={[0,.12,0]} color={node.aura} intensity={active?.54:.05} distance={active?4.0:1.6} decay={2}/></group>
}

function SelectedSanctuary({node,index,reducedMotion}:{node:LifeMapNode;index:number;reducedMotion:boolean}){
  const point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]),particles=useMemo(()=>sanctuaryParticles(nodeSeed(node,index)),[index,node])
  useEffect(()=>()=>particles.dispose(),[particles])
  return <group position={point} name="life-map-v240-intimate-memory-sanctuary" userData={{scaleMode:'intimate',visualIntent:'existing-terrain-remains-authority-no-platform-no-ring'}}><points geometry={particles}><pointsMaterial color={node.aura} size={.024} transparent opacity={reducedMotion?.20:.30} depthWrite={false} sizeAttenuation/></points><pointLight position={[-1.1,.9,.6]} color={node.aura} intensity={.72} distance={5.2} decay={2}/><pointLight position={[1.4,.55,-.9]} color="#d6d0b7" intensity={.28} distance={4.4} decay={2}/></group>
}

export function LifeMapGoldMasterOverlay({nodes,selected,phase,reducedMotion,onSelect}:Props){
  const {size}=useThree(),portrait=size.height>size.width,stage=lifeMapStage(Boolean(selected),portrait),trail=useMemo(wornLineageTrailGeometry,[])
  useEffect(()=>()=>trail.dispose(),[trail])
  const selectedIndex=selected?Math.max(0,nodes.findIndex((node)=>node.id===selected.id)):-1,arrival=Boolean(selected&&phase==='arrival')
  const visibleNodes=arrival&&selected?[selected]:nodes
  return <><RetireRejectedLifeMapVisuals/><group name="life-map-v240-gold-master-world" scale={stage.scale} position={stage.position} userData={{artRevision:'v240-scarred-memory-geography-no-arrival-platform'}}><mesh geometry={trail} receiveShadow name="life-map-v240-eroded-lineage-footpath"><meshStandardMaterial vertexColors color="#8d806b" roughness={1} metalness={0}/></mesh><group name="life-map-v240-grounded-memory-sites">{visibleNodes.map((node)=>{const index=Math.max(0,nodes.findIndex((candidate)=>candidate.id===node.id));return <MemoryOutcrop key={node.id} node={node} index={index} active={selected?.id===node.id} arrival={arrival} reducedMotion={reducedMotion} onSelect={onSelect}/>})}</group>{arrival&&selected?<SelectedSanctuary node={selected} index={selectedIndex} reducedMotion={reducedMotion}/>:null}</group></>
}
