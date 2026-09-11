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
  const columns=34,rows=26,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const deep=new THREE.Color('#172824'),mineral=new THREE.Color('#64766c'),memory=new THREE.Color(accent),family=seed%5,skew=(seeded(seed,4)-.5)*.42,lobeAX=-.34+(seeded(seed,5)-.5)*.22,lobeAZ=-.10+(seeded(seed,6)-.5)*.22,lobeBX=.34+(seeded(seed,7)-.5)*.24,lobeBZ=.14+(seeded(seed,8)-.5)*.26
  for(let row=0;row<=rows;row++){const v=row/rows,z0=-1.02+v*2.04;for(let column=0;column<=columns;column++){const u=column/columns,x0=-1.42+u*2.84,edge=Math.pow(Math.sin(Math.PI*u)*Math.sin(Math.PI*v),.72),x=x0+.09*Math.sin(z0*3.1+seed*.13)*edge+skew*z0*.15,z=z0+.07*Math.sin(x0*4.7-seed*.09)*edge,a=Math.exp(-(((x-lobeAX)/(.68+family*.035))**2+((z-lobeAZ)/(.50+(4-family)*.028))**2)),b=Math.exp(-(((x-lobeBX)/(.62+(4-family)*.032))**2+((z-lobeBZ)/(.58+family*.024))**2)),ridge=.5+.5*Math.sin(x*(2.2+family*.27)+z*(3.5-family*.18)+seed*.17),cleft=Math.exp(-((x*.95+z*(.22+family*.045)-.05)**2)/.055)*Math.exp(-(x*x+z*z)/1.65),weather=.055*Math.sin(x*8.3+z*5.6+seed)+.028*Math.cos(x*13.1-z*9.4),relief=edge*((active?.16:.11)+.47*a+.35*b+.12*ridge-.18*cleft)+weather*edge,y=-.61+relief;positions.push(x,y,z);const peak=THREE.MathUtils.clamp((relief+.08)/.78,0,1),scar=THREE.MathUtils.clamp(cleft*.55+ridge*.14,0,1),color=deep.clone().lerp(mineral,.22+.48*peak).lerp(memory,(active?.24:.09)+scar*(active?.18:.08));colors.push(color.r,color.g,color.b)}}
  const stride=columns+1;for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){const a=row*stride+column,b=a+1,c=a+stride,d=c+1;if((row+column+seed)%2)indices.push(a,c,b,b,c,d);else indices.push(a,c,d,a,d,b)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function wornLineageTrailGeometry(){
  const rows=150,positions:number[]=[],colors:number[]=[],indices:number[]=[],earth=new THREE.Color('#303a34'),worn=new THREE.Color('#665a49'),lichen=new THREE.Color('#55645b')
  for(let row=0;row<=rows;row++){const t=row/rows,z=6.2-t*44.9,center=.58*Math.sin((z+5.5)*.17)+.18*Math.sin(z*.51),irregular=.035*Math.sin(row*1.91)+.025*Math.sin(row*.47),width=.31+.12*(1-t)+.07*Math.sin(t*Math.PI*7.2)+irregular;for(const side of [-1,1] as const){const edgeNoise=.055*Math.sin(row*2.37+side*1.4),x=center+side*Math.max(.20,width+edgeNoise),y=lifeMapTerrainHeight(x,z)+.032+.012*Math.sin(row*1.7+side);positions.push(x,y,z);const age=.5+.5*Math.sin(t*17.3+side*.8),color=earth.clone().lerp(worn,.28+age*.18).lerp(lichen,.10+.10*(1-t));colors.push(color.r,color.g,color.b)}}
  for(let row=0;row<rows;row++){const a=row*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function selectedSanctuaryGround(point:Point3,accent:string){
  const columns=42,rows=36,positions:number[]=[],colors:number[]=[],indices:number[]=[],shadow=new THREE.Color('#172620'),stone=new THREE.Color('#53645a'),history=new THREE.Color(accent)
  for(let row=0;row<=rows;row++){const v=row/rows,z=-4.3+v*8.6;for(let column=0;column<=columns;column++){const u=column/columns,x=-5.1+u*10.2,radius=Math.hypot(x/5.1,z/4.3),edge=THREE.MathUtils.smoothstep(radius,.42,1.04),bank=edge*(.38+.72*Math.pow(Math.max(0,radius-.42),1.4)),weather=.08*Math.sin(x*1.5+z*.84)+.035*Math.cos(x*4.6-z*2.7),worldY=lifeMapTerrainHeight(point[0]+x,point[2]+z),y=worldY-point[1]+.055+bank+weather*edge;positions.push(x,y,z);const color=shadow.clone().lerp(stone,.32+edge*.42).lerp(history,.035+.055*(1-edge));colors.push(color.r,color.g,color.b)}}
  const stride=columns+1;for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){const a=row*stride+column,b=a+1,c=a+stride,d=c+1;indices.push(a,c,b,b,c,d)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function sanctuaryParticles(seed:number){const count=96,positions=new Float32Array(count*3);for(let index=0;index<count;index++){const angle=index*2.39996323+seeded(seed,index)*.42,radius=.9+Math.sqrt((index+.5)/count)*3.4;positions.set([Math.cos(angle)*radius,-.14+seeded(seed+index,18)*1.35,Math.sin(angle)*radius*.72],index*3)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));return geometry}

function RetireRejectedLifeMapVisuals(){
  const {scene}=useThree()
  const hidden=useRef(new Set<THREE.Object3D>())
  useFrame(()=>{
    scene.traverse((object)=>{
      if(!RETIRED_VISUAL_GROUPS.has(object.name)||!object.visible)return
      object.visible=false
      hidden.current.add(object)
    })
  })
  useEffect(()=>()=>{hidden.current.forEach((object)=>{object.visible=true});hidden.current.clear()},[])
  return null
}

function MemoryOutcrop({node,index,active,reducedMotion,onSelect}:{node:LifeMapNode;index:number;active:boolean;reducedMotion:boolean;onSelect:(node:LifeMapNode)=>void}){
  const root=useRef<THREE.Group>(null),seed=nodeSeed(node,index),point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]),geometry=useMemo(()=>weatheredOutcropGeometry(seed,node.aura,active),[active,node.aura,seed])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  useFrame(({clock})=>{if(!root.current||reducedMotion||!active)return;root.current.rotation.y=Math.sin(clock.elapsedTime*.16+seed)*.018;const breath=1+Math.sin(clock.elapsedTime*.52+seed*.07)*.008;root.current.scale.setScalar(breath)})
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(node)}
  return <group ref={root} position={point} rotation={[0,seeded(seed,22)*Math.PI*2,0]} name={`life-map-v238-memory-site-${node.id}`} userData={{artRevision:'v238-ground-integrated-weathered-memory-site',semanticNode:node.id}} onClick={activate}><mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors color="#91a297" emissive={node.aura} emissiveIntensity={active?.10:.018} roughness={.93} metalness={0} side={THREE.DoubleSide}/></mesh><pointLight position={[0,.15,0]} color={node.aura} intensity={active?1.65:.16} distance={active?5.8:2.4} decay={2}/></group>
}

