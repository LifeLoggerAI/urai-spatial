"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { DESTINATIONS, type GroundDestination } from "./GroundWorldModel";

// Original architectural arrangement; surface scans retain their existing CC0
// Poly Haven provenance in assets/urai/home-production. No new external assets.
const SURFACE = "/assets/urai/home-production/cc0/rock-tile-floor/";
const PROFILES: Record<string, [number, number, number]> = {
  reception: [6.2, 3.2, 2.4], privacy: [5.4, 4.8, 2.8], council: [7.4, 4.1, 2.7],
  logistics: [4.4, 3.6, 2.1], wellness: [5.4, 2.9, 2.5], archive: [5.8, 5.7, 2.5],
  mirror: [4.6, 4.3, 2.1], passport: [5.2, 4.6, 2.5], consent: [4.1, 3.7, 2.1],
  atlas: [5.2, 4.4, 2.6], focus: [4.2, 4.9, 2.2], replay: [6.5, 3.5, 2.5],
};

// Architectural walls share their positions with navigation collision. The
// approach point and front of every threshold remain open at floor level.
export const GROUND_ARCHITECTURAL_OBSTACLES = DESTINATIONS.flatMap((destination) => {
  const [width, , depth] = PROFILES[destination.id];
  const [x, , z] = destination.position;
  const samples = Math.ceil(width / 0.65);
  return Array.from({ length: samples + 1 }, (_, index) => ({
    x: x - width / 2 + width * index / samples,
    z: z - depth,
    radius: 0.48,
  })).filter((obstacle) => Math.abs(obstacle.x - x) > 1.6);
});

function dressedStone(width: number, height: number, depth: number, variant: number) {
  const shape = new THREE.Shape();
  const chip = Math.min(0.17 + variant % 3 * 0.055, height * 0.1);
  shape.moveTo(-width / 2 + chip, 0);
  shape.lineTo(width / 2 - chip * 0.6, 0);
  shape.lineTo(width / 2, chip * 0.8);
  shape.lineTo(width / 2 - chip * 0.3, height * 0.61);
  shape.lineTo(width / 2 - chip * 0.2, height - chip);
  shape.lineTo(width / 2 - chip * 1.3, height);
  shape.lineTo(-width / 2 + chip * 0.2, height - chip * 0.45);
  shape.lineTo(-width / 2, height * 0.86);
  shape.lineTo(-width / 2 + chip * 0.18, chip);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSegments: 2, steps: 1,
    bevelSize: 0.055, bevelThickness: 0.035, curveSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function Stone({ position, size, material, variant = 0, rotation = 0 }: {
  position: [number, number, number]; size: [number, number, number];
  material: THREE.Material; variant?: number; rotation?: number;
}) {
  const geometry = useMemo(() => dressedStone(...size, variant), [size[0], size[1], size[2], variant]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh position={position} rotation={[0, rotation, 0]} geometry={geometry} material={material} castShadow receiveShadow />;
}

function caveRockGeometry(seed:number){
  const geometry=new THREE.IcosahedronGeometry(1,3),position=geometry.getAttribute("position") as THREE.BufferAttribute,point=new THREE.Vector3()
  for(let index=0;index<position.count;index+=1){point.fromBufferAttribute(position,index);const n=point.clone().normalize(),breakup=1+.15*Math.sin(n.x*7.1+n.z*4.7+seed*.71)+.08*Math.sin(n.y*13.2-n.x*5.4+seed*1.17);point.multiplyScalar(breakup);position.setXYZ(index,point.x,point.y,point.z)}
  position.needsUpdate=true;geometry.computeVertexNormals();return geometry
}

function CaveRock({position,scale,rotation,material,seed}:{position:[number,number,number];scale:[number,number,number];rotation:[number,number,number];material:THREE.Material;seed:number}){
  const geometry=useMemo(()=>caveRockGeometry(seed),[seed]);useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh geometry={geometry} position={position} scale={scale} rotation={rotation} material={material} castShadow receiveShadow/>
}

function caveFloorGeometry(){
  const geometry=new THREE.PlaneGeometry(60,70,72,84);geometry.rotateX(-Math.PI/2);geometry.translate(0,-.12,-12)
  const position=geometry.getAttribute("position") as THREE.BufferAttribute,colors:number[]=[],deep=new THREE.Color("#4a5148"),worn=new THREE.Color("#81735d"),moss=new THREE.Color("#5c6b61")
  for(let index=0;index<position.count;index+=1){const x=position.getX(index),z=position.getZ(index),edge=Math.max(0,(Math.abs(x)-11)/18),height=.08*Math.sin(x*.57+z*.31)+.045*Math.sin(x*1.7-z*.83)-edge*.18;position.setY(index,position.getY(index)+height);const path=Math.exp(-x*x/22),c=deep.clone().lerp(worn,.18+path*.28).lerp(moss,.12+.08*Math.sin(z*.19));colors.push(c.r,c.g,c.b)}
  geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));position.needsUpdate=true;geometry.computeVertexNormals();return geometry
}

