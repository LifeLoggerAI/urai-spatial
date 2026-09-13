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
  const geometry = new THREE.IcosahedronGeometry(1, 3);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index);
    const n = point.clone().normalize();
    const breakup = 1 + .12 * Math.sin(n.x * 7.1 + n.z * 4.7 + seed * .71) + .06 * Math.sin(n.y * 13.2 - n.x * 5.4 + seed * 1.17);
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

function caveFloorGeometry() {
  const geometry = new THREE.PlaneGeometry(60, 70, 84, 96);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -.14, -12);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colors: number[] = [];
  const deep = new THREE.Color("#27312c"), worn = new THREE.Color("#6d6554"), moss = new THREE.Color("#40544b");
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index), z = position.getZ(index);
    const edge = Math.max(0, (Math.abs(x) - 10.5) / 19);
    const route = Math.exp(-x * x / 19);
    const runoff = Math.exp(-Math.pow(x - .45 * Math.sin(z * .16), 2) / 7);
    const relief = .07 * Math.sin(x * .49 + z * .28) + .035 * Math.sin(x * 1.55 - z * .76) - edge * .20 - runoff * .025;
    position.setY(index, position.getY(index) + relief);
    const c = deep.clone().lerp(moss, .16 + .12 * Math.sin(z * .15)).lerp(worn, .12 + route * .24);
    colors.push(c.r, c.g, c.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function thresholdFloorGeometry(width: number, depth: number, seed: number) {
  const geometry = new THREE.PlaneGeometry(width * .72, depth * 1.65, 18, 16);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, .005, -depth * .35);
  const p = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, p.getY(i) + .018 * Math.sin(x * 4.2 + z * 2.8 + seed) + .009 * Math.sin(z * 8.3 - seed));
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

