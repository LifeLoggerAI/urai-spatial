"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { DESTINATIONS, type GroundDestination } from "./GroundWorldModel";

// Original subterranean architecture. Surface scans retain their governed CC0
// Poly Haven provenance; all visible composition and geometry are URAI-authored.
const SURFACE = "/assets/urai/home-production/cc0/rock-tile-floor/";
const PROFILES: Record<string, [number, number, number]> = {
  reception: [6.2, 3.2, 2.4], privacy: [5.4, 4.8, 2.8], council: [7.4, 4.1, 2.7],
  logistics: [4.4, 3.6, 2.1], wellness: [5.4, 2.9, 2.5], archive: [5.8, 5.7, 2.5],
  mirror: [4.6, 4.3, 2.1], passport: [5.2, 4.6, 2.5], consent: [4.1, 3.7, 2.1],
  atlas: [5.2, 4.4, 2.6], focus: [4.2, 4.9, 2.2], replay: [6.5, 3.5, 2.5],
};

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
  const chip = Math.min(0.14 + variant % 4 * 0.042, height * 0.085);
  shape.moveTo(-width / 2 + chip, 0);
  shape.lineTo(width / 2 - chip * 0.7, 0);
  shape.lineTo(width / 2, chip * 0.8);
  shape.lineTo(width / 2 - chip * 0.24, height * 0.58);
  shape.lineTo(width / 2 - chip * 0.18, height - chip);
  shape.lineTo(width / 2 - chip * 1.25, height);
  shape.lineTo(-width / 2 + chip * 0.22, height - chip * 0.46);
  shape.lineTo(-width / 2, height * 0.84);
  shape.lineTo(-width / 2 + chip * 0.18, chip);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.045,
    bevelThickness: 0.03,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const weather = .018 * Math.sin(x * 3.7 + y * 6.1 + variant) + .012 * Math.sin(z * 7.2 - y * 2.8);
    position.setXYZ(i, x + weather, y + weather * .7, z + weather * .4);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function Stone({ position, size, material, variant = 0, rotation = 0 }: {
  position: [number, number, number];
  size: [number, number, number];
  material: THREE.Material;
  variant?: number;
  rotation?: number;
}) {
  const geometry = useMemo(() => dressedStone(...size, variant), [size[0], size[1], size[2], variant]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh position={position} rotation={[0, rotation, 0]} geometry={geometry} material={material} castShadow receiveShadow />;
}

function caveRockGeometry(seed: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index);
    const n = point.clone().normalize();
    const breakup = 1 + .14 * Math.sin(n.x * 7.1 + n.z * 4.7 + seed * .71)
      + .07 * Math.sin(n.y * 13.2 - n.x * 5.4 + seed * 1.17)
      + .035 * Math.cos((n.x + n.y + n.z) * 19 + seed);
    point.multiplyScalar(breakup);
    position.setXYZ(index, point.x, point.y, point.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function CaveRock({ position, scale, rotation, material, seed }: {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  material: THREE.Material;
  seed: number;
}) {
  const geometry = useMemo(() => caveRockGeometry(seed), [seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={position} scale={scale} rotation={rotation} material={material} castShadow receiveShadow />;
}

function vaultRibGeometry(width: number, height: number, seed: number, radius: number) {
  const half = width / 2;
  const shoulder = height * .42;
  const points = [
    new THREE.Vector3(-half, .08, 0), new THREE.Vector3(-half * 1.02, shoulder, .02),
    new THREE.Vector3(-half * .78, height * .74, -.02), new THREE.Vector3(-half * .45, height * .93, .01),
    new THREE.Vector3(0, height, -.025), new THREE.Vector3(half * .45, height * .92, .015),
    new THREE.Vector3(half * .78, height * .73, -.015), new THREE.Vector3(half * 1.01, shoulder, .02),
    new THREE.Vector3(half, .08, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", .42);
  const geometry = new THREE.TubeGeometry(curve, 92, radius, 10, false);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index), y = position.getY(index), z = position.getZ(index);
    const weather = .016 * Math.sin(x * 4.3 + y * 5.9 + seed) + .009 * Math.cos(y * 9.1 - z * 7 + seed * .4);
    position.setXYZ(index, x + weather, y + weather * .72, z + weather * .5);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function VaultRib({ width, height, seed, radius, position, material }: { width: number; height: number; seed: number; radius: number; position: [number, number, number]; material: THREE.Material; }) {
  const geometry = useMemo(() => vaultRibGeometry(width, height, seed, radius), [height, radius, seed, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={position} material={material} castShadow receiveShadow />;
}

function caveFloorGeometry() {
  const geometry = new THREE.PlaneGeometry(60, 70, 96, 112);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -.14, -12);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors: number[] = [];
  const deep = new THREE.Color("#202b27"), worn = new THREE.Color("#776b55"), moss = new THREE.Color("#3f5a50"), cool = new THREE.Color("#415b5b");
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index), z = position.getZ(index);
    const edge = Math.max(0, (Math.abs(x) - 9.5) / 19);
    const route = Math.exp(-x * x / 15);
    const runoff = Math.exp(-Math.pow(x - .45 * Math.sin(z * .16), 2) / 6);
    const strata = .055 * Math.sin(x * .49 + z * .28) + .035 * Math.sin(x * 1.55 - z * .76) + .018 * Math.cos(x * 2.3 + z * 1.1);
    const relief = strata - edge * .22 - runoff * .022;
    position.setY(index, position.getY(index) + relief);
    const c = deep.clone().lerp(moss, .15 + .12 * Math.sin(z * .15)).lerp(worn, .10 + route * .31).lerp(cool, .07 * edge);
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function thresholdFloorGeometry(width: number, depth: number, seed: number) {
  const geometry = new THREE.PlaneGeometry(width * .78, depth * 1.82, 22, 18);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, .005, -depth * .34);
  const p = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, p.getY(i) + .022 * Math.sin(x * 4.2 + z * 2.8 + seed) + .011 * Math.sin(z * 8.3 - seed));
  }
  p.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function ThresholdFloor({ width, depth, material, variant }: { width: number; depth: number; material: THREE.Material; variant: number }) {
  const geometry = useMemo(() => thresholdFloorGeometry(width, depth, variant), [depth, variant, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} receiveShadow />;
}

function apertureDustGeometry(seed: number, width: number, height: number, depth: number) {
  const count = 64;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const t = (index + .5) / count;
    const angle = index * 2.39996323 + seed * .31;
    const radius = Math.sqrt(t);
    positions.set([Math.cos(angle) * radius * width * .32, .28 + Math.abs(Math.sin(angle * 1.7 + seed)) * height * .58, -depth - .45 - (index % 9) * .08], index * 3);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3)); return geometry;
}

function ThresholdMemoryField({ seed, width, height, depth, color, active }: { seed: number; width: number; height: number; depth: number; color: string; active: boolean }) {
  const geometry = useMemo(() => apertureDustGeometry(seed, width, height, depth), [depth, height, seed, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry} raycast={() => null}><pointsMaterial color={color} size={active ? .048 : .026} transparent opacity={active ? .76 : .31} depthWrite={false} sizeAttenuation toneMapped={false} /></points>;
}

function sideRockSpecs(width: number, height: number, depth: number, seed: number) {
  return Array.from({ length: 6 }, (_, index) => { const side = index % 2 ? -1 : 1; const tier = Math.floor(index / 2); return {
    position: [side * (width * (.36 + tier * .055)), .44 + tier * height * .18, -depth - .05 - tier * .10] as [number, number, number],
    scale: [.52 + tier * .08, .62 + tier * .12, .58 + (index % 3) * .06] as [number, number, number],
    rotation: [.08 * Math.sin(seed + index), side * (.34 + tier * .18), .08 * Math.cos(seed * .7 + index)] as [number, number, number], seed: seed * 17 + index,
  }; });
}

export default function GroundPhysicalArchitecture({ activeId, onSelect }: { activeId: string | null; onSelect: (destination: GroundDestination) => void; }) {
  const maps = useTexture([`${SURFACE}rock-tile-floor-diff-1k.webp`, `${SURFACE}rock-tile-floor-normal-gl-1k.webp`, `${SURFACE}rock-tile-floor-arm-1k.webp`]);
  const materials = useMemo(() => {
    const textures = maps.map((source, index) => { const texture = source.clone(); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(.58, .58); texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace; texture.anisotropy = 8; texture.needsUpdate = true; return texture; });
    const create = (color: string, roughness: number, envMapIntensity = .18) => new THREE.MeshStandardMaterial({ color, map: textures[0], normalMap: textures[1], roughnessMap: textures[2], normalScale: new THREE.Vector2(.54, .54), roughness, metalness: 0, envMapIntensity });
    const floorMaps = textures.map((source) => { const texture = source.clone(); texture.repeat.set(23, 27); texture.needsUpdate = true; return texture; });
    const floor = create("#6e7064", .98, .12); floor.map = floorMaps[0]; floor.normalMap = floorMaps[1]; floor.roughnessMap = floorMaps[2]; floor.vertexColors = true;
    return { pale: create("#7b7a6e", .97), dark: create("#34443d", .99), warm: create("#766752", .98), threshold: create("#4f5f55", .98), charcoal: create("#28332e", .995), floor, textures: [...textures, ...floorMaps] };
  }, [maps]);
  useEffect(() => () => { materials.pale.dispose(); materials.dark.dispose(); materials.warm.dispose(); materials.threshold.dispose(); materials.charcoal.dispose(); materials.floor.dispose(); materials.textures.forEach((texture) => texture.dispose()); }, [materials]);
  const caveFloor = useMemo(caveFloorGeometry, []); useEffect(() => () => caveFloor.dispose(), [caveFloor]);
  const wallRocks = useMemo(() => Array.from({ length: 22 }, (_, index) => { const side = index % 2 ? -1 : 1; const row = Math.floor(index / 2); const z = 8.5 - row * 3.7; const jitter = Math.sin(index * 4.71); return { position: [side * (14.1 + (index % 3) * .32), 1.36 + (index % 4) * .24, z] as [number, number, number], scale: [1.65 + (index % 3) * .25, 1.82 + (index % 5) * .21, 1.45 + (index % 4) * .20] as [number, number, number], rotation: [jitter * .18, index * .73, jitter * .14] as [number, number, number] }; }), []);
  const ceilingRocks = useMemo(() => Array.from({ length: 10 }, (_, index) => ({ position: [-12.0 + index * 2.68, 5.42 + (index % 3) * .18, 5.0 - (index % 5) * 8.1] as [number, number, number], scale: [2.0 + (index % 3) * .35, .66 + (index % 2) * .16, 2.2 + (index % 4) * .30] as [number, number, number], rotation: [index % 2 ? .22 : -.18, index * .49, index % 3 ? .10 : -.08] as [number, number, number] })), []);
  const farButtresses = useMemo(() => Array.from({ length: 7 }, (_, index) => ({ position: [-10.8 + index * 3.6, 1.9 + (index % 2) * .24, -34.0] as [number, number, number], scale: [1.65 + (index % 3) * .20, 2.35 + (index % 2) * .28, 1.75] as [number, number, number], rotation: [.06 * Math.sin(index), index * .39, .05 * Math.cos(index * .7)] as [number, number, number] })), []);
  return <group name="ground-physical-cut-stone-infrastructure" userData={{ authoredBy: "URAI original subterranean cut-stone architecture", surfaceSource: "existing governed CC0 rock-tile-floor", visualRole: "inhabitable-recessed-thresholds-connected-by-a-weathered-civic-floor", artRevision: "ground-v93-recessed-civic-chambers", goldMasterRevision: "ground-v280-vaulted-geological-civic-sanctuary" }}>
    <mesh geometry={caveFloor} receiveShadow material={materials.floor} />
    <group name="ground-v93-perimeter-geology">{wallRocks.map((rock, index) => <CaveRock key={`wall-${index}`} {...rock} material={index % 5 === 0 ? materials.warm : materials.dark} seed={index + 40} />)}{ceilingRocks.map((rock, index) => <CaveRock key={`ceiling-${index}`} {...rock} material={index % 3 === 0 ? materials.warm : materials.charcoal} seed={140 + index} />)}{farButtresses.map((rock, index) => <CaveRock key={`far-${index}`} {...rock} material={index % 2 ? materials.dark : materials.warm} seed={90 + index} />)}</group>
    {DESTINATIONS.map((destination, index) => {
      const [width, chamberHeight, depth] = PROFILES[destination.id]; const active = destination.id === activeId; const wallMaterial = index % 4 === 1 ? materials.warm : index % 4 === 2 ? materials.pale : materials.dark; const opening = Math.max(1.8, width * .44); const innerHeight = chamberHeight * .84; const recessZ = -depth - .82; const sideRocks = sideRockSpecs(width, innerHeight, depth, index + 3);
      return <group key={destination.id} name={`ground-physical-threshold-${destination.id}`} position={[destination.position[0], Math.max(0, destination.position[1] * .18), destination.position[2]]} userData={{ uraiEnterableThreshold: `ground-enterable-threshold-${destination.id}`, destinationHref: destination.href, artRevision: "ground-v93-recessed-cut-stone-threshold", goldMasterRevision: "ground-v280-layered-vaulted-threshold" }} onClick={(event) => { event.stopPropagation(); onSelect(destination); }}>
        <ThresholdFloor width={width} depth={depth} material={materials.threshold} variant={index} />
        <mesh position={[0, innerHeight * .49, recessZ]} receiveShadow><planeGeometry args={[opening * 1.18, innerHeight * 1.02, 1, 1]} /><meshPhysicalMaterial color="#101817" emissive={destination.color} emissiveIntensity={active ? .075 : .018} roughness={.98} metalness={0} clearcoat={.05} /></mesh>
        <VaultRib width={opening * 1.58} height={innerHeight * 1.04} seed={index * 7 + 1} radius={.25} position={[0, .02, -depth + .16]} material={materials.charcoal} />
        <VaultRib width={opening * 1.38} height={innerHeight * .94} seed={index * 7 + 2} radius={.19} position={[0, .04, -depth - .18]} material={wallMaterial} />
        <VaultRib width={opening * 1.18} height={innerHeight * .82} seed={index * 7 + 3} radius={.115} position={[0, .07, -depth - .48]} material={materials.threshold} />
        {sideRocks.map((rock, rockIndex) => <CaveRock key={`shoulder-${rockIndex}`} {...rock} material={rockIndex % 3 === 0 ? materials.warm : wallMaterial} />)}
        <Stone position={[-opening * .64, 0, -depth + .18]} size={[.42, .58, depth * .42]} material={materials.dark} variant={index * 3} rotation={-.08} />
        <Stone position={[opening * .64, 0, -depth + .18]} size={[.38, .52, depth * .40]} material={materials.dark} variant={index * 3 + 1} rotation={.07} />
        <mesh position={[0, innerHeight * .73, -depth + .04]}><planeGeometry args={[Math.min(1.34, opening * .46), .026]} /><meshStandardMaterial color={destination.color} emissive={destination.color} emissiveIntensity={active ? .88 : .28} roughness={.72} transparent opacity={active ? .82 : .46} /></mesh>
        <mesh position={[0, .045, -depth * .55]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}><ringGeometry args={[.72, .76, 72]} /><meshBasicMaterial color={destination.color} transparent opacity={active ? .32 : .11} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
        <ThresholdMemoryField seed={index + 11} width={opening} height={innerHeight} depth={depth} color={destination.color} active={active} />
        <pointLight position={[0, innerHeight * .46, -depth + .72]} color={destination.color} intensity={active ? 1.65 : .26} distance={active ? 6.3 : 3.2} decay={2} />
      </group>;
    })}
    <pointLight position={[0, 1.30, -6.2]} color="#c2a176" intensity={.46} distance={14} decay={2} /><pointLight position={[0, 1.85, -19]} color="#709f96" intensity={.32} distance={16} decay={2} /><pointLight position={[0, 3.8, -31]} color="#8d82a4" intensity={.22} distance={12} decay={2} />
  </group>;
}
