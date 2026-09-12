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
  const geometry=new THREE.SphereGeometry(1,48,32)
  const position=geometry.getAttribute('position') as THREE.BufferAttribute
  const colors:number[]=[]
  const deep=new THREE.Color('#24332d'),mineral=new THREE.Color('#6d786f'),lichen=new THREE.Color('#536358'),memory=new THREE.Color(accent)
  const family=seed%5
  const profiles=[
    {x:1.62,y:.36,z:.80,lean:.18},
    {x:1.02,y:.58,z:1.28,lean:-.12},
    {x:1.38,y:.44,z:.96,lean:.08},
    {x:1.78,y:.30,z:.66,lean:-.18},
    {x:1.18,y:.50,z:1.38,lean:.14},
  ][family]
  const bias=(seeded(seed,31)-.5)*.34
  for(let index=0;index<position.count;index++){
    const nx=position.getX(index),ny=position.getY(index),nz=position.getZ(index)
    const azimuth=Math.atan2(nz,nx), crown=Math.max(0,ny), lower=Math.max(0,-ny)
    const shelf=Math.round((ny+1)*5)/5-(ny+1)
    const coarse=.13*Math.sin(azimuth*(2+(family%3))+ny*3.6+seed*.071)
    const stratum=.075*Math.sin(ny*15+azimuth*1.8+seed*.041)
    const fine=.022*Math.sin(nx*13+nz*9+ny*11+seed*.019)
    const cleft=Math.exp(-((nx*.82+nz*.36-.04)**2)/.032)*Math.pow(crown,1.25)
    const cavityA=Math.exp(-(((nx-bias)*.86)**2+(nz+.22)**2)/.12)*(.28+.72*crown)
    const cavityB=Math.exp(-(((nx+bias*.6)*.72)**2+(nz-.38)**2)/.16)*Math.max(0,.58+ny)
    const radial=1+coarse+stratum*.45+fine-.34*cleft-.14*cavityA-.09*cavityB
    let x=nx*radial*profiles.x + profiles.lean*ny + bias*.14
    let z=nz*radial*profiles.z + .04*Math.sin(ny*5.4+seed)
    const twist=(ny+.2)*(.16+(seeded(seed,12)-.5)*.12)
    const cos=Math.cos(twist),sin=Math.sin(twist),tx=x*cos-z*sin,tz=x*sin+z*cos
    x=tx;z=tz
    let y=ny*profiles.y + shelf*.16 + .04*Math.sin(nx*5+nz*4+seed*.07)*crown
    y-=lower*(.42+.26*lower)
    y-=.58
    position.setXYZ(index,x,y,z)
    const height=THREE.MathUtils.clamp((y+.90)/1.30,0,1)
    const scar=THREE.MathUtils.clamp(cleft*.92+cavityA*.36+Math.abs(stratum)*2.0,0,1)
    const memoryBase=active ? .055 : .005
    const memoryScar=active ? .095 : .012
    const color=deep.clone().lerp(mineral,.20+.48*height).lerp(lichen,.08+.14*(1-height)).lerp(memory,memoryBase+scar*memoryScar)
    colors.push(color.r,color.g,color.b)
  }
  position.needsUpdate=true
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry
}

function memorySiteScarGeometry(point:Point3,seed:number,accent:string,active:boolean){
  const positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const earth=new THREE.Color('#344039'),mineral=new THREE.Color('#69766c'),memory=new THREE.Color(accent)
  const branches=2+(seed%3)
  let vertexBase=0
  for(let branch=0;branch<branches;branch++){
    const segments=18
    const angle=seeded(seed,61+branch)*Math.PI*2
    const normalX=-Math.sin(angle),normalZ=Math.cos(angle)
    const length=1.35+seeded(seed,71+branch)*1.55
    const widthBase=.046+seeded(seed,81+branch)*.040
    const bend=(seeded(seed,91+branch)-.5)*.48
    for(let step=0;step<=segments;step++){
      const t=step/segments
      const drift=Math.sin(t*Math.PI)*bend
      const centerX=Math.cos(angle)*length*t+normalX*drift
      const centerZ=Math.sin(angle)*length*t+normalZ*drift
      const width=widthBase*(1-.50*t)*(.86+.18*Math.sin(step*1.73+branch))
      for(const side of [-1,1] as const){
        const localX=centerX+normalX*width*side
        const localZ=centerZ+normalZ*width*side
        const worldX=point[0]+localX,worldZ=point[2]+localZ
        const localY=lifeMapTerrainHeight(worldX,worldZ)-point[1]+.038+.006*Math.sin(step*1.41+side+branch)
        positions.push(localX,localY,localZ)
        const age=.42+.42*(1-t)+.10*Math.sin(step*.67+branch)
        const accentWeight=(active?.085:.026)*(1-t*.62)
        const color=earth.clone().lerp(mineral,age).lerp(memory,accentWeight)
        colors.push(color.r,color.g,color.b)
      }
    }
    for(let step=0;step<segments;step++){
      const a=vertexBase+step*2,b=a+1,c=a+2,d=a+3
      indices.push(a,c,b,b,c,d)
    }
    vertexBase+=(segments+1)*2
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry
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

function sanctuaryParticles(seed:number){const count=112,positions=new Float32Array(count*3);for(let index=0;index<count;index++){const angle=index*2.39996323+seeded(seed,index)*.42,radius=.55+Math.sqrt((index+.5)/count)*1.8;positions.set([Math.cos(angle)*radius,-.18+seeded(seed+index,18)*1.45,Math.sin(angle)*radius*.68],index*3)}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));return geometry}

