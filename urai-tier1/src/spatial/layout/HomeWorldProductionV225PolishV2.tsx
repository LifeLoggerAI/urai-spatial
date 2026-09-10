'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

type V3 = [number, number, number]
type WalkHandler = (event: ThreeEvent<MouseEvent>) => void

const rejectedNames = new Set([
  'home-v225-living-memory-grove',
  'home-v225-grown-winding-memory-path',
  'home-v225-ground-sheltered-memory-basin',
  'home-v225-life-map-rooted-memory-observatory',
  'home-v225-single-asymmetric-living-memory-presence',
  'home-v225-sculpted-sanctuary-floor',
])

function RetireRejectedPresentation() {
  const { scene } = useThree()
  useEffect(() => {
    const changed: THREE.Object3D[] = []
    scene.traverse((object) => {
      const rejected = rejectedNames.has(object.name)
        || /^home-v225-(?:port|starboard)-overhanging-strata-/.test(object.name)
        || object.name === 'home-v225-polish-production-composition'
      if (rejected && object.visible) {
        object.visible = false
        changed.push(object)
      }
    })
    return () => changed.forEach((object) => { object.visible = true })
  }, [scene])
  return null
}

function tube(points: THREE.Vector3[], radius: number, radial = 8) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, false, 'centripetal', .35),
    Math.max(48, points.length * 2), radius, radial, false,
  )
}

function terrainGeometry() {
  const nx = 128, nz = 176
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#0d211d')
  const moss = new THREE.Color('#274d40')
  const earth = new THREE.Color('#755a40')
  const teal = new THREE.Color('#416f63')
  for (let iz = 0; iz <= nz; iz++) {
    const z = 6.3 - iz / nz * 25.8
    for (let ix = 0; ix <= nx; ix++) {
      const x = -9.1 + ix / nx * 18.2
      const depth = THREE.MathUtils.clamp((5.0-z)/23,0,1)
      const lane = Math.exp(-Math.pow(x/2.55,2))
      const micro = .030*Math.sin(x*2.8+z*1.7)*Math.cos(z*2.1-x*.72)
      const folds = .070*Math.sin(x*.78+z*.29)+.040*Math.cos(x*1.31-z*.51)
      const shoulder = Math.pow(THREE.MathUtils.clamp((Math.abs(x)-2.1)/6.8,0,1),1.22)
      const y = height(x,z)+micro+folds*(1-.58*lane)+.32*shoulder*(.30+depth)+.025
      positions.push(x,y,z)
      const mottled=.5+.5*Math.sin(x*2.13+z*1.17)*Math.sin(z*.82-x*.93)
      const c=deep.clone().lerp(moss,.34+.28*(1-Math.abs(x)/9.1)).lerp(earth,.17*lane+.08*mottled).lerp(teal,.12*depth)
      colors.push(c.r,c.g,c.b)
    }
  }
  const row=nx+1
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){
    const a=iz*row+ix,b=a+1,c=a+row,d=c+1
    if((ix+iz)&1)indices.push(a,b,d,a,d,c);else indices.push(a,b,c,b,d,c)
  }
  const g=new THREE.BufferGeometry()
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  g.setIndex(indices);g.computeVertexNormals();return g
}

