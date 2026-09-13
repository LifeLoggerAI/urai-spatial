'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { LifeMapNode } from './lifeMapData'
import { lifeMapLocalPoint, lifeMapStage } from './lifeMapSpatialLayout'
import type { LifeMapJourneyPhase } from './LifeMapProductionWorld'
import { LifeMapGoldMasterOverlay as LegacyLifeMapGoldMasterOverlay } from './LifeMapGoldMasterOverlayV249'

type Props={nodes:LifeMapNode[];selected:LifeMapNode|null;phase:LifeMapJourneyPhase;reducedMotion:boolean;onSelect:(node:LifeMapNode)=>void}

function seed(node:LifeMapNode,index:number){return node.id.split('').reduce((sum,c)=>sum+c.charCodeAt(0),0)+index*37}
function random(value:number,salt:number){const n=Math.sin(value*91.317+salt*17.731)*43758.5453123;return n-Math.floor(n)}

function connectionGeometry(nodes:LifeMapNode[],selected:LifeMapNode|null){
  const positions:number[]=[],colors:number[]=[]
  const byId=new Map(nodes.map((node,index)=>[node.id,{node,index}] as const)),seen=new Set<string>()
  nodes.forEach((source,sourceIndex)=>{
    const start=new THREE.Vector3(...lifeMapLocalPoint(source,sourceIndex))
    source.connectedTo.forEach((targetId)=>{
      const target=byId.get(targetId);if(!target)return
      const key=[source.id,targetId].sort().join(':');if(seen.has(key))return;seen.add(key)
      const end=new THREE.Vector3(...lifeMapLocalPoint(target.node,target.index)),mid=start.clone().lerp(end,.5)
      mid.y+=.50+start.distanceTo(end)*.055
      const samples=new THREE.QuadraticBezierCurve3(start,mid,end).getPoints(14)
      const active=Boolean(selected&&(selected.id===source.id||selected.id===target.node.id))
      const aColor=new THREE.Color(source.aura),bColor=new THREE.Color(target.node.aura)
      for(let i=0;i<samples.length-1;i++){
        const a=samples[i],b=samples[i+1],color=aColor.clone().lerp(bColor,i/(samples.length-1)),boost=active?1:.58
        positions.push(a.x,a.y+.08,a.z,b.x,b.y+.08,b.z)
        colors.push(color.r*boost,color.g*boost,color.b*boost,color.r*boost,color.g*boost,color.b*boost)
      }
    })
  })
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geometry
}

function beaconGeometry(nodes:LifeMapNode[]){
  const positions:number[]=[],colors:number[]=[]
  nodes.map((node)=>node).forEach((node,index)=>{
    const point=lifeMapLocalPoint(node,index),base=new THREE.Color(node.aura),nodeSeed=seed(node,index)
    for(let mote=0;mote<11;mote++){
      const angle=mote*2.39996323+random(nodeSeed,4+mote),radius=.12+random(nodeSeed,20+mote)*.50
      positions.push(point[0]+Math.cos(angle)*radius,point[1]+.18+random(nodeSeed,40+mote)*1.06,point[2]+Math.sin(angle)*radius*.68)
      const color=base.clone().lerp(new THREE.Color('#f0dfb7'),.16+.34*random(nodeSeed,60+mote));colors.push(color.r,color.g,color.b)
    }
  })
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geometry
}