function SelectedSanctuary({node,index,reducedMotion}:{node:LifeMapNode;index:number;reducedMotion:boolean}){
  const point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]),floor=useMemo(()=>selectedSanctuaryGround(point,node.aura),[node.aura,point]),particles=useMemo(()=>sanctuaryParticles(nodeSeed(node,index)),[index,node])
  useEffect(()=>()=>{floor.dispose();particles.dispose()},[floor,particles])
  return <group position={point} name="life-map-v238-intimate-memory-sanctuary" userData={{scaleMode:'intimate',visualIntent:'grounded-weathered-memory-place-no-tubes-no-rings'}}><mesh geometry={floor} castShadow receiveShadow><meshStandardMaterial vertexColors color="#7b8b80" emissive="#172a25" emissiveIntensity={.18} roughness={.96} metalness={0} side={THREE.DoubleSide}/></mesh><points geometry={particles}><pointsMaterial color={node.aura} size={.032} transparent opacity={reducedMotion?.34:.46} depthWrite={false} sizeAttenuation/></points><pointLight position={[-1.8,1.2,.8]} color={node.aura} intensity={1.8} distance={7.4} decay={2}/><pointLight position={[2.2,.7,-1.5]} color="#d6d0b7" intensity={.72} distance={6.2} decay={2}/></group>
}

export function LifeMapGoldMasterOverlay({nodes,selected,phase,reducedMotion,onSelect}:Props){
  const {size}=useThree(),portrait=size.height>size.width,stage=lifeMapStage(Boolean(selected),portrait),trail=useMemo(wornLineageTrailGeometry,[])
  useEffect(()=>()=>trail.dispose(),[trail])
  const selectedIndex=selected?Math.max(0,nodes.findIndex((node)=>node.id===selected.id)):-1,arrival=Boolean(selected&&phase==='arrival')
  return <><RetireRejectedLifeMapVisuals/><group name="life-map-v238-gold-master-world" scale={stage.scale} position={stage.position} userData={{artRevision:'v238-weathered-memory-geography-gold-master-candidate'}}><mesh geometry={trail} receiveShadow name="life-map-v238-eroded-lineage-footpath"><meshStandardMaterial vertexColors color="#6a6657" roughness={.99} metalness={0} side={THREE.DoubleSide}/></mesh><group name="life-map-v238-grounded-memory-sites">{nodes.map((node,index)=><MemoryOutcrop key={node.id} node={node} index={index} active={selected?.id===node.id} reducedMotion={reducedMotion} onSelect={onSelect}/>)}</group>{arrival&&selected?<SelectedSanctuary node={selected} index={selectedIndex} reducedMotion={reducedMotion}/>:null}</group></>
}