function memoryPathGeometry() {
  const n=132,cross=16,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const warm=new THREE.Color('#b69061'),green=new THREE.Color('#345e50'),pale=new THREE.Color('#c8b78f')
  for(let i=0;i<=n;i++){
    const t=i/n,z=5.15-t*21.2,cx=.22*Math.sin(t*Math.PI*2)+.07*Math.sin(t*Math.PI*5.2)
    for(let j=0;j<cross;j++){
      const u=j/(cross-1)-.5,x=cx+u*(2.05+.12*Math.sin(i*.18))
      const y=height(x,z)+.09+.035*Math.cos(u*Math.PI*2)+.012*Math.sin(i*.31+u*5)
      positions.push(x,y,z)
      const col=green.clone().lerp(warm,.38+.50*(1-Math.abs(u)*2)).lerp(pale,.10*Math.sin(t*Math.PI))
      colors.push(col.r,col.g,col.b)
    }
  }
  for(let i=0;i<n;i++)for(let j=0;j<cross-1;j++){
    const a=i*cross+j,b=a+1,c=a+cross,d=c+1;indices.push(a,b,c,b,d,c)
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function escarpmentGeometry(side:-1|1,band:number){
  const ns=82,nv=36,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const dark=new THREE.Color(side<0?'#173129':'#14372f'),stone=new THREE.Color(side<0?'#59664e':'#48695c'),warm=new THREE.Color('#876547')
  const z0=5.4-band*7.2,z1=z0-9.2
  for(let i=0;i<=ns;i++){
    const u=i/ns,z=THREE.MathUtils.lerp(z0,z1,u),depth=THREE.MathUtils.clamp((5-z)/23,0,1)
    for(let j=0;j<=nv;j++){
      const v=j/nv
      const baseX=side*(6.05+.34*Math.sin(z*.27+band*1.7)+.14*Math.sin(z*.91-band))
      const alcove=Math.pow(Math.sin(v*Math.PI),1.16)*(1.22+.18*band)
      const fracture=.30*Math.sin(v*Math.PI*4.6+u*5.8+band)+.13*Math.sin(v*18-u*4)
      const x=baseX-side*(alcove+fracture*.22)
      const floor=height(x*.9,z)
      const total=2.25+1.75*depth+.34*band
      const y=floor-.08+v*total+.16*Math.sin(v*Math.PI*3.3+u*6.4+band)+.058*Math.sin(v*19+u*11)
      positions.push(x,y,z-.24*v+.12*Math.sin(v*6.4+u*4.2+band))
      const strata=.5+.5*Math.sin(v*32+u*8+band)
      const col=dark.clone().lerp(stone,.28+.46*v).lerp(warm,.13*strata)
      colors.push(col.r,col.g,col.b)
    }
  }
  const row=nv+1
  for(let i=0;i<ns;i++)for(let j=0;j<nv;j++){const a=i*row+j,b=a+1,c=a+row,d=c+1;indices.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function memoryRibbon(side:-1|1,index:number){
  const n=42,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const baseZ=3.7-index*4.15
  for(let i=0;i<=n;i++){
    const t=i/n,z=baseZ-t*3.3,x0=side*(5.15-.78*Math.sin(t*Math.PI)),floor=height(x0,z)
    const width=.32+.18*Math.sin(t*Math.PI),lift=.24+.86*Math.sin(t*Math.PI)+.12*Math.sin(t*7+index)
    for(let k=0;k<2;k++){
      positions.push(x0+side*(k?width:0),floor+(k?.05:lift),z+(k?.12:-.08))
      const c=new THREE.Color(k?'#6e765d':'#8b7654');colors.push(c.r,c.g,c.b)
    }
  }
  for(let i=0;i<n;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function MemoryValley({onWalk}:{onWalk:WalkHandler}){
  const floor=useMemo(terrainGeometry,[]),path=useMemo(memoryPathGeometry,[])
  const walls=useMemo(()=>([-1,1] as const).flatMap(side=>Array.from({length:3},(_,band)=>({side,band,g:escarpmentGeometry(side,band)}))),[])
  const ribbons=useMemo(()=>([-1,1] as const).flatMap(side=>Array.from({length:5},(_,index)=>({side,index,g:memoryRibbon(side,index)}))),[])
  return <group name="home-v225-v2-continuous-sculpted-memory-valley">
    <mesh geometry={floor} receiveShadow onClick={onWalk} name="home-v225-v2-authored-valley-floor"><meshStandardMaterial vertexColors roughness={.98}/></mesh>
    <mesh geometry={path} receiveShadow onClick={onWalk} name="home-v225-v2-grown-memory-walk"><meshStandardMaterial vertexColors roughness={.89} emissive="#57391f" emissiveIntensity={.19}/></mesh>
    <group name="home-v225-v2-weathered-memory-walls">{walls.map(({side,band,g})=><mesh key={`${side}-${band}`} geometry={g} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.97}/></mesh>)}</group>
    <group name="home-v225-v2-cathedral-memory-ribs">{ribbons.map(({side,index,g})=><mesh key={`${side}-${index}`} geometry={g} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.90}/></mesh>)}</group>
  </group>
}

function coveShellGeometry(layer:number){
  const nu=56,nv=40,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const deep=new THREE.Color('#39291f'),warm=new THREE.Color('#b16b3e'),moss=new THREE.Color('#596b4d')
  for(let iu=0;iu<=nu;iu++){
    const u=iu/nu,theta=-1.16+u*2.32
    for(let iv=0;iv<=nv;iv++){
      const v=iv/nv,arch=Math.sin(v*Math.PI)
      const r=2.38-layer*.24+.15*Math.sin(u*7+v*5+layer)
      const x=.42+2.62*u+Math.cos(theta)*r*(.24+.48*v)
      const z=Math.sin(theta)*r*(.72-.06*layer)
      const y=.02+v*(1.92-layer*.08)+.62*arch+.12*Math.sin(u*8+v*5+layer)
      positions.push(x,y,z)
      const c=deep.clone().lerp(warm,.30+.48*arch).lerp(moss,.14*(1-u));colors.push(c.r,c.g,c.b)
    }
  }
  const row=nv+1
  for(let iu=0;iu<nu;iu++)for(let iv=0;iv<nv;iv++){const a=iu*row+iv,b=a+1,c=a+row,d=c+1;indices.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function GroundHearth({onGround}:{onGround:()=>void}){
  const y=height(GROUND.x,GROUND.z)
  const shells=useMemo(()=>Array.from({length:3},(_,i)=>coveShellGeometry(i)),[])
  return <group position={[GROUND.x,y+.02,GROUND.z]} name="home-v225-v2-ground-memory-hearth" onClick={e=>{e.stopPropagation();onGround()}}>
    {shells.map((g,i)=><mesh key={i} geometry={g} position={[i*.10,i*.04,-i*.12]} castShadow receiveShadow><meshPhysicalMaterial vertexColors roughness={.88} side={THREE.DoubleSide} clearcoat={.03}/></mesh>)}
    <mesh position={[2.72,.18,-.08]} scale={[1.52,.31,1.18]} castShadow receiveShadow><sphereGeometry args={[1,64,36,0,Math.PI*2,Math.PI*.50,Math.PI*.50]}/><meshStandardMaterial color="#8f5536" emissive="#7b341e" emissiveIntensity={.68} roughness={.84}/></mesh>
    <mesh position={[2.72,.48,-.08]} scale={[.90,.23,.72]}><sphereGeometry args={[1,36,24]}/><meshPhysicalMaterial color="#ffd0a0" emissive="#df6a3d" emissiveIntensity={2.0} transparent opacity={.88} roughness={.32}/></mesh>
    {Array.from({length:9},(_,i)=>{const a=-1.02+i*.255;return <mesh key={i} position={[2.72+Math.cos(a)*1.72,.30+.06*(i%2),-.08+Math.sin(a)*1.12]} scale={[.32,.13,.52]} rotation={[0,-a,0]} castShadow><sphereGeometry args={[1,28,18]}/><meshStandardMaterial color={i%2?'#9a7b58':'#68705a'} roughness={.92}/></mesh>})}
    <pointLight position={[2.72,1.06,-.04]} color="#ffad76" intensity={10.5} distance={10.5}/>
    <pointLight position={[1.20,1.90,-.72]} color="#a1cfb4" intensity={1.8} distance={7.5}/>
  </group>
}

function galaxyPositions(seed:number,count:number,scale:number){
  const p:number[]=[]
  for(let i=0;i<count;i++){
    const t=i/count,arm=i%4,angle=t*Math.PI*9+arm*Math.PI*.5+seed
    const r=.18+Math.pow(t,.72)*scale
    const x=-2.10+Math.cos(angle)*r*(.78+.12*Math.sin(i*.37))
    const y=1.52+Math.sin(angle)*r*.42+(.5-t)*.74+.12*Math.sin(i*.91)
    const z=-.52+Math.sin(angle*.47+i*.03)*r*.35-.38*t
    p.push(x,y,z)
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));return g
}

function nebulaGeometry(layer:number){
  const g=new THREE.SphereGeometry(1,56,36)
  const p=g.getAttribute('position') as THREE.BufferAttribute
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x)
    const f=1+.10*Math.sin(a*3+y*5+layer)+.045*Math.sin(a*7-y*9)
    p.setXYZ(i,x*(1.75-layer*.18)*f,y*(1.05-layer*.10)*f,z*(.56+layer*.07)*f)
  }
  g.computeVertexNormals();return g
}

function LifeMapObservatory({onLifeMap}:{onLifeMap:()=>void}){
  const y=height(LIFE_MAP.x,LIFE_MAP.z)
  const starsA=useMemo(()=>galaxyPositions(.2,420,2.05),[]),starsB=useMemo(()=>galaxyPositions(1.1,260,1.55),[])
  const nebulae=useMemo(()=>Array.from({length:3},(_,i)=>nebulaGeometry(i)),[])
  return <group position={[LIFE_MAP.x,y+.02,LIFE_MAP.z]} name="home-v225-v2-life-map-lineage-observatory" onClick={e=>{e.stopPropagation();onLifeMap()}}>
    <group position={[-.25,.10,0]}>
      {nebulae.map((g,i)=><mesh key={i} geometry={g} position={[-2.08,1.45,-.58-i*.10]} rotation={[.12+i*.06,-.10,.18-i*.11]} scale={[1,1,1]}><meshPhysicalMaterial color={i===0?'#3c7d70':i===1?'#66547b':'#8a724f'} emissive={i===0?'#174b40':i===1?'#3e2d50':'#5e4627'} emissiveIntensity={.22} transparent opacity={.10+i*.025} depthWrite={false} side={THREE.DoubleSide} roughness={.52}/></mesh>)}
      <points geometry={starsA}><pointsMaterial color="#b8ead8" size={.045} transparent opacity={.88} depthWrite={false} sizeAttenuation/></points>
      <points geometry={starsB}><pointsMaterial color="#d8b9eb" size={.034} transparent opacity={.76} depthWrite={false} sizeAttenuation/></points>
      <mesh position={[-2.08,1.52,-.52]} scale={[.22,.22,.22]}><sphereGeometry args={[1,32,22]}/><meshPhysicalMaterial color="#fff0bc" emissive="#e8b85f" emissiveIntensity={2.4} roughness={.24}/></mesh>
      {Array.from({length:14},(_,i)=>{const a=i*.83,r=.52+(i%5)*.23;return <mesh key={i} position={[-2.08+Math.cos(a)*r,1.52+Math.sin(a*1.3)*r*.42,-.52+Math.sin(a)*r*.24]} scale={[.045+(i%3)*.012,.045+(i%3)*.012,.045+(i%3)*.012]}><sphereGeometry args={[1,18,12]}/><meshStandardMaterial color={i%3===0?'#efd99a':i%2?'#9edac5':'#c5a8d6'} emissive={i%3===0?'#9b6e2f':i%2?'#3c846d':'#6d4e80'} emissiveIntensity={1.3}/></mesh>})}
    </group>
    <pointLight position={[-2.35,1.65,-.32]} color="#94dfc3" intensity={3.8} distance={7.8}/>
    <pointLight position={[-1.30,2.35,-.80]} color="#c3a0d4" intensity={1.9} distance={6.6}/>
  </group>
}

function livingHeartGeometry(){
  const shape=new THREE.Shape()
  shape.moveTo(0,-1.18)
  shape.bezierCurveTo(-.34,-.82,-1.22,-.36,-1.18,.44)
  shape.bezierCurveTo(-1.14,1.04,-.52,1.22,-.08,.75)
  shape.bezierCurveTo(.02,.64,.06,.54,.08,.43)
  shape.bezierCurveTo(.18,.66,.30,.82,.50,.94)
  shape.bezierCurveTo(.94,1.18,1.27,.78,1.19,.30)
  shape.bezierCurveTo(1.08,-.38,.44,-.88,0,-1.18)
  const g=new THREE.ExtrudeGeometry(shape,{depth:.58,bevelEnabled:true,bevelSegments:6,steps:3,bevelSize:.13,bevelThickness:.16,curveSegments:40})
  g.center()
  const p=g.getAttribute('position') as THREE.BufferAttribute
  const colors=new Float32Array(p.count*3)
  const deep=new THREE.Color('#0c3027'),green=new THREE.Color('#388b70'),warm=new THREE.Color('#c17b61'),pale=new THREE.Color('#acd6c1')
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),y=p.getY(i),z=p.getZ(i)
    const fold=1+.045*Math.sin(y*5.8+x*4.1)+.020*Math.sin(y*11-z*7)
    x=(x*.86+.07*y+.035*Math.sin(y*6))*fold
    y=y*.82+.045*Math.sin(x*5+z*8)
    z=(z-.03)*(.92+.10*Math.cos(y*4))+ .045*Math.sin(x*5+y*3)
    p.setXYZ(i,x,y,z)
    const band=.5+.5*Math.sin(y*6+x*3.5),side=Math.max(0,x*.55+.5)
    const c=deep.clone().lerp(green,.35+.30*band).lerp(warm,.18*Math.max(0,-x+.3)).lerp(pale,.10*side)
    colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b
  }
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.computeVertexNormals();return g
}

function orbVein(index:number){
  const side=index%2?-1:1
  const points=Array.from({length:34},(_,i)=>{const t=i/33;return new THREE.Vector3(side*(.08+t*.42+.08*Math.sin(t*Math.PI*2+index)),.58-t*1.12+.05*Math.sin(t*7+index),.34+.05*Math.sin(t*5+index))})
  return tube(points,.0075+index*.00025,7)
}

type Posture={s:V3;r:V3;speed:number}
const posture:Record<OrbState,Posture>={
  dormant:{s:[.92,.89,.91],r:[.04,-.06,-.03],speed:.10},idle:{s:[1,.99,.98],r:[-.04,.05,-.02],speed:.30},
  attention:{s:[1.035,1.05,.96],r:[-.10,.12,.05],speed:.62},listening:{s:[.98,1.04,.97],r:[.08,-.06,-.04],speed:.22},
  thinking:{s:[1.02,.99,1.01],r:[-.11,.14,.07],speed:.18},speaking:{s:[1.045,1.03,.97],r:[.03,-.02,-.08],speed:.80},
  guiding:{s:[.99,1.055,.96],r:[-.12,.02,.08],speed:.42},reflecting:{s:[.99,.98,1.025],r:[.10,.08,-.06],speed:.14},
  calming:{s:[1.01,.97,.99],r:[-.02,-.04,.02],speed:.12},privacy:{s:[.91,.91,.90],r:[.12,.08,.10],speed:.08},
  warning:{s:[1.04,1.045,.95],r:[-.14,-.06,-.10],speed:.95},transition:{s:[.95,1.06,.93],r:[-.14,.04,.10],speed:.65},
}

function LivingMemoryOrb({state,reducedMotion,onOrb}:{state:OrbState;reducedMotion:boolean;onOrb:()=>void}){
  const group=useRef<THREE.Group>(null),geometry=useMemo(livingHeartGeometry,[]),veins=useMemo(()=>Array.from({length:9},(_,i)=>orbVein(i)),[]),p=posture[state]
  useFrame(({clock})=>{if(!group.current)return;const t=clock.elapsedTime*p.speed;const breath=reducedMotion?1:1+Math.sin(t*.78)*.007;group.current.scale.set(p.s[0]*breath,p.s[1]*breath,p.s[2]*breath);group.current.rotation.set(p.r[0],p.r[1]+(reducedMotion?0:Math.sin(t*.70)*.016),p.r[2])})
  const warning=state==='warning',activate=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onOrb()}
  return <group ref={group} position={ORB} name="home-v225-v2-intimate-veined-living-memory-orb" onClick={activate}>
    <mesh geometry={geometry} position={[0,-.18,0]} scale={[.62,.72,.72]} castShadow><meshPhysicalMaterial vertexColors roughness={.50} clearcoat={.05} clearcoatRoughness={.85} sheen={.18} sheenColor="#6ba58e" emissive="#123a30" emissiveIntensity={.17}/></mesh>
    <group position={[0,-.18,0]} scale={[.62,.72,.72]} name="home-v225-v2-orb-embedded-memory-veins">{veins.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color={warning?'#dc7765':i%2?'#a6d6bf':'#d39a80'} emissive={warning?'#8b352d':i%2?'#3a785f':'#875039'} emissiveIntensity={.66} roughness={.52}/></mesh>)}</group>
    <mesh position={[0,-.18,0]} scale={[.82,.92,.72]} onClick={activate}><sphereGeometry args={[1,24,18]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.02,-.02,.35]} color={warning?'#d76b5a':'#87ddbb'} intensity={state==='dormant'?.16:.92} distance={3.8}/>
  </group>
}