function selectedHistoryGeometry(node:LifeMapNode,index:number){
  const nodeSeed=seed(node,index),points:THREE.Vector3[]=[]
  for(let branch=0;branch<14;branch++){
    let previous:THREE.Vector3|null=null
    for(let step=0;step<=28;step++){
      const t=step/28,angle=-1.3+branch*.195+t*(.82+branch*.014),radius=.42+1.18*Math.sin(t*Math.PI)*(.68+.25*random(nodeSeed,branch+9))
      const current=new THREE.Vector3(Math.cos(angle)*radius,-.36+t*2.20,Math.sin(angle)*radius*.66-.12+.12*Math.sin(t*7+branch))
      if(previous)points.push(previous,current);previous=current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function selectedScarGeometry(node:LifeMapNode,index:number){
  const nodeSeed=seed(node,index),points:THREE.Vector3[]=[]
  for(let trace=0;trace<9;trace++){
    let previous:THREE.Vector3|null=null
    for(let step=0;step<=20;step++){
      const t=step/20,angle=trace*.61+t*.52+nodeSeed*.001,radius=.68+.18*Math.sin(t*Math.PI*3+trace)
      const current=new THREE.Vector3(Math.cos(angle)*radius,-.16+t*1.48,Math.sin(angle)*radius*.56+.18)
      if(previous)points.push(previous,current);previous=current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function historyParticles(node:LifeMapNode,index:number){
  const count=220,nodeSeed=seed(node,index),positions=new Float32Array(count*3),colors=new Float32Array(count*3),warm=new THREE.Color('#ecd7ac'),aura=new THREE.Color(node.aura)
  for(let i=0;i<count;i++){
    const angle=i*2.39996323+random(nodeSeed,i)*.42,radius=.48+Math.sqrt((i+.5)/count)*2.55
    positions.set([Math.cos(angle)*radius,-.18+random(nodeSeed+i,18)*2.20,Math.sin(angle)*radius*.74],i*3)
    const color=aura.clone().lerp(warm,.20+.62*random(nodeSeed,i+77));colors.set([color.r,color.g,color.b],i*3)
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry
}

function HistoryConstellation({nodes,selected,reducedMotion}:{nodes:LifeMapNode[];selected:LifeMapNode|null;reducedMotion:boolean}){
  const root=useRef<THREE.Group>(null),links=useMemo(()=>connectionGeometry(nodes,selected),[nodes,selected]),beacons=useMemo(()=>beaconGeometry(nodes),[nodes])
  useEffect(()=>()=>{links.dispose();beacons.dispose()},[links,beacons])
  useFrame(({clock})=>{if(root.current&&!reducedMotion)root.current.position.y=Math.sin(clock.elapsedTime*.11)*.025})
  return <group ref={root} name="life-map-v253-history-constellation" userData={{visualOnly:true,interactionOwner:false,presentationRevision:'v253-personal-history-constellation'}}>
    <lineSegments geometry={links} raycast={()=>null}><lineBasicMaterial vertexColors transparent opacity={selected?.34:.24}/></lineSegments>
    <points geometry={beacons} raycast={()=>null}><pointsMaterial vertexColors size={.058} transparent opacity={.76} depthWrite={false} sizeAttenuation/></points>
  </group>
}

function SelectedHistory({node,index,reducedMotion}:{node:LifeMapNode;index:number;reducedMotion:boolean}){
  const root=useRef<THREE.Group>(null),point=useMemo(()=>lifeMapLocalPoint(node,index),[node,index]),history=useMemo(()=>selectedHistoryGeometry(node,index),[node,index]),scars=useMemo(()=>selectedScarGeometry(node,index),[node,index]),particles=useMemo(()=>historyParticles(node,index),[node,index])
  useEffect(()=>()=>{history.dispose();scars.dispose();particles.dispose()},[history,scars,particles])
  useFrame(({clock})=>{if(root.current&&!reducedMotion)root.current.rotation.y=Math.sin(clock.elapsedTime*.10)*.035})
  return <group ref={root} position={point} name="life-map-v253-selected-history-sanctuary" userData={{visualOnly:true,interactionOwner:false,presentationRevision:'v253-branching-history-sanctuary'}}>
    <lineSegments geometry={history} raycast={()=>null}><lineBasicMaterial color={node.aura} transparent opacity={.70}/></lineSegments>
    <lineSegments geometry={scars} raycast={()=>null}><lineBasicMaterial color="#eddcb8" transparent opacity={.82}/></lineSegments>
    <points geometry={particles} raycast={()=>null}><pointsMaterial vertexColors size={.040} transparent opacity={reducedMotion?.46:.60} depthWrite={false} sizeAttenuation/></points>
    <pointLight position={[-1.0,1.15,.7]} color={node.aura} intensity={.74} distance={5.8} decay={2}/>
    <pointLight position={[1.2,.72,-.8]} color="#e3cfaa" intensity={.40} distance={4.8} decay={2}/>
  </group>
}

export function LifeMapGoldMasterOverlay(props:Props){
  const {nodes,selected,phase,reducedMotion}=props,{size}=useThree(),portrait=size.height>size.width,stage=lifeMapStage(Boolean(selected),portrait),selectedIndex=selected?Math.max(0,nodes.findIndex((node)=>node.id===selected.id)):-1
  return <>
    <LegacyLifeMapGoldMasterOverlay {...props}/>
    <group name="life-map-v249-personal-universe-geography" scale={stage.scale} position={stage.position} userData={{presentationRevision:'v253-history-bearing-personal-universe',visualRepair:'surrounding-geography-remains-visible-through-selection-and-arrival'}}>
      <HistoryConstellation nodes={nodes} selected={selected} reducedMotion={reducedMotion}/>
      <group name="life-map-v249-grounded-memory-places" userData={{visualRepair:'all-sites-remain-grounded-geography-selected-site-rises-without-isolating-context'}}>{nodes.map((node)=><group key={node.id} name={`life-map-v253-history-anchor-${node.id}`} position={lifeMapLocalPoint(node,nodes.indexOf(node))} raycast={()=>null}/>)}</group>
      {selected&&phase==='arrival'?<SelectedHistory node={selected} index={selectedIndex} reducedMotion={reducedMotion}/>:null}
    </group>
  </>
}