function RetireRejectedLifeMapVisuals(){
  const {scene}=useThree();const hidden=useRef(new Set<THREE.Object3D>())
  useFrame(()=>{scene.traverse((object)=>{if(!RETIRED_VISUAL_GROUPS.has(object.name)||!object.visible)return;object.visible=false;hidden.current.add(object)})})
  useEffect(()=>()=>{hidden.current.forEach((object)=>{object.visible=true});hidden.current.clear()},[])
  return null
}

function MemoryOutcrop({node,index,active,reducedMotion,onSelect,arrival}:{node:LifeMapNode;index:number;active:boolean;reducedMotion:boolean;onSelect:(node:LifeMapNode)=>void;arrival:boolean}){
  const root=useRef<THREE.Group>(null),seed=nodeSeed(node,index),point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]),geometry=useMemo(()=>weatheredOutcropGeometry(seed,node.aura,active),[active,node.aura,seed]),scarGeometry=useMemo(()=>memorySiteScarGeometry(point,seed,node.aura,active),[active,node.aura,point,seed])
  useEffect(()=>()=>{geometry.dispose();scarGeometry.dispose()},[geometry,scarGeometry])
  useFrame(({clock})=>{if(!root.current||reducedMotion||!active)return;root.current.rotation.y=Math.sin(clock.elapsedTime*.12+seed)*.006})
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(node)}
  const horizontalScale=arrival&&active ? .36 : .32
  const verticalScale=arrival&&active ? .88 : .76
  const depthScale=arrival&&active ? .34 : .30
  const yOffset=arrival&&active ? -.28 : -.31
  return <group position={point} name={`life-map-v242-memory-site-${node.id}`} userData={{artRevision:'v242-terrain-scar-memory-manifestation',visualRepair:'inactive-sites-are-geography-selected-site-rises-as-rooted-fold',semanticNode:node.id}} onClick={activate}>
    <mesh geometry={scarGeometry} receiveShadow name={`life-map-v242-terrain-scar-${node.id}`}><meshStandardMaterial vertexColors color="#89978e" roughness={1} metalness={0}/></mesh>
    {active?<group ref={root} position={[0,yOffset,0]} scale={[horizontalScale,verticalScale,depthScale]} rotation={[0,seeded(seed,22)*Math.PI*2,0]}>
      <mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors color="#839087" emissive={node.aura} emissiveIntensity={.050} roughness={.96} metalness={0}/></mesh>
    </group>:null}
    <pointLight position={[0,active?.28:.05,0]} color={node.aura} intensity={active?.25:.020} distance={active?2.8:1.15} decay={2}/>
  </group>
}

function SelectedSanctuary({node,index,reducedMotion}:{node:LifeMapNode;index:number;reducedMotion:boolean}){
  const point=useMemo<Point3>(()=>lifeMapLocalPoint(node,index),[index,node]),particles=useMemo(()=>sanctuaryParticles(nodeSeed(node,index)),[index,node])
  useEffect(()=>()=>particles.dispose(),[particles])
  const opacity=reducedMotion ? .16 : .24
  return <group position={[point[0],point[1]-.04,point[2]]} name="life-map-v242-intimate-memory-sanctuary" userData={{scaleMode:'intimate',visualIntent:'terrain-remains-authority-selected-memory-rises-from-scar-no-platform-no-ring'}}><points geometry={particles}><pointsMaterial color={node.aura} size={.022} transparent opacity={opacity} depthWrite={false} sizeAttenuation/></points><pointLight position={[-1.0,.82,.6]} color={node.aura} intensity={.36} distance={4.0} decay={2}/><pointLight position={[1.25,.48,-.8]} color="#d6d0b7" intensity={.18} distance={3.6} decay={2}/></group>
}

export function LifeMapGoldMasterOverlay({nodes,selected,phase,reducedMotion,onSelect}:Props){
  const {size}=useThree(),portrait=size.height>size.width,stage=lifeMapStage(Boolean(selected),portrait),trail=useMemo(wornLineageTrailGeometry,[])
  useEffect(()=>()=>trail.dispose(),[trail])
  const selectedIndex=selected?Math.max(0,nodes.findIndex((node)=>node.id===selected.id)):-1,arrival=Boolean(selected&&phase==='arrival')
  const visibleNodes=arrival&&selected?[selected]:nodes
  return <><RetireRejectedLifeMapVisuals/><group name="life-map-v242-gold-master-world" scale={stage.scale} position={stage.position} userData={{artRevision:'v242-terrain-scar-memory-manifestations',visualRepair:'inactive-rock-chips-retired-selected-rooted-fold-only'}}><mesh geometry={trail} receiveShadow name="life-map-v242-eroded-lineage-footpath"><meshStandardMaterial vertexColors color="#8d806b" roughness={1} metalness={0}/></mesh><group name="life-map-v242-grounded-memory-sites">{visibleNodes.map((node)=>{const index=Math.max(0,nodes.findIndex((candidate)=>candidate.id===node.id));return <MemoryOutcrop key={node.id} node={node} index={index} active={selected?.id===node.id} arrival={arrival} reducedMotion={reducedMotion} onSelect={onSelect}/>})}</group>{arrival&&selected?<SelectedSanctuary node={selected} index={selectedIndex} reducedMotion={reducedMotion}/>:null}</group></>
}
