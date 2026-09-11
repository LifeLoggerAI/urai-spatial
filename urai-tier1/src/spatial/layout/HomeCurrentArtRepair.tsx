'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

const ROCK_FACE = {
  '01': '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf',
  '02': '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf',
} as const

function RetireSupersededShapes() {
  const { scene } = useThree()
  const hidden = useRef(new Set<THREE.Object3D>())
  const exact = useMemo(() => new Set([
    'home-v231-ground-weathered-threshold', 'home-v228-life-map-rooted-branching-threshold',
    'home-current-ground-geological-descent', 'home-current-life-map-rooted-ascent',
    'home-current-orb-surface-memory', 'home-current-foreground-geological-breakup',
    'home-current-atmospheric-depth-field', 'home-v226-ground-inhabited-hearth',
    'home-v226-life-map-lineage-observatory', 'home-v226-rooted-single-living-memory-presence',
  ]), [])
  useFrame(() => {
    scene.traverse((object) => {
      if (!exact.has(object.name) || !object.visible) return
      object.visible = false
      hidden.current.add(object)
    })
  })
  useEffect(() => () => {
    hidden.current.forEach((object) => { object.visible = true })
    hidden.current.clear()
  }, [])
  return null
}

function ScannedRock({ variant, position, rotation, scale }: { variant: '01' | '02'; position: [number,number,number]; rotation: [number,number,number]; scale: [number,number,number] }) {
  const asset = useGLTF(ROCK_FACE[variant])
  const model = useMemo(() => {
    const clone = asset.scene.clone(true)
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = true; object.receiveShadow = true
      const sources = Array.isArray(object.material) ? object.material : [object.material]
      const materials = sources.map((source) => {
        const material = source.clone()
        if (material instanceof THREE.MeshStandardMaterial) { material.roughness = Math.max(.9, material.roughness); material.metalness = 0; material.color.multiplyScalar(.62) }
        return material
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
    })
    return clone
  }, [asset.scene])
  useEffect(() => () => model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  }), [model])
  return <primitive object={model} position={position} rotation={rotation} scale={scale}/>
}

function erodedArchGeometry(seed: number) {
  const segments = 112, depthSteps = 7
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#252b27'), stone = new THREE.Color('#62675a'), warm = new THREE.Color('#725845')
  for (let depth = 0; depth <= depthSteps; depth++) {
    const d = depth / depthSteps
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * Math.PI
      const innerX = Math.cos(angle) * 1.12
      const innerY = Math.sin(angle) * 1.34 - .08
      const radial = .48 + .16 * Math.sin(angle * 2.7 + seed) + .10 * Math.sin(angle * 6.3 - seed * .31)
      const outward = radial * (1 - .25 * d)
      const x = innerX + Math.cos(angle) * outward + .08 * Math.sin(angle * 9 + seed)
      const y = innerY + Math.sin(angle) * outward + .05 * Math.sin(angle * 13 - seed)
      const z = -.42 - d * 1.18 + .09 * Math.sin(angle * 4 + d * 7 + seed)
      positions.push(x, y, z)
      const color = deep.clone().lerp(stone, .32 + .42 * Math.sin(angle)).lerp(warm, .10 + .07 * Math.sin(angle * 5 + seed))
      colors.push(color.r, color.g, color.b)
    }
  }
  const stride = segments + 1
  for (let d = 0; d < depthSteps; d++) for (let i = 0; i < segments; i++) {
    const a = d * stride + i, b = a + 1, c = a + stride, e = c + 1
    indices.push(a,c,b,b,c,e)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry
}

