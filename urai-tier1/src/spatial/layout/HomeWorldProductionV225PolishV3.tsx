'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

type WalkHandler = (event: ThreeEvent<MouseEvent>) => void
type V3 = [number, number, number]

const retiredExact = new Set([
  'home-v225-v2-cathedral-memory-ribs',
  'home-v225-v2-ground-memory-hearth',
  'home-v225-v2-life-map-lineage-observatory',
  'home-v225-v2-intimate-veined-living-memory-orb',
  'home-v225-ground-sheltered-memory-basin',
  'home-v225-life-map-rooted-memory-observatory',
  'home-v225-single-asymmetric-living-memory-presence',
])

function RetireRejectedLayers() {
  const { scene } = useThree()
  useEffect(() => {
    const changed: THREE.Object3D[] = []
    scene.traverse(object => {
      const retired = retiredExact.has(object.name) || /^home-v225-rooted-memory-rib-/.test(object.name)
      if (retired && object.visible) {
        object.visible = false
        changed.push(object)
      }
    })
    return () => changed.forEach(object => { object.visible = true })
  }, [scene])
  return null
}

function tube(points: THREE.Vector3[], radius: number, radial = 8) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .34), Math.max(48, points.length * 3), radius, radial, false)
}

function groveSpec() {
  return [
    [-3.4,-3.0,1.65,.80,0.4],[3.2,-3.8,1.85,.88,1.2],[-3.1,-6.0,2.0,.92,2.0],[3.4,-6.7,2.2,.96,2.8],
    [-2.8,-9.5,2.15,.96,3.6],[2.7,-10.2,2.3,1.02,4.4],[-2.1,-12.4,2.45,1.08,5.2],[2.2,-13.2,2.25,1.00,6.0],
  ] as const
}

function SanctuaryGrove() {
  const trees = useMemo(() => groveSpec().map(([x,z,h,s,seed]) => {
    const pts = Array.from({ length: 14 }, (_, i) => {
      const t = i / 13
      return new THREE.Vector3(x + Math.sin(seed + t * 4.2) * .045, height(x,z) + .03 + h * t, z + Math.cos(seed * 1.7 + t * 3.6) * .04)
    })
    return { x,z,h,s,seed,trunk:tube(pts,.032,7) }
  }), [])
  return <group name="home-v225-v3-integrated-memory-architecture">
    {trees.map((tree,i) => <group key={i}>
      <mesh geometry={tree.trunk} castShadow><meshStandardMaterial color="#2d3832" roughness={.98}/></mesh>
      <group position={[tree.x,height(tree.x,tree.z)+tree.h+.22,tree.z]} scale={tree.s}>
        <mesh position={[-.18,.04,.02]} scale={[.54,.32,.48]} castShadow><sphereGeometry args={[1,28,18]}/><meshStandardMaterial color="#344d40" roughness={.96}/></mesh>
        <mesh position={[.22,.10,-.05]} scale={[.62,.38,.52]} castShadow><sphereGeometry args={[1,28,18]}/><meshStandardMaterial color="#405949" roughness={.95}/></mesh>
        <mesh position={[.02,.33,.04]} scale={[.50,.34,.46]} castShadow><sphereGeometry args={[1,28,18]}/><meshStandardMaterial color="#4b6250" roughness={.94}/></mesh>
      </group>
    </group>)}
  </group>
}

