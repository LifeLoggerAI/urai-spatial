'use client'

import { useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'

export const T = [
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp',
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp',
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp',
] as const

export const SPAWN = new THREE.Vector3(0, .04, 4.6)
export const ORB=new THREE.Vector3(-.45,1.02,-7.45)
export const GROUND = new THREE.Vector3(-4.85, 0, -8.25)
export const LIFE_MAP = new THREE.Vector3(4.85, 0, -8.25)
export const BOUNDS = { minX: -7.5, maxX: 7.5, minZ: -14.4, maxZ: 6.8 }

type PbrMaps = [THREE.Texture, THREE.Texture, THREE.Texture]

function maps(): PbrMaps {
  const [c, n, a] = useTexture(T as unknown as string[])
  return useMemo(() => [c, n, a].map((source, index) => {
    const texture = source.clone()
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(5.2, 7.8)
    texture.anisotropy = 8
    texture.colorSpace = index ? THREE.NoColorSpace : THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }) as PbrMaps, [a, c, n])
}

export function height(x: number, z: number) {
  const depth = THREE.MathUtils.clamp((5.8 - z) / 24, 0, 1)
  const lateral = Math.abs(x) / 8.6
  const bowl = .48 * Math.pow(lateral, 2.35) * (.35 + .8 * depth)
  const und = .055 * Math.sin(x * .65 + z * .28) + .035 * Math.sin(x * 1.7 - z * .43) + .018 * Math.cos(x * 3.1 + z * 1.1)
  const meander = -.09 * Math.exp(-Math.pow((x - .35 * Math.sin((z + 4) * .22)) / 1.55, 4))
  const groundBasin = -.20 * Math.exp(-(Math.pow((x + 4.85) / 1.7, 2) + Math.pow((z + 8.25) / 2.1, 2)))
  const mapBasin = -.18 * Math.exp(-(Math.pow((x - 4.85) / 1.7, 2) + Math.pow((z + 8.25) / 2.1, 2)))
  return -.58 + .08 * depth + bowl + und + meander + groundBasin + mapBasin
}

function floorGeometry() {
  const xs = 100, zs = 100, positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
  const c0 = new THREE.Color('#172d29'), c1 = new THREE.Color('#596b58'), c2 = new THREE.Color('#8a7156')
  for (let iz=0; iz<=zs; iz++) {
    const vz=iz/zs, z=5.8-vz*24
    for (let ix=0; ix<=xs; ix++) {
      const vx=ix/xs, rawX=-8.6+vx*17.2
      const x=rawX+.07*Math.sin(z*.53+rawX*.19)*Math.pow(Math.abs(rawX)/8.6,1.4)
      const zz=z+.045*Math.sin(rawX*.72-z*.17), y=height(x,zz)
      positions.push(x,y,zz); uvs.push(vx*5.2,vz*7.8)
      const lateral=Math.min(1,Math.abs(x)/8.6), band=.5+.5*Math.sin(y*8+x*.4)
      const color=c0.clone().lerp(c1,.30+.36*(1-lateral)).lerp(c2,.08+.10*band)
      colors.push(color.r,color.g,color.b)
    }
  }
  for(let z=0;z<zs;z++)for(let x=0;x<xs;x++){const a=z*(xs+1)+x,b=a+1,c=a+xs+1,d=c+1;(x+z)&1?indices.push(a,b,d,a,d,c):indices.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function cliffGeometry(side:-1|1,z0:number,z1:number,seed:number) {
  const ns=34,nv=9,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const dark=new THREE.Color('#243b33'), mid=new THREE.Color('#66745d'), warm=new THREE.Color('#806950')
  for(let j=0;j<=ns;j++){
    const s=j/ns,z=z0+(z1-z0)*s,depth=THREE.MathUtils.clamp((5.8-z)/24,0,1)
    const baseX=side*(5.35+.55*Math.sin(z*.24+seed)+.18*Math.sin(z*.77-seed)),baseY=height(baseX*.92,z)-.05,h=1.8+2.15*depth+.35*Math.sin(z*.31+seed)
    for(let k=0;k<=nv;k++){
      const t=k/nv,over=(.15+.72*Math.pow(Math.sin(t*Math.PI),1.7))*(.55+.45*depth)
      const x=baseX-side*over+side*.08*Math.sin(t*8+z*.3+seed),y=baseY+t*h+.10*Math.sin(t*9+z*.45+seed),zz=z+.10*Math.sin(t*Math.PI*2+seed+s*4)
      positions.push(x,y,zz);const band=.5+.5*Math.sin(y*5.4+z*.7+seed);const color=dark.clone().lerp(mid,.18+.42*t).lerp(warm,.12*band);colors.push(color.r,color.g,color.b)
    }
  }
  const row=nv+1;for(let j=0;j<ns;j++)for(let k=0;k<nv;k++){const a=j*row+k,b=a+1,c=a+row,d=c+1;indices.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function rootedRib(side:-1|1,index:number,distant=false){
  const points:THREE.Vector3[]=[]
  if(distant){const z=-11-index*1.7;for(let i=0;i<17;i++){const t=i/16;points.push(new THREE.Vector3(side*(7-2*Math.pow(Math.sin(t*Math.PI),1.3)),.45+4.5*Math.pow(Math.sin(t*Math.PI),1.1)+index*.18,z-1.25*t+.22*Math.sin(t*Math.PI*2+index)))}}
  else {const z0=2.3-index*2.45;for(let i=0;i<18;i++){const t=i/17,z=z0-3.9*t+.18*Math.sin(t*Math.PI*2+index),edge=side*(5.25-.45*Math.sin(t*Math.PI)+.18*Math.sin(index*1.7));points.push(new THREE.Vector3(edge-side*(.45+.45*Math.sin(t*Math.PI)),height(edge*.95,z)+.15+2.8*Math.pow(Math.sin(t*Math.PI),1.15),z))}}
  const curve=new THREE.CatmullRomCurve3(points,false,'centripetal',.4);return new THREE.TubeGeometry(curve,distant?64:48,distant?.23:.19,distant?8:7,false)
}

function floorCollisionGeometry(){const xs=64,zs=72,pos:number[]=[],idx:number[]=[];for(let iz=0;iz<=zs;iz++){const z=5.8-iz/zs*24;for(let ix=0;ix<=xs;ix++){const x=-8.6+ix/xs*17.2;pos.push(x,height(x,z),z)}}for(let iz=0;iz<zs;iz++)for(let ix=0;ix<xs;ix++){const a=iz*(xs+1)+ix,b=a+1,c=a+xs+1,d=c+1;idx.push(a,b,c,b,d,c)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}

function SanctuaryLandscape(){
  const m=maps(),floor=useMemo(floorGeometry,[])
  const cliffs=useMemo(()=>{const segments:[[number,number],[number,number],[number,number],[number,number]]=[[3.2,-2.4],[-2,-7.8],[-7.4,-13.2],[-12.8,-18.2]];return [-1,1].flatMap((rawSide)=>segments.map(([a,b],i)=>({side:rawSide as -1|1,g:cliffGeometry(rawSide as -1|1,a,b,10+i+rawSide*2),i})))},[])
  const ribs=useMemo(()=>Array.from({length:8},(_,i)=>({g:rootedRib((i%2?-1:1) as -1|1,i)})),[])
  const distant=useMemo(()=>Array.from({length:8},(_,i)=>({g:rootedRib((i%2?-1:1) as -1|1,Math.floor(i/2),true)})),[])
  return <group name="home-v224-authored-inhabited-sanctuary">
    <mesh geometry={floor} receiveShadow name="home-v224-sculpted-sanctuary-floor"><meshStandardMaterial map={m[0]} normalMap={m[1]} roughnessMap={m[2]} normalScale={new THREE.Vector2(.34,.34)} vertexColors roughness={.94}/></mesh>
    {cliffs.map((x,k)=><mesh key={`c${k}`} geometry={x.g} castShadow receiveShadow name={`home-v224-${x.side<0?'port':'starboard'}-weathered-strata-${x.i+1}`}><meshStandardMaterial vertexColors roughness={.91}/></mesh>)}
    {ribs.map((x,k)=><mesh key={`r${k}`} geometry={x.g} castShadow receiveShadow name={`home-v224-rooted-memory-rib-${k+1}`}><meshStandardMaterial color={k%2?'#40594a':'#4a5e4d'} roughness={.88}/></mesh>)}
    {distant.map((x,k)=><mesh key={`d${k}`} geometry={x.g} castShadow receiveShadow name={`home-v224-distant-strata-buttress-${k+1}`}><meshStandardMaterial color={k%2?'#30483d':'#394d40'} roughness={.92}/></mesh>)}
  </group>
}

function curvedWallGeometry(kind:'ground'|'life-map'){const nu=52,nv=15,pos:number[]=[],col:number[]=[],idx:number[]=[];const base=new THREE.Color(kind==='ground'?'#365345':'#45435a'),hi=new THREE.Color(kind==='ground'?'#9a7b5a':'#8f79a5');for(let i=0;i<=nu;i++){const u=i/nu,angle=THREE.MathUtils.degToRad(205+130*u),radius=2.15+.22*Math.sin(u*Math.PI*3),bx=radius*Math.cos(angle),bz=-.7+radius*Math.sin(angle);for(let j=0;j<=nv;j++){const v=j/nv,h=(1.55+.45*Math.sin(u*Math.PI))*v,x=bx+.18*Math.cos(angle)*v+.05*Math.sin(v*8+u*10),z=bz+.18*Math.sin(angle)*v,y=-.10+h+.06*Math.sin(u*13+v*5)-.22*Math.pow(v,5)*(.5+.5*Math.sin(u*17));pos.push(x,y,z);const c=base.clone().lerp(hi,.16+.32*v);col.push(c.r,c.g,c.b)}}const row=nv+1;for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*row+j,b=a+1,c=a+row,d=c+1;idx.push(a,b,c,b,d,c)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g}
function pathGeometry(kind:'ground'|'life-map'){const n=48,cross=7,pos:number[]=[],idx:number[]=[],centers:THREE.Vector3[]=[];for(let i=0;i<=n;i++){const t=i/n;centers.push(new THREE.Vector3((kind==='ground'?.25:-.2)+.5*Math.sin(t*Math.PI*1.6)*(1-t*.3),-.13+.16*t+(kind==='ground'?.02:.09*t),2.6-4.8*t))}for(let i=0;i<=n;i++){const tangent=centers[Math.min(i+1,n)].clone().sub(centers[Math.max(0,i-1)]).normalize(),side=new THREE.Vector3(tangent.z,0,-tangent.x).normalize();for(let j=0;j<cross;j++){const s=j/(cross-1)-.5,w=(kind==='ground'?.78:.72)*(.85+.15*Math.sin(i*.25)),p=centers[i].clone().addScaledVector(side,s*w);p.y+=.035*Math.cos(s*Math.PI*2);pos.push(p.x,p.y,p.z)}}for(let i=0;i<n;i++)for(let j=0;j<cross-1;j++){const a=i*cross+j,b=a+1,c=a+cross,d=c+1;idx.push(a,b,c,b,d,c)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
function lifeLedgerGeometry(){const nu=60,nv=18,pos:number[]=[],col:number[]=[],idx:number[]=[];const base=new THREE.Color('#403d52'),hi=new THREE.Color('#8877a0');for(let i=0;i<=nu;i++){const u=i/nu,x=-2.3+4.6*u,peaks=1.1*Math.exp(-Math.pow((x+1.2)/.7,2))+1.65*Math.exp(-Math.pow((x-.05)/.75,2))+1.25*Math.exp(-Math.pow((x-1.4)/.65,2)),maxh=.55+peaks;for(let j=0;j<=nv;j++){const v=j/nv,y=-.05+v*maxh-.18*Math.pow(v,5)*(.5+.5*Math.sin(x*5.7)),z=-1.55-.4*v+.22*Math.sin(x*1.35)+.06*Math.sin(v*9+x*4);pos.push(x,y,z);const c=base.clone().lerp(hi,.12+.42*v);col.push(c.r,c.g,c.b)}}const row=nv+1;for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*row+j,b=a+1,c=a+row,d=c+1;idx.push(a,b,c,b,d,c)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g}

function GroundPlace(){const wall=useMemo(()=>curvedWallGeometry('ground'),[]),path=useMemo(()=>pathGeometry('ground'),[]),hearth=useMemo(()=>new THREE.SphereGeometry(.5,28,16),[]),y=height(GROUND.x,GROUND.z);return <group position={[GROUND.x,y,GROUND.z]} rotation={[0,.14,0]} name="home-v223-ground-sheltered-memory-basin"><mesh geometry={wall} castShadow receiveShadow name="home-v197-ground-continuous-sheltering-memory-wall"><meshStandardMaterial vertexColors roughness={.88}/></mesh><mesh geometry={path} receiveShadow name="home-v197-ground-grown-in-place-memory-path"><meshStandardMaterial color="#82735d" roughness={.93}/></mesh><mesh geometry={hearth} position={[-.55,.08,-.75]} scale={[1,.34,1.25]} castShadow name="home-v203-ground-embedded-weathered-hearth"><meshStandardMaterial color="#9f7650" emissive="#8f4f2d" emissiveIntensity={.18} roughness={.85}/></mesh><pointLight position={[-.55,.55,-.65]} color="#e3a36b" intensity={2.1} distance={5}/><pointLight position={[.85,1.3,-.95]} color="#9cc4aa" intensity={.65} distance={4}/></group>}
function LifeMapPlace(){const wall=useMemo(lifeLedgerGeometry,[]),path=useMemo(()=>pathGeometry('life-map'),[]),traces=useMemo(()=>Array.from({length:4},(_,k)=>{const pts=Array.from({length:12},(_,i)=>{const t=i/11;return new THREE.Vector3(-1.7+k*1.05+.22*Math.sin(t*Math.PI*2+k),.02+.18*t+.10*k*t,1.6-3.2*t+.12*Math.sin(t*Math.PI*3+k))});return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),36,.026+k*.003,6,false)}),[]),y=height(LIFE_MAP.x,LIFE_MAP.z);return <group position={[LIFE_MAP.x,y,LIFE_MAP.z]} rotation={[0,-.14,0]} name="home-v223-life-map-ascending-memory-terraces"><mesh geometry={wall} castShadow receiveShadow name="home-v200-life-map-integrated-weathered-memory-ledger-1"><meshStandardMaterial vertexColors roughness={.82} emissive="#29253c" emissiveIntensity={.08}/></mesh><mesh geometry={path} receiveShadow name="home-v197-life-map-ascending-observatory-path"><meshStandardMaterial color="#716b83" roughness={.88}/></mesh>{traces.map((g,k)=><mesh key={k} geometry={g} name={`home-v203-life-map-embedded-lineage-trace-${k+1}`}><meshStandardMaterial color="#9b8bae" emissive="#655779" emissiveIntensity={.25} roughness={.72}/></mesh>)}<pointLight position={[-.3,1.2,-.55]} color="#8fd8bc" intensity={1.5} distance={5}/><pointLight position={[.8,1.6,-1]} color="#b39bd4" intensity={1} distance={4.4}/></group>}
export function DestinationLights(){return <><GroundPlace/><LifeMapPlace/></>}

function orbGeometry(){const nu=96,nv=64,pos:number[]=[],col:number[]=[],idx:number[]=[];const deep=new THREE.Color('#193a35'),teal=new THREE.Color('#65ad95'),warm=new THREE.Color('#c08c66'),pale=new THREE.Color('#a7d1c0');for(let j=0;j<=nv;j++){const v=j/nv,phi=Math.PI*v,sy=Math.cos(phi),s=Math.sin(phi);for(let i=0;i<nu;i++){const theta=2*Math.PI*i/nu,upper=.18*Math.pow(Math.max(0,sy),1.4),width=(.66+.28*upper+.10*Math.sin(theta*3+phi*1.3))*s,depth=(.54+.07*Math.sin(theta*2.2-phi))*s;let x=width*Math.cos(theta),z=depth*Math.sin(theta),y=.92*sy;const crown=Math.pow(Math.max(0,sy),2);y+=.16*crown*Math.pow(Math.abs(Math.cos(theta)),1.6)-.11*crown*Math.exp(-Math.pow(Math.cos(theta)/.24,2));const taper=.72+.28*(v<.55?1:0)+.12*Math.cos(theta-.55)*s*s;x*=taper;z*=.90+.08*Math.sin(theta+.4)*s;x+=.09*s*s*Math.cos(theta-.7)-.05*v;z+=.045*Math.sin(theta*2+phi*1.7)*s;const ang=((theta-.55+Math.PI)%(2*Math.PI))-Math.PI,dimple=Math.exp(-Math.pow(ang/.48,2)-Math.pow((phi-1.15)/.48,2));x*=1-.14*dimple;z*=1-.19*dimple;y-=.06*dimple;const ripple=1+.018*Math.sin(phi*13+theta*2.5)+.010*Math.sin(phi*21-theta*4);x*=ripple;z*=ripple;y*=1+.009*Math.sin(theta*5+phi*7);pos.push(x,y,z);const band=.5+.5*Math.sin(phi*8.5+theta*2.2);const c=deep.clone().lerp(teal,.28+.34*band).lerp(pale,.10*Math.max(0,Math.cos(theta-.6))*s).lerp(warm,.14*Math.max(0,Math.cos(theta+1))*s*s);col.push(c.r,c.g,c.b)}}for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const ni=(i+1)%nu,a=j*nu+i,b=j*nu+ni,c=(j+1)*nu+i,d=(j+1)*nu+ni;idx.push(a,b,c,b,d,c)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g}
function orbInteractionGeometry(){const g=new THREE.IcosahedronGeometry(1,2);g.scale(.65,.9,.58);return g}
type Posture={s:[number,number,number];r:[number,number,number];speed:number};const P:Record<OrbState,Posture>={dormant:{s:[.82,.78,.84],r:[.10,-.12,-.08],speed:.10},idle:{s:[1,.96,.94],r:[-.08,.08,-.05],speed:.36},attention:{s:[1.08,1.02,.90],r:[-.18,.18,.13],speed:.72},listening:{s:[.94,1.08,.92],r:[.18,-.12,-.10],speed:.27},thinking:{s:[1.08,.94,1.02],r:[-.22,.24,.16],speed:.22},speaking:{s:[1.12,1.02,.90],r:[.08,-.04,-.18],speed:1.04},guiding:{s:[.94,1.10,.90],r:[-.24,.02,.16],speed:.50},reflecting:{s:[.96,.94,1.08],r:[.20,.12,-.14],speed:.16},calming:{s:[1.04,.92,.98],r:[-.03,-.06,.05],speed:.14},privacy:{s:[.84,.86,.82],r:[.24,.14,.20],speed:.08},warning:{s:[1.12,1.02,.86],r:[-.28,-.10,-.22],speed:1.30},transition:{s:[.88,1.12,.86],r:[-.30,.08,.22],speed:.86}}
export function Orb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){const group=useRef<THREE.Group>(null),geometry=useMemo(orbGeometry,[]),collision=useMemo(orbInteractionGeometry,[]),posture=P[state];useFrame(({clock})=>{if(!group.current)return;const t=clock.elapsedTime*posture.speed,breath=reducedMotion?1:1+Math.sin(t*.82)*.018;group.current.scale.set(posture.s[0]*breath,posture.s[1]*breath,posture.s[2]*breath);group.current.rotation.set(posture.r[0],posture.r[1]+(reducedMotion?0:Math.sin(t*.92)*.045),posture.r[2])});const warning=state==='warning';return <group ref={group} name="home-v223-open-cavity-living-memory-presence" position={ORB} onClick={(e)=>{e.stopPropagation();onOpen()}}><mesh geometry={geometry} position={[0,.48,0]} scale={[1.72,1.72,1.72]} castShadow name="home-v201-single-connected-folded-living-memory-mantle"><meshPhysicalMaterial color="#d4e6dc" vertexColors roughness={.43} clearcoat={.34} clearcoatRoughness={.62} sheen={.18} sheenColor="#76b9a3" emissive="#174d40" emissiveIntensity={.16}/></mesh><mesh geometry={collision} position={[0,.48,0]} scale={[1.8,1.8,1.8]}><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh><pointLight position={[.12,.55,.38]} color={warning?'#d56d54':'#72d3b2'} intensity={state==='dormant'?.3:1.5} distance={4.5}/><pointLight position={[-.5,.95,-.25]} color="#d6a878" intensity={state==='dormant'?.1:.36} distance={2.8}/></group>}

export function Terrain({walk,onGround,onLifeMap}:{walk:(event:ThreeEvent<MouseEvent>)=>void;onGround:()=>void;onLifeMap:()=>void}){const collision=useMemo(floorCollisionGeometry,[]);const activate=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();const gd=Math.hypot(event.point.x-GROUND.x,event.point.z-GROUND.z),ld=Math.hypot(event.point.x-LIFE_MAP.x,event.point.z-LIFE_MAP.z);gd<2.55?onGround():ld<2.55?onLifeMap():walk(event)};return <group name="home-v223-weathered-valley-floor" onClick={activate}><SanctuaryLandscape/><mesh geometry={collision} visible={false} onClick={activate}/></group>}
export function Escarpment({side}:{side:-1|1}){return <group name={side<0?'home-v223-port-broken-strata':'home-v223-starboard-broken-strata'} userData={{visualSource:'authored-v224-runtime-topology',side}}/>}
useTexture.preload(T as unknown as string[])