export default function GroundPhysicalArchitecture({ activeId, onSelect }: {
  activeId: string | null; onSelect: (destination: GroundDestination) => void;
}) {
  const maps = useTexture([
    `${SURFACE}rock-tile-floor-diff-1k.webp`,
    `${SURFACE}rock-tile-floor-normal-gl-1k.webp`,
    `${SURFACE}rock-tile-floor-arm-1k.webp`,
  ]);
  const materials = useMemo(() => {
    const textures = maps.map((source, index) => {
      const texture = source.clone();
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(0.45, 0.45);
      texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      return texture;
    });
    const create = (color: string, roughness: number) => new THREE.MeshStandardMaterial({
      color, map: textures[0], normalMap: textures[1], roughnessMap: textures[2],
      normalScale: new THREE.Vector2(0.58, 0.58), roughness, metalness: 0,
      envMapIntensity: 0.22,
    });
    const floorMaps = textures.map((source) => {
      const texture = source.clone(); texture.repeat.set(18, 22); texture.needsUpdate = true; return texture;
    });
    const floor = create("#b5b3a0", 0.97);
    floor.map = floorMaps[0]; floor.normalMap = floorMaps[1]; floor.roughnessMap = floorMaps[2];
    return { pale: create("#b9b29c", 0.95), dark: create("#797c71", 0.98),
      warm: create("#b4a084", 0.94), floor, textures: [...textures, ...floorMaps] };
  }, [maps]);
  useEffect(() => () => {
    materials.pale.dispose(); materials.dark.dispose(); materials.warm.dispose(); materials.floor.dispose();
    materials.textures.forEach((texture) => texture.dispose());
  }, [materials]);
  const caveFloor=useMemo(caveFloorGeometry,[]);useEffect(()=>()=>caveFloor.dispose(),[caveFloor])
  const perimeter=useMemo(()=>Array.from({length:30},(_,index)=>{const side=index%2?-1:1,row=Math.floor(index/2),z=10-row*3.45,jitter=Math.sin(index*4.71);return {position:[side*(14.7+(index%3)*.35),2.1+(index%4)*.34,z] as [number,number,number],scale:[2.8+(index%3)*.55,3.1+(index%5)*.42,2.5+(index%4)*.38] as [number,number,number],rotation:[jitter*.22,index*.73,jitter*.18] as [number,number,number]}}),[])

  return <group name="ground-physical-cut-stone-infrastructure" userData={{
    authoredBy: "URAI original cut-stone architecture", surfaceSource: "existing governed CC0 rock-tile-floor",
    visualRole: "inhabitable-thresholds-and-connected-courtyard",
  }}>
    <mesh geometry={caveFloor} receiveShadow><meshStandardMaterial vertexColors roughness={.99} metalness={0}/></mesh>
    {perimeter.map((rock,index)=><CaveRock key={index} {...rock} material={index%4===0?materials.warm:materials.dark} seed={index+40}/>)}
    {[-30,-18,-6,7].flatMap((z,row)=>[-8,2,10].map((x,column)=><CaveRock key={`${z}-${x}`} position={[x,10.4+(column%2)*.9,z]} scale={[6.2+(row%2),1.65+(column%3)*.4,4.1]} rotation={[.1*column,.4*row,.08*(column-1)]} material={materials.dark} seed={100+row*9+column}/>))}
    {DESTINATIONS.map((destination, index) => {
      const [width, height, depth] = PROFILES[destination.id];
      const active = destination.id === activeId;
      const material = index % 3 === 1 ? materials.warm : materials.pale;
      return <group key={destination.id} name={`ground-physical-threshold-${destination.id}`}
        position={[destination.position[0], 0, destination.position[2]]}
        userData={{ uraiEnterableThreshold: `ground-enterable-threshold-${destination.id}`, destinationHref: destination.href }}
        onClick={(event) => { event.stopPropagation(); onSelect(destination); }}>
        <CaveRock position={[-width*.34,height*.36,-depth]} scale={[width*.25,height*.52,depth*.48]} rotation={[.06,index*.37,-.08]} material={material} seed={200+index*3}/>
        <CaveRock position={[width*.34,height*.38,-depth-.08]} scale={[width*.22,height*.56,depth*.54]} rotation={[-.04,index*.31+.4,.1]} material={index%2?materials.dark:material} seed={201+index*3}/>
        <CaveRock position={[index%2?-.28:.24,height*.88,-depth]} scale={[width*.54,height*.24,depth*.66]} rotation={[.08,index*.19,.03]} material={material} seed={202+index*3}/>
        <mesh position={[width*.12,height*.66,-depth+.46]}>
          <planeGeometry args={[width*(index%2?.18:.28),.035]} />
          <meshStandardMaterial color="#dec7a0" emissive="#deb98a" emissiveIntensity={active ? 1.2 : 0.38} roughness={0.6} />
        </mesh>
        {active && <pointLight position={[0, 2.4, -depth + 1.4]} color="#eed4a8" intensity={3} distance={7} decay={2} />}
      </group>;
    })}
  </group>;
}