function basinGeometry() {
  const nx=52,nz=40,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const earth=new THREE.Color('#342f29'), warm=new THREE.Color('#66513f'), moss=new THREE.Color('#475444')
  for(let iz=0;iz<=nz;iz++){
    const vz=iz/nz,z=-1.55+vz*3.1
    for(let ix=0;ix<=nx;ix++){
      const vx=ix/nx,x=-2.05+vx*4.1
      const r=Math.min(1,Math.sqrt((x/2.05)**2+(z/1.55)**2))
      const rim=.28*Math.pow(r,2.2)
      const shelter=.34*Math.exp(-((x/.95)**2+((z+1.10)/.52)**2))
      const y=-.16+rim+shelter+.035*Math.sin(x*2.8+z*3.2)
      positions.push(x,y,z)
      const c=earth.clone().lerp(warm,.20+.28*(1-r)).lerp(moss,.15*r)
      colors.push(c.r,c.g,c.b)
    }
  }
  const row=nx+1
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const a=iz*row+ix,b=a+1,c=a+row,d=c+1;indices.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function GroundSanctuary({ onGround }: { onGround: () => void }) {
  const y=height(GROUND.x,GROUND.z), basin=useMemo(basinGeometry,[])
  return <group position={[GROUND.x,y+.02,GROUND.z]} rotation={[0,-.08,0]} name="home-v225-v3-ground-inhabited-recess" onClick={e=>{e.stopPropagation();onGround()}}>
    <mesh geometry={basin} receiveShadow castShadow><meshStandardMaterial vertexColors roughness={.98}/></mesh>
    <mesh position={[-.18,.05,-.34]} scale={[.33,.08,.27]} castShadow><sphereGeometry args={[1,30,18]}/><meshStandardMaterial color="#b77b57" emissive="#6e3828" emissiveIntensity={.58} roughness={.72}/></mesh>
    <mesh position={[.58,.11,-.70]} scale={[.30,.11,.44]} castShadow><sphereGeometry args={[1,28,18]}/><meshStandardMaterial color="#596052" roughness={.98}/></mesh>
    <mesh position={[-.78,.13,-.82]} scale={[.34,.13,.46]} castShadow><sphereGeometry args={[1,28,18]}/><meshStandardMaterial color="#4e594d" roughness={.98}/></mesh>
    <pointLight position={[-.16,.58,-.30]} color="#d88c64" intensity={2.5} distance={4.8}/>
  </group>
}

function observatoryShell() {
  const nu=64,nv=28,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const deep=new THREE.Color('#273633'), jade=new THREE.Color('#4a675e'), dusk=new THREE.Color('#665b72')
  for(let iu=0;iu<=nu;iu++){
    const u=iu/nu,theta=THREE.MathUtils.lerp(-1.15,1.15,u)
    for(let iv=0;iv<=nv;iv++){
      const v=iv/nv,crown=Math.sin(v*Math.PI)
      const r=1.55+.10*Math.sin(u*7)
      const x=Math.sin(theta)*r*(.72+.12*v)
      const z=-.52-Math.cos(theta)*r*.56-.16*v
      const y=.02+v*1.72+.42*crown+.05*Math.sin(u*9+v*8)
      positions.push(x,y,z)
      const c=deep.clone().lerp(jade,.22+.38*v).lerp(dusk,.13*crown)
      colors.push(c.r,c.g,c.b)
    }
  }
  const row=nv+1
  for(let iu=0;iu<nu;iu++)for(let iv=0;iv<nv;iv++){const a=iu*row+iv,b=a+1,c=a+row,d=c+1;indices.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function constellation(index:number){
  const a=index*.91+.25,r=.28+(index%4)*.11
  const end=new THREE.Vector3(Math.cos(a)*r,Math.sin(a*1.17)*r*.66,Math.sin(a)*r*.22)
  const bend=end.clone().multiplyScalar(.52).add(new THREE.Vector3(0,.08,-.03))
  return {g:tube([new THREE.Vector3(),bend,end],.006,5),end}
}

function LifeMapSanctuary({ onLifeMap }: { onLifeMap: () => void }) {
  const y=height(LIFE_MAP.x,LIFE_MAP.z), shell=useMemo(observatoryShell,[]), links=useMemo(()=>Array.from({length:9},(_,i)=>constellation(i)),[])
  return <group position={[LIFE_MAP.x,y+.02,LIFE_MAP.z]} rotation={[0,.08,0]} name="home-v225-v3-life-map-memory-observatory" onClick={e=>{e.stopPropagation();onLifeMap()}}>
    <mesh geometry={shell} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.93} side={THREE.DoubleSide}/></mesh>
    <group position={[0,1.08,-.76]} name="home-v225-v3-life-map-contained-memory-field">
      <mesh scale={[.09,.09,.09]}><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color="#e4d1a4" emissive="#8e693b" emissiveIntensity={1.1}/></mesh>
      {links.map(({g,end},i)=><group key={i}><mesh geometry={g}><meshStandardMaterial color={i%2?'#96c3b3':'#b7a5c6'} emissive={i%2?'#3d6a5c':'#574764'} emissiveIntensity={.40}/></mesh><mesh position={end} scale={[.026,.026,.026]}><sphereGeometry args={[1,14,10]}/><meshStandardMaterial color={i%2?'#b8d8cc':'#c7b7d3'} emissiveIntensity={.45}/></mesh></group>)}
    </group>
    <pointLight position={[0,1.25,-.62]} color="#8bc4b0" intensity={1.35} distance={4.8}/>
  </group>
}

function organicOrbGeometry(){
  const g=new THREE.SphereGeometry(1,128,96),p=g.getAttribute('position') as THREE.BufferAttribute
  const colors=new Float32Array(p.count*3)
  const shadow=new THREE.Color('#221f24'), plum=new THREE.Color('#6e5360'), jade=new THREE.Color('#668b7b'), warm=new THREE.Color('#b78372'), pale=new THREE.Color('#d1c8b3')
  for(let i=0;i<p.count;i++){
    const bx=p.getX(i),by=p.getY(i),bz=p.getZ(i),angle=Math.atan2(bz,bx)
    const upper=Math.max(0,by),lower=Math.max(0,-by)
    const lobeSide=bx<0?1.13:.93
    const shoulder=1+.28*upper*lobeSide*(.45+.55*Math.abs(bx))
    const taper=1-.68*Math.pow(lower,1.18)
    const fold=1+.045*Math.sin(angle*3+by*7)+.020*Math.sin(angle*7-by*9)
    const cleft=Math.exp(-Math.pow(bx/.19,2)-Math.pow((by-.72)/.18,2))*Math.max(0,.72+bz)
    let x=bx*.98*shoulder*taper*fold+.08*(1-by*by)+.05*bz
    let z=bz*.62*(1+.10*upper)*taper+.025*Math.sin(angle*3+by*6)
    let y=by*.78-.34*cleft-.13*Math.pow(lower,1.35)+.06*Math.abs(bx)*upper
    y+=.028*Math.sin(angle*4+by*8)*(1-Math.abs(by))
    p.setXYZ(i,x,y,z)
    const edge=Math.min(1,Math.abs(bx)*1.2),side=Math.max(0,Math.cos(angle-.45))*(1-Math.abs(by)),band=.5+.5*Math.sin(angle*3.2+by*6.2)
    const c=shadow.clone().lerp(plum,.26+.22*band).lerp(jade,.22*side).lerp(warm,.22*Math.max(0,-Math.cos(angle+.2))*(1-Math.abs(by))).lerp(pale,.10*edge*upper)
    colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b
  }
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.computeVertexNormals();return g
}

function vein(index:number){
  const side=index%2?-1:1
  const points=Array.from({length:30},(_,i)=>{const t=i/29;return new THREE.Vector3(side*(.07+t*.36+.025*Math.sin(t*8+index)),.34-t*.68+.025*Math.sin(t*7+index),.39+.018*Math.sin(t*5+index))})
  return tube(points,.0048+index*.00018,5)
}

type Posture={s:V3;r:V3;speed:number}
const posture:Record<OrbState,Posture>={
  dormant:{s:[.92,.90,.91],r:[.03,-.06,-.03],speed:.10},idle:{s:[1,.99,.98],r:[-.03,.05,-.02],speed:.30},attention:{s:[1.035,1.04,.97],r:[-.08,.12,.04],speed:.62},listening:{s:[.98,1.03,.98],r:[.06,-.06,-.03],speed:.22},thinking:{s:[1.02,.99,1.01],r:[-.09,.14,.06],speed:.18},speaking:{s:[1.04,1.03,.97],r:[.03,-.02,-.06],speed:.80},guiding:{s:[.99,1.04,.97],r:[-.10,.02,.07],speed:.42},reflecting:{s:[.99,.98,1.02],r:[.08,.08,-.05],speed:.14},calming:{s:[1.01,.98,.99],r:[-.02,-.04,.02],speed:.12},privacy:{s:[.92,.92,.91],r:[.10,.08,.08],speed:.08},warning:{s:[1.04,1.04,.96],r:[-.11,-.06,-.08],speed:.95},transition:{s:[.96,1.05,.95],r:[-.11,.04,.08],speed:.65},
}

function LivingMemoryPresence({state,reducedMotion,onOrb}:{state:OrbState;reducedMotion:boolean;onOrb:()=>void}){
  const root=useRef<THREE.Group>(null),body=useMemo(organicOrbGeometry,[]),veins=useMemo(()=>Array.from({length:8},(_,i)=>vein(i)),[]),p=posture[state]
  useFrame(({clock})=>{if(!root.current)return;const t=clock.elapsedTime*p.speed,breath=reducedMotion?1:1+Math.sin(t*.78)*.006;root.current.scale.set(p.s[0]*breath,p.s[1]*breath,p.s[2]*breath);root.current.rotation.set(p.r[0],p.r[1]+(reducedMotion?0:Math.sin(t*.70)*.014),p.r[2])})
  const warning=state==='warning',activate=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onOrb()}
  return <group ref={root} position={[ORB.x,ORB.y+.10,ORB.z]} name="home-v225-v3-single-living-memory-presence" onClick={activate}>
    <mesh geometry={body} scale={[.96,.86,.88]} castShadow><meshPhysicalMaterial vertexColors roughness={.72} clearcoat={.03} clearcoatRoughness={.88} sheen={.13} sheenColor="#9a7e81" emissive="#2a2024" emissiveIntensity={.08}/></mesh>
    <group scale={[.96,.86,.88]}>{veins.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color={warning?'#c9685b':i%2?'#8ab09d':'#c08a78'} emissive={warning?'#6e3029':i%2?'#355b4c':'#6b453b'} emissiveIntensity={.34} roughness={.72}/></mesh>)}</group>
    <mesh scale={[1.04,.83,.78]} onClick={activate}><sphereGeometry args={[1,20,16]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.08,.03,.38]} color={warning?'#c96858':'#c59b83'} intensity={state==='dormant'?.08:.28} distance={2.6}/>
  </group>
}

function MemoryWisps(){
  const geometry=useMemo(()=>{const pts:number[]=[];for(let i=0;i<150;i++){const a=i*2.39996323,r=2.4+((i*47)%100)/100*6.8;pts.push(Math.cos(a)*r,.55+((i*31)%100)/100*2.7,2.2-((i*61)%100)/100*16.2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));return g},[])
  return <points geometry={geometry}><pointsMaterial color="#bdc9c0" size={.010} transparent opacity={.12} depthWrite={false}/></points>
}

export function HomeV225PolishV3({orbState,reducedMotion,onOrb,onGround,onLifeMap,onWalk}:{orbState:OrbState;reducedMotion:boolean;onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onWalk:WalkHandler}){
  return <group name="home-v225-v3-production-living-sanctuary" onClick={onWalk}>
    <RetireRejectedLayers/>
    <SanctuaryGrove/>
    <GroundSanctuary onGround={onGround}/>
    <LifeMapSanctuary onLifeMap={onLifeMap}/>
    <LivingMemoryPresence state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <MemoryWisps/>
  </group>
}