function AtmosphericDepth(){
  const field=useMemo(()=>{const pts:number[]=[];for(let i=0;i<240;i++){const a=i*2.39996323,r=2.2+((i*37)%100)/100*9.2;pts.push(Math.cos(a)*r,.42+((i*29)%100)/100*4.2,3.5-((i*53)%100)/100*19.4)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));return g},[])
  return <group name="home-v225-v2-bounded-atmospheric-depth"><points geometry={field}><pointsMaterial color="#bad8c8" size={.017} transparent opacity={.22} depthWrite={false}/></points><pointLight position={[0,3.8,-12]} color="#79aa97" intensity={.9} distance={15}/><pointLight position={[-3.0,2.0,-8]} color="#de9a67" intensity={1.3} distance={10}/><pointLight position={[3.0,2.4,-9]} color="#93b8ad" intensity={.8} distance={10}/></group>
}

export function HomeV225PolishV2({orbState,reducedMotion,onOrb,onGround,onLifeMap,onWalk}:{orbState:OrbState;reducedMotion:boolean;onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onWalk:WalkHandler}){
  return <group name="home-v225-v2-production-memory-sanctuary"><RetireRejectedPresentation/><MemoryValley onWalk={onWalk}/><GroundHearth onGround={onGround}/><LifeMapObservatory onLifeMap={onLifeMap}/><LivingMemoryOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><AtmosphericDepth/></group>
}