function cavernBankGeometry(seed: number, side: -1 | 1) {
  const columns = 34, rows = 26
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const dark = new THREE.Color('#252b27'), lichen = new THREE.Color('#555d4f'), earth = new THREE.Color('#59483b')
  for (let c=0;c<=columns;c++) {
    const u=c/columns
    for (let r=0;r<=rows;r++) {
      const v=r/rows
      const x = side * (1.05 + u*3.7 + .16*Math.sin(u*9 + seed) + .09*Math.sin(v*11))
      const y = -1.2 + v*(3.35-u*.48) + .12*Math.sin(v*9+u*6+seed)
      const z = -.56 - u*.72 - .42*Math.sin(v*Math.PI) + .08*Math.cos(u*13-v*8+seed)
      positions.push(x,y,z)
      const color=dark.clone().lerp(lichen,.26+v*.42).lerp(earth,.08+.06*Math.sin(u*8+v*6))
      colors.push(color.r,color.g,color.b)
    }
  }
  const stride=rows+1
  for(let c=0;c<columns;c++)for(let r=0;r<rows;r++){const a=c*stride+r,b=a+stride,d=a+1,e=b+1;indices.push(a,b,d,b,e,d)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function apertureFill(width:number,heightValue:number) {
  const segments=96, positions=[0,0,0], indices:number[]=[]
  for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;const wobble=1+.035*Math.sin(a*5)+.018*Math.sin(a*11);positions.push(Math.cos(a)*width*wobble,Math.sin(a)*heightValue*wobble,0)}
  for(let i=0;i<segments;i++)indices.push(0,i+1,1+((i+1)%segments))
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function wornPathGeometry(length=4.2,startWidth=.7,endWidth=.34) {
  const segments=34, positions:number[]=[], colors:number[]=[], indices:number[]=[]
  const soil=new THREE.Color('#3a3229'), worn=new THREE.Color('#655143')
  for(let i=0;i<=segments;i++){
    const t=i/segments,z=-.55+t*length,center=.11*Math.sin(t*6.2)+.05*Math.sin(t*15),width=THREE.MathUtils.lerp(startWidth,endWidth,t)*(1+.09*Math.sin(i*1.63)),y=-.02+.012*Math.sin(i*1.4)
    for(const side of [-1,1] as const){positions.push(center+side*width,y,z);const c=soil.clone().lerp(worn,.35+.18*Math.sin(t*11+side));colors.push(c.r,c.g,c.b)}
    if(i<segments){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d)}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function GroundThresholdV234({ onGround }: { onGround:()=>void }) {
  const y=height(GROUND.x,GROUND.z)
  const arch=useMemo(()=>erodedArchGeometry(41),[]), dark=useMemo(()=>apertureFill(1.04,1.24),[]), inner=useMemo(()=>apertureFill(.82,1.03),[]), path=useMemo(()=>wornPathGeometry(),[])
  useEffect(()=>()=>{arch.dispose();dark.dispose();inner.dispose();path.dispose()},[arch,dark,inner,path])
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onGround()}
  return <group position={[GROUND.x,y+1.12,GROUND.z]} rotation={[0,-.05,0]} name="home-v234-ground-scanned-stone-threshold" onClick={activate} userData={{artRevision:'v241-scanned-rock-cavern-no-sheet-banks',visualIntent:'continuous-rock-mouth-with-depth',semanticOwner:'home-current-ground-geological-descent',morphology:'weathered-world-emergent-descent'}}>
    <mesh geometry={arch} position={[0,.02,-1.12]} castShadow receiveShadow><meshStandardMaterial vertexColors color="#66675d" roughness={.98} metalness={0} side={THREE.DoubleSide}/></mesh>
    <Suspense fallback={null}>
      <ScannedRock variant="01" position={[-1.95,-.78,-1.20]} rotation={[.11,.54,-.12]} scale={[1.32,1.02,1.18]}/>
      <ScannedRock variant="02" position={[2.02,-.80,-1.30]} rotation={[-.08,-.76,.09]} scale={[1.38,1.05,1.20]}/>
      <ScannedRock variant="02" position={[-1.45,.84,-1.40]} rotation={[.28,.30,.42]} scale={[.82,.72,.78]}/>
      <ScannedRock variant="01" position={[1.33,1.00,-1.48]} rotation={[-.24,-.22,-.34]} scale={[.76,.68,.74]}/>
      <ScannedRock variant="01" position={[-2.65,-.54,-.72]} rotation={[.05,1.06,-.20]} scale={[.88,.72,.96]}/>
      <ScannedRock variant="02" position={[2.72,-.58,-.82]} rotation={[-.06,-1.12,.16]} scale={[.92,.76,.98]}/>
    </Suspense>
    <mesh geometry={dark} position={[0,-.04,-1.66]}><meshStandardMaterial color="#090b09" emissive="#32170f" emissiveIntensity={.11} roughness={1}/></mesh>
    <mesh geometry={inner} position={[0,-.10,-1.92]}><meshStandardMaterial color="#010202" roughness={1}/></mesh>
    <mesh geometry={path} position={[0,-1.13,-.12]} receiveShadow><meshStandardMaterial vertexColors color="#5a4b3e" roughness={1}/></mesh>
    <pointLight position={[.08,-.18,-1.52]} color="#d78354" intensity={.86} distance={4.2} decay={2}/>
    <spotLight position={[-.8,2.8,.4]} target-position={[0,.05,-1.25]} color="#cfb393" intensity={.40} distance={8} angle={.42} penumbra={.98} decay={2}/>
  </group>
}

function lineageBankGeometry(side:-1|1,seed:number){
  const columns=34,rows=34,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const deep=new THREE.Color('#28302c'),stone=new THREE.Color('#687268'),cool=new THREE.Color('#3f6460')
  for(let c=0;c<=columns;c++){const u=c/columns;for(let r=0;r<=rows;r++){const v=r/rows;const y=-1.15+v*4.65;const inward=1.02+.52*Math.pow(Math.abs(v-.48)*2,1.4);const x=side*(inward+u*(2.3+.6*v)+.13*Math.sin(v*12+u*7+seed));const z=-.42-u*.9-.22*Math.sin(v*Math.PI)+.08*Math.cos(v*9-u*12+seed);positions.push(x,y,z);const color=deep.clone().lerp(stone,.28+v*.40).lerp(cool,.08+.12*(1-u));colors.push(color.r,color.g,color.b)}}
  const stride=rows+1;for(let c=0;c<columns;c++)for(let r=0;r<rows;r++){const a=c*stride+r,b=a+stride,d=a+1,e=b+1;indices.push(a,b,d,b,e,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function LifeMapThresholdV234({onLifeMap}:{onLifeMap:()=>void}){
  const y=height(LIFE_MAP.x,LIFE_MAP.z), trail=useMemo(()=>wornPathGeometry(3.5,.62,.28),[])
  const stars=useMemo(()=>{const count=180,positions=new Float32Array(count*3),colors=new Float32Array(count*3),warm=new THREE.Color('#cfb997'),cool=new THREE.Color('#8bc7bc');for(let i=0;i<count;i++){const a=i*2.39996323,r=.18+Math.sqrt((i+.5)/count)*1.08,depth=(i%17)*.13;positions.set([Math.cos(a)*r,1.1+Math.sin(a)*r*1.45,-1.1-depth],i*3);const c=warm.clone().lerp(cool,(i%9)/8);colors.set([c.r,c.g,c.b],i*3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3));return g},[])
  useEffect(()=>()=>{trail.dispose();stars.dispose()},[trail,stars])
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onLifeMap()}
  return <group position={[LIFE_MAP.x,y,LIFE_MAP.z]} rotation={[0,.045,0]} name="home-v234-life-map-rooted-observatory" onClick={activate} userData={{artRevision:'v241-scanned-rock-lineage-cleft-no-sheet-banks',visualIntent:'deep-asymmetric-rock-cleft',semanticOwner:'home-current-life-map-rooted-ascent',morphology:'rooted-ascent-not-tube-portal'}}>
    <Suspense fallback={null}>
      <ScannedRock variant="02" position={[-1.58,-.72,-.32]} rotation={[.08,.78,-.12]} scale={[1.02,.62,.92]}/>
      <ScannedRock variant="01" position={[1.70,-.70,-.38]} rotation={[.04,-.86,.09]} scale={[.98,.60,.88]}/>
      <ScannedRock variant="01" position={[-1.02,.66,-.80]} rotation={[.34,.52,.46]} scale={[.62,.72,.64]}/>
      <ScannedRock variant="02" position={[.92,.94,-.94]} rotation={[-.28,-.40,-.38]} scale={[.58,.78,.62]}/>
      <ScannedRock variant="02" position={[-2.16,-.36,-.08]} rotation={[.12,1.16,-.16]} scale={[.68,.54,.76]}/>
      <ScannedRock variant="01" position={[2.24,-.42,-.16]} rotation={[-.10,-1.22,.14]} scale={[.72,.56,.78]}/>
    </Suspense>
    <mesh geometry={trail} position={[0,-.98,.7]} rotation={[.18,0,0]} receiveShadow><meshStandardMaterial vertexColors color="#6c6250" roughness={1}/></mesh>
    <points geometry={stars}><pointsMaterial vertexColors size={.035} sizeAttenuation transparent opacity={.88} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    <pointLight position={[0,1.35,-1.35]} color="#7fb4a8" intensity={.58} distance={5.6} decay={2}/><spotLight position={[.5,4.1,1.2]} target-position={[0,1.2,-1.0]} color="#d3ddd2" intensity={.34} distance={9} angle={.36} penumbra={.98} decay={2}/>
  </group>
}

function livingMemoryGeometry(){
  const g=new THREE.SphereGeometry(1,88,64),p=g.getAttribute('position') as THREE.BufferAttribute
  for(let i=0;i<p.count;i++){
    const sx=p.getX(i),sy=p.getY(i),sz=p.getZ(i),a=Math.atan2(sz,sx),ny=(sy+1)*.5
    const crown=Math.max(0,sy), lower=Math.max(0,-sy)
    const coarse=.15*Math.sin(a*3.1+sy*2.7)+.08*Math.cos(a*5.7-sy*4.8)
    const scar=.06*Math.sin(sx*10.4+sz*7.3+sy*6.2)+.035*Math.cos(a*11.1)
    const cleft=Math.exp(-((sx*.90+sz*.18-.04)**2)/.038)*Math.pow(crown,1.45)
    const dent=Math.exp(-(((sx+.30)*.82)**2+(sz-.16)**2)/.12)*(.35+.65*crown)
    const shoulder=Math.exp(-(((sx-.36)*.76)**2+(sz+.22)**2)/.18)*Math.max(0,.65+sy)
    const radial=1+coarse*.55+scar-.22*cleft-.13*dent+.10*shoulder
    let x=sx*radial*1.04+.16*sy-.07
    let z=sz*radial*.80+.05*Math.sin(sy*5.1+a*2)
    const twist=.24*sy+.06*Math.sin(sy*3.2),c=Math.cos(twist),s=Math.sin(twist),tx=x*c-z*s,tz=x*s+z*c
    x=tx;z=tz
    let y=sy*.78-.12-.17*cleft-.08*dent+.075*Math.sin(a*4.2+sy*5.4)*crown
    y-=lower*(.05+.05*lower)
    p.setXYZ(i,x,y,z)
  }
  g.computeVertexNormals();return g
}

function memoryVeinGeometry(index:number){
  const side=index%2?-1:1,lane=Math.floor(index/2),points:THREE.Vector3[]=[]
  for(let i=0;i<=48;i++){const t=i/48,y=-.52+t*(1.02-lane*.03),env=Math.pow(Math.sin(Math.PI*t),.7),x=side*(.07+lane*.105)*env+.024*Math.sin(t*7+index),z=.40*env+.025+lane*.008-.06*t;points.push(new THREE.Vector3(x,y,z))}
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal',.4),samples=72,positions:number[]=[],indices:number[]=[],tangent=new THREE.Vector3(),sideVec=new THREE.Vector3(),up=new THREE.Vector3(0,1,0)
  for(let i=0;i<=samples;i++){const t=i/samples,point=curve.getPoint(t);curve.getTangent(t,tangent).normalize();sideVec.crossVectors(tangent,up);if(sideVec.lengthSq()<.001)sideVec.set(1,0,0);sideVec.normalize();const width=THREE.MathUtils.lerp(.014,.005,t)*(1+.10*Math.sin(t*Math.PI*3));const l=point.clone().addScaledVector(sideVec,width),r=point.clone().addScaledVector(sideVec,-width);positions.push(l.x,l.y,l.z,r.x,r.y,r.z);if(i<samples){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,b,c,b,d,c)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function memoryInteriorGeometry(){const count=120,positions=new Float32Array(count*3);for(let i=0;i<count;i++){const t=(i+.5)/count,a=i*2.39996323,r=Math.pow(t,.56)*.54,y=-.40+(i%19)/18*.84;positions.set([Math.cos(a)*r*(1-.30*Math.abs(y)),y,Math.sin(a)*r*.44],i*3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));return g}

const stateIntensity:Record<OrbState,number>={dormant:.05,idle:.14,attention:.28,listening:.22,thinking:.25,speaking:.32,guiding:.23,reflecting:.18,calming:.12,privacy:.20,warning:.35,transition:.24}

function LivingMemoryHeartV234({state,reducedMotion,onOrb}:{state:OrbState;reducedMotion:boolean;onOrb:()=>void}){
  const root=useRef<THREE.Group>(null),y=height(ORB.x,ORB.z),outer=useMemo(livingMemoryGeometry,[]),veins=useMemo(()=>Array.from({length:7},(_,i)=>memoryVeinGeometry(i)),[]),interior=useMemo(memoryInteriorGeometry,[])
  useEffect(()=>()=>{outer.dispose();veins.forEach(g=>g.dispose());interior.dispose()},[outer,veins,interior])
  useFrame(({clock})=>{if(!root.current||reducedMotion)return;const t=clock.elapsedTime,breath=1+Math.sin(t*.56)*.006;root.current.position.y=y+1.34+Math.sin(t*.43)*.008;root.current.rotation.y=-.26+Math.sin(t*.18)*.026;root.current.rotation.z=-.08+Math.sin(t*.29)*.009;root.current.scale.setScalar(1.0*breath)})
  const e=(reducedMotion?.82:1)*stateIntensity[state],warning=state==='warning',privacy=state==='privacy',glow=warning?'#a95440':privacy?'#4a8791':'#4f8d77',skin=warning?'#574641':privacy?'#486066':'#43534a'
  const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onOrb()}
  return <group ref={root} position={[ORB.x,y+1.34,ORB.z]} rotation={[.05,-.26,-.08]} scale={1.0} name="home-v234-living-memory-heart" onClick={activate} userData={{artRevision:'v241-single-scarred-matte-memory-presence',visualIntent:'one-connected-asymmetric-history-bearing-presence',semanticOwner:'home-current-orb-surface-memory',materialLanguage:'matte-stratified-memory-tissue'}}>
    <mesh geometry={outer} castShadow receiveShadow><meshPhysicalMaterial color={skin} emissive={glow} emissiveIntensity={.025+e*.14} roughness={.80} metalness={0} clearcoat={.025} clearcoatRoughness={.88} transparent opacity={.92} transmission={.035} thickness={.30} depthWrite/></mesh>
    <points geometry={interior}><pointsMaterial color={glow} size={.020} transparent opacity={.28+e*.22} depthWrite={false} blending={THREE.AdditiveBlending}/></points>
    {veins.map((g,i)=><mesh key={i} geometry={g} position={[0,-.04,.025]}><meshStandardMaterial color={i%3===0?'#a2b0a5':'#668979'} emissive={glow} emissiveIntensity={.08+e*.32} roughness={.84} transparent opacity={.30} depthWrite={false} side={THREE.DoubleSide}/></mesh>)}
    <pointLight color={warning?'#c96c55':privacy?'#72a9b1':'#75ad96'} intensity={.18+e*.58} distance={3.8} decay={2}/>
  </group>
}

function SubtleAtmosphereV234({reducedMotion}:{reducedMotion:boolean}){const root=useRef<THREE.Points>(null),geometry=useMemo(()=>{const count=144,positions=new Float32Array(count*3),colors=new Float32Array(count*3),warm=new THREE.Color('#b99973'),cool=new THREE.Color('#7ca8a0');for(let i=0;i<count;i++){const t=i/count,a=i*2.39996323,r=2.6+Math.sqrt(t)*11,x=Math.cos(a)*r,z=2.8-t*22+Math.sin(i*.71)*.72,y=height(x,z)+.52+(i%13)*.15;positions.set([x,y,z],i*3);const c=warm.clone().lerp(cool,.35+.48*((i%9)/8));colors.set([c.r,c.g,c.b],i*3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3));return g},[]);useEffect(()=>()=>geometry.dispose(),[geometry]);useFrame(({clock})=>{if(root.current&&!reducedMotion)root.current.position.y=Math.sin(clock.elapsedTime*.12)*.022});return <points ref={root} geometry={geometry} frustumCulled={false} name="home-v234-subtle-atmospheric-depth"><pointsMaterial size={.020} sizeAttenuation transparent opacity={.24} vertexColors depthWrite={false} blending={THREE.AdditiveBlending}/></points>}

export function HomeCurrentArtRepair({orbState,reducedMotion,onOrb,onGround,onLifeMap}:{orbState:OrbState;reducedMotion:boolean;onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void}){
  return <group name="home-current-authority-art-repair" userData={{artRevision:'v241-no-sheet-thresholds-matte-memory-presence'}}><RetireSupersededShapes/><GroundThresholdV234 onGround={onGround}/><LifeMapThresholdV234 onLifeMap={onLifeMap}/><LivingMemoryHeartV234 state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><SubtleAtmosphereV234 reducedMotion={reducedMotion}/></group>
}