export default function GroundPhysicalArchitecture({ activeId, onSelect }: {
  activeId: string | null;
  onSelect: (destination: GroundDestination) => void;
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
      texture.repeat.set(.52, .52);
      texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      return texture;
    });
    const create = (color: string, roughness: number, envMapIntensity = .16) => new THREE.MeshStandardMaterial({
      color,
      map: textures[0],
      normalMap: textures[1],
      roughnessMap: textures[2],
      normalScale: new THREE.Vector2(.42, .42),
      roughness,
      metalness: 0,
      envMapIntensity,
    });
    const floorMaps = textures.map((source) => {
      const texture = source.clone();
      texture.repeat.set(20, 24);
      texture.needsUpdate = true;
      return texture;
    });
    const floor = create("#757568", .99, .10);
    floor.map = floorMaps[0];
    floor.normalMap = floorMaps[1];
    floor.roughnessMap = floorMaps[2];
    return {
      pale: create("#77776c", .98),
      dark: create("#39433d", .99),
      warm: create("#756957", .98),
      threshold: create("#505b52", .99),
      floor,
      textures: [...textures, ...floorMaps],
    };
  }, [maps]);

  useEffect(() => () => {
    materials.pale.dispose();
    materials.dark.dispose();
    materials.warm.dispose();
    materials.threshold.dispose();
    materials.floor.dispose();
    materials.textures.forEach((texture) => texture.dispose());
  }, [materials]);

  const caveFloor = useMemo(caveFloorGeometry, []);
  useEffect(() => () => caveFloor.dispose(), [caveFloor]);

  const wallRocks = useMemo(() => Array.from({ length: 22 }, (_, index) => {
    const side = index % 2 ? -1 : 1;
    const row = Math.floor(index / 2);
    const z = 8.5 - row * 3.7;
    const jitter = Math.sin(index * 4.71);
    return {
      position: [side * (14.4 + (index % 3) * .28), 1.45 + (index % 4) * .23, z] as [number, number, number],
      scale: [1.45 + (index % 3) * .24, 1.65 + (index % 5) * .20, 1.28 + (index % 4) * .18] as [number, number, number],
      rotation: [jitter * .18, index * .73, jitter * .14] as [number, number, number],
    };
  }), []);

  const farButtresses = useMemo(() => Array.from({ length: 7 }, (_, index) => ({
    position: [-10.8 + index * 3.6, 1.9 + (index % 2) * .24, -34.0] as [number, number, number],
    scale: [1.55 + (index % 3) * .20, 2.2 + (index % 2) * .28, 1.65] as [number, number, number],
    rotation: [.06 * Math.sin(index), index * .39, .05 * Math.cos(index * .7)] as [number, number, number],
  })), []);

  return <group name="ground-physical-cut-stone-infrastructure" userData={{
    authoredBy: "URAI original subterranean cut-stone architecture",
    surfaceSource: "existing governed CC0 rock-tile-floor",
    visualRole: "inhabitable-recessed-thresholds-connected-by-a-weathered-civic-floor",
    artRevision: "ground-v93-recessed-civic-chambers",
  }}>
    <mesh geometry={caveFloor} receiveShadow material={materials.floor} />

    <group name="ground-v93-perimeter-geology">
      {wallRocks.map((rock, index) => <CaveRock key={`wall-${index}`} {...rock} material={index % 5 === 0 ? materials.warm : materials.dark} seed={index + 40} />)}
      {farButtresses.map((rock, index) => <CaveRock key={`far-${index}`} {...rock} material={index % 2 ? materials.dark : materials.warm} seed={90 + index} />)}
    </group>

    {DESTINATIONS.map((destination, index) => {
      const [width, chamberHeight, depth] = PROFILES[destination.id];
      const active = destination.id === activeId;
      const wallMaterial = index % 4 === 1 ? materials.warm : index % 4 === 2 ? materials.pale : materials.dark;
      const pillarWidth = Math.max(.56, width * .15);
      const opening = Math.max(1.65, width * .38);
      const lintelHeight = Math.max(.42, chamberHeight * .13);
      const lintelWidth = opening + pillarWidth * 1.7;
      const leftX = -(opening / 2 + pillarWidth * .48);
      const rightX = opening / 2 + pillarWidth * .48;
      const innerHeight = chamberHeight * .82;
      const recessZ = -depth - .34;
      return <group
        key={destination.id}
        name={`ground-physical-threshold-${destination.id}`}
        position={[destination.position[0], Math.max(0, destination.position[1] * .18), destination.position[2]]}
        userData={{ uraiEnterableThreshold: `ground-enterable-threshold-${destination.id}`, destinationHref: destination.href, artRevision: "ground-v93-recessed-cut-stone-threshold" }}
        onClick={(event) => { event.stopPropagation(); onSelect(destination); }}
      >
        <ThresholdFloor width={width} depth={depth} material={materials.threshold} variant={index} />
        <mesh position={[0, innerHeight * .45, recessZ]} receiveShadow>
          <planeGeometry args={[opening * 1.10, innerHeight * .95, 1, 1]} />
          <meshStandardMaterial color="#111918" emissive={destination.color} emissiveIntensity={active ? .055 : .014} roughness={1} metalness={0} />
        </mesh>
        <Stone position={[leftX, 0, -depth]} size={[pillarWidth, innerHeight, depth * .56]} material={wallMaterial} variant={index * 3} rotation={-.025 - (index % 3) * .012} />
        <Stone position={[rightX, 0, -depth]} size={[pillarWidth * .92, innerHeight * 1.03, depth * .58]} material={index % 2 ? materials.dark : wallMaterial} variant={index * 3 + 1} rotation={.025 + (index % 2) * .015} />
        <Stone position={[0, innerHeight - lintelHeight * .38, -depth]} size={[lintelWidth, lintelHeight, depth * .62]} material={wallMaterial} variant={index * 3 + 2} rotation={(index % 3 - 1) * .012} />
        <CaveRock position={[-lintelWidth * .46, innerHeight * .82, -depth - .18]} scale={[.44, .42, .50]} rotation={[.12, index * .31, -.08]} material={materials.dark} seed={220 + index * 2} />
        <CaveRock position={[lintelWidth * .44, innerHeight * .76, -depth - .14]} scale={[.38, .46, .44]} rotation={[-.08, index * .27 + .4, .10]} material={materials.dark} seed={221 + index * 2} />
        <mesh position={[0, innerHeight * .72, -depth + .055]}>
          <planeGeometry args={[Math.min(1.18, opening * .42), .022]} />
          <meshStandardMaterial color={destination.color} emissive={destination.color} emissiveIntensity={active ? .72 : .20} roughness={.8} transparent opacity={active ? .76 : .38} />
        </mesh>
        <pointLight position={[0, innerHeight * .46, -depth + .72]} color={destination.color} intensity={active ? 1.15 : .16} distance={active ? 5.2 : 2.5} decay={2} />
      </group>;
    })}

    <pointLight position={[0, 1.15, -7.5]} color="#b99b75" intensity={.28} distance={12} decay={2} />
    <pointLight position={[0, 1.6, -24]} color="#648d88" intensity={.20} distance={14} decay={2} />
  </group>;
}
