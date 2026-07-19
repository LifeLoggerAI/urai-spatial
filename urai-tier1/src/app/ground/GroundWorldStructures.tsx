"use client";

import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { STATE_LABEL, type GroundDestination } from "./GroundWorldModel";

const stateOpacity = (destination: GroundDestination) => {
  if (destination.availability === "offline" || destination.workforceState === "revoked") return 0.12;
  if (destination.workforceState === "blocked") return 0.34;
  if (destination.workforceState === "awaiting-owner-approval") return 0.5;
  return 0.72;
};

function StateGlyph({ destination, color }: { destination: GroundDestination; color: THREE.Color }) {
  if (destination.workforceState === "blocked") return <group rotation={[-Math.PI / 2, 0, 0]}>{[Math.PI / 4, -Math.PI / 4].map((rotation) => <mesh key={rotation} rotation={[0, 0, rotation]}><boxGeometry args={[0.9, 0.07, 0.07]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>)}</group>;
  if (destination.workforceState === "awaiting-owner-approval") return <group rotation={[-Math.PI / 2, 0, 0]}><mesh><torusGeometry args={[0.34, 0.055, 12, 48]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh><mesh position={[0, 0, 0.02]}><circleGeometry args={[0.085, 24]} /><meshBasicMaterial color="#f8fbff" toneMapped={false} /></mesh></group>;
  return <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.2, 0.3, 36]} /><meshBasicMaterial color={color} transparent opacity={0.78} toneMapped={false} /></mesh>;
}

export function Corridor({ destination }: { destination: GroundDestination }) {
  const x = destination.position[0] * 0.5;
  const z = destination.position[2] * 0.5;
  const y = Math.max(0.02, destination.position[1] * 0.45);
  const length = Math.hypot(destination.position[0], destination.position[2]);
  const angle = Math.atan2(destination.position[0], destination.position[2]);
  const color = useMemo(() => new THREE.Color(destination.color), [destination.color]);
  const blocked = destination.workforceState === "blocked";
  return <group position={[x, y, z]} rotation={[0, angle, 0]} userData={{ corridorState: destination.workforceState }}>
    <mesh receiveShadow><boxGeometry args={[1.35, 0.11, length]} /><meshPhysicalMaterial color="#0b1721" roughness={0.42} metalness={0.56} clearcoat={0.3} /></mesh>
    {(blocked ? [-0.36, -0.12, 0.12, 0.36] : [-0.44, 0.44]).map((offset, index) => <mesh key={`${destination.id}-${offset}`} position={[offset, 0.075, blocked ? (index % 2 === 0 ? -length * 0.18 : length * 0.18) : 0]}><boxGeometry args={[blocked ? 0.055 : 0.035, 0.02, blocked ? length * 0.23 : length * 0.9]} /><meshBasicMaterial color={color} transparent opacity={stateOpacity(destination)} toneMapped={false} /></mesh>)}
    <group position={[0, 0.18, -length * 0.43]}><StateGlyph destination={destination} color={color} /></group>
    {destination.ownerBoundary ? <group position={[0, 0.9, -length * 0.38]}><mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.78, 0.045, 14, 64, Math.PI]} /><meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} /></mesh>{[-0.78, 0.78].map((gateX) => <mesh key={gateX} position={[gateX, -0.45, 0]}><boxGeometry args={[0.08, 0.9, 0.08]} /><meshBasicMaterial color={color} transparent opacity={0.42} toneMapped={false} /></mesh>)}</group> : null}
  </group>;
}

function Base({ color, radius = 2.55 }: { color: THREE.Color; radius?: number }) {
  return <mesh position={[0, 0.02, 0]} receiveShadow castShadow><cylinderGeometry args={[radius, radius + 0.3, 0.22, 12]} /><meshPhysicalMaterial color="#07131d" emissive={color} emissiveIntensity={0.05} roughness={0.4} metalness={0.58} clearcoat={0.42} /></mesh>;
}

function Pavilion({ color }: { color: THREE.Color }) {
  return <group><mesh position={[0, 1.8, 0]}><cylinderGeometry args={[2.2, 2.5, 0.16, 48]} /><meshPhysicalMaterial color="#102731" emissive={color} emissiveIntensity={0.12} roughness={0.3} metalness={0.46} clearcoat={0.55} /></mesh>{[-1.6, -0.55, 0.55, 1.6].map((x) => <mesh key={x} position={[x, 0.95, 0]}><cylinderGeometry args={[0.07, 0.12, 1.8, 14]} /><meshStandardMaterial color="#1a3340" emissive={color} emissiveIntensity={0.12} /></mesh>)}<mesh position={[0, 1.2, -0.25]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.2, 0.035, 12, 72, Math.PI]} /><meshBasicMaterial color={color} transparent opacity={0.72} toneMapped={false} /></mesh></group>;
}

function Sanctuary({ color }: { color: THREE.Color }) {
  return <group>{[2.35, 1.78, 1.2].map((radius, index) => <mesh key={radius} position={[0, 1.5 + index * 0.08, 0]} rotation={[0, index * 0.22, 0]}><cylinderGeometry args={[radius, radius * 1.04, 3 + index * 0.22, 10, 1, true]} /><meshPhysicalMaterial color="#111d2b" emissive={color} emissiveIntensity={0.09 + index * 0.05} roughness={0.35} metalness={0.52} clearcoat={0.5} transparent opacity={0.72 - index * 0.12} side={THREE.DoubleSide} /></mesh>)}<mesh position={[0, 1.45, 1.22]}><boxGeometry args={[0.92, 2.2, 0.08]} /><meshBasicMaterial color={color} transparent opacity={0.18} toneMapped={false} /></mesh></group>;
}

function CouncilHall({ color }: { color: THREE.Color }) {
  return <group><mesh position={[0, 0.24, 0]}><cylinderGeometry args={[2.65, 2.85, 0.45, 64]} /><meshPhysicalMaterial color="#171d21" emissive={color} emissiveIntensity={0.1} roughness={0.28} metalness={0.62} /></mesh>{Array.from({ length: 8 }, (_, index) => { const angle = index / 8 * Math.PI * 2; return <mesh key={index} position={[Math.cos(angle) * 1.86, 0.78, Math.sin(angle) * 1.86]}><cylinderGeometry args={[0.22, 0.3, 0.95, 18]} /><meshStandardMaterial color="#192833" emissive={color} emissiveIntensity={0.16} /></mesh>; })}<mesh position={[0, 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.72, 0.86, 64]} /><meshBasicMaterial color={color} transparent opacity={0.82} toneMapped={false} /></mesh></group>;
}

function TransitHall({ color, blocked }: { color: THREE.Color; blocked: boolean }) {
  return <group>{[-1.25, -0.42, 0.42, 1.25].map((x, index) => <group key={x} position={[x, 0, 0]}><mesh position={[0, 1.55, 0]}><boxGeometry args={[0.38, 3.1, 2.4]} /><meshPhysicalMaterial color="#17222b" emissive={color} emissiveIntensity={blocked ? 0.04 : 0.16} roughness={0.3} metalness={0.64} /></mesh><mesh position={[0, 1.5, 1.24]}><boxGeometry args={[0.08, 2.4, 0.04]} /><meshBasicMaterial color={color} transparent opacity={blocked && index > 1 ? 0.12 : 0.58} toneMapped={false} /></mesh></group>)}</group>;
}

function RestorativeHall({ color }: { color: THREE.Color }) {
  return <group><mesh position={[0, 0.35, 0]}><cylinderGeometry args={[2.45, 2.65, 0.4, 64]} /><meshPhysicalMaterial color="#102821" emissive={color} emissiveIntensity={0.11} roughness={0.2} metalness={0.38} clearcoat={0.8} /></mesh><mesh position={[0, 0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.75, 72]} /><meshPhysicalMaterial color="#071410" emissive={color} emissiveIntensity={0.32} roughness={0.05} clearcoat={1} transparent opacity={0.85} /></mesh><mesh position={[0, 2.4, -0.3]} scale={[2.7, 1.2, 0.7]}><sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#11251f" emissive={color} emissiveIntensity={0.08} transparent opacity={0.72} side={THREE.DoubleSide} /></mesh></group>;
}

function ArchiveHall({ color }: { color: THREE.Color }) {
  return <group>{[-1.55, -0.8, 0, 0.8, 1.55].map((x, index) => <mesh key={x} position={[x, 2.2 + index % 2 * 0.55, 0]}><boxGeometry args={[0.38, 4.4 + index % 2 * 1.1, 1.5]} /><meshPhysicalMaterial color="#102136" emissive={color} emissiveIntensity={0.1 + index * 0.018} roughness={0.28} metalness={0.58} /></mesh>)}<mesh position={[0, 3.15, 1.08]}><boxGeometry args={[0.08, 5.4, 0.04]} /><meshBasicMaterial color="#f8fbff" transparent opacity={0.72} toneMapped={false} /></mesh></group>;
}

function ReflectionHall({ color }: { color: THREE.Color }) {
  return <group>{[-0.9, 0, 0.9].map((x, index) => <mesh key={x} position={[x, 1.65 + index * 0.2, 0]} rotation={[0, index === 1 ? 0 : x * 0.22, x * 0.08]}><octahedronGeometry args={[1.25, 1]} /><meshPhysicalMaterial color="#182131" emissive={color} emissiveIntensity={0.12} roughness={0.08} metalness={0.82} clearcoat={1} transparent opacity={0.72} /></mesh>)}</group>;
}

function VaultHall({ color }: { color: THREE.Color }) {
  return <group><mesh position={[0, 1.7, 0]}><dodecahedronGeometry args={[2.15, 1]} /><meshPhysicalMaterial color="#211f18" emissive={color} emissiveIntensity={0.13} roughness={0.28} metalness={0.76} clearcoat={0.7} /></mesh><mesh position={[0, 1.7, 1.91]}><torusGeometry args={[0.34, 0.06, 14, 48]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh></group>;
}

function ObservatoryHall({ color }: { color: THREE.Color }) {
  return <group><mesh position={[0, 1.65, 0]} scale={[1.55, 1.15, 1.55]}><sphereGeometry args={[1.7, 48, 28, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#0d2324" emissive={color} emissiveIntensity={0.11} transparent opacity={0.78} side={THREE.DoubleSide} /></mesh><mesh position={[0, 1.85, 0]}><icosahedronGeometry args={[0.72, 2]} /><meshBasicMaterial color={color} transparent opacity={0.18} wireframe toneMapped={false} /></mesh></group>;
}

function ApertureHall({ color }: { color: THREE.Color }) {
  return <group>{[1.85, 1.38, 0.92].map((radius, index) => <mesh key={radius} position={[0, 1.8, 0]} rotation={[0, index * 0.34, Math.PI / 2]}><torusGeometry args={[radius, 0.08 - index * 0.014, 14, 96]} /><meshPhysicalMaterial color="#17182a" emissive={color} emissiveIntensity={0.35 - index * 0.06} roughness={0.16} metalness={0.65} /></mesh>)}<mesh position={[0, 1.8, 0]}><sphereGeometry args={[0.46, 40, 40]} /><meshStandardMaterial color="#f8fbff" emissive={color} emissiveIntensity={2.2} /></mesh></group>;
}

function TheaterHall({ color }: { color: THREE.Color }) {
  return <group><mesh position={[0, 1.7, -0.6]}><boxGeometry args={[4.2, 3.4, 0.7]} /><meshPhysicalMaterial color="#211525" emissive={color} emissiveIntensity={0.11} roughness={0.22} metalness={0.58} /></mesh><mesh position={[0, 1.75, 0]}><planeGeometry args={[3.4, 2.45]} /><meshBasicMaterial color={color} transparent opacity={0.13} toneMapped={false} /></mesh>{[-1.35, -0.45, 0.45, 1.35].map((x) => <mesh key={x} position={[x, 0.45, 1.25]} rotation={[-0.25, 0, 0]}><boxGeometry args={[0.65, 0.55, 1.1]} /><meshStandardMaterial color="#19131d" emissive={color} emissiveIntensity={0.08} /></mesh>)}</group>;
}

function ChamberBody({ destination, color }: { destination: GroundDestination; color: THREE.Color }) {
  switch (destination.chamberForm) {
    case "pavilion": return <Pavilion color={color} />;
    case "sanctuary": return <Sanctuary color={color} />;
    case "council": return <CouncilHall color={color} />;
    case "transit": return <TransitHall color={color} blocked={destination.workforceState === "blocked"} />;
    case "restorative": return <RestorativeHall color={color} />;
    case "archive": return <ArchiveHall color={color} />;
    case "reflection": return <ReflectionHall color={color} />;
    case "vault": return <VaultHall color={color} />;
    case "observatory": return <ObservatoryHall color={color} />;
    case "aperture": return <ApertureHall color={color} />;
    case "theater": return <TheaterHall color={color} />;
  }
}

export function DestinationArchitecture({ destination, active, onSelect, variant }: { destination: GroundDestination; active: boolean; onSelect: () => void; variant: number }) {
  const color = useMemo(() => new THREE.Color(destination.color), [destination.color]);
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(); };
  useEffect(() => () => { document.body.style.cursor = ""; }, []);
  return <group position={destination.position} userData={{ groundDestination: destination.id, serviceAvailability: destination.availability, chamberForm: destination.chamberForm, groundLayer: destination.layer, variant }} onClick={activate} onPointerEnter={() => { document.body.style.cursor = "pointer"; }} onPointerLeave={() => { document.body.style.cursor = ""; }}>
    <Base color={color} /><ChamberBody destination={destination} color={color} />
    {destination.ownerBoundary ? <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.95, 3.08, 96]} /><meshBasicMaterial color={color} transparent opacity={active ? 0.78 : 0.28} toneMapped={false} /></mesh> : null}
    <pointLight position={[0, 2.4, 2.2]} color={color} intensity={active ? 10 : destination.workforceState === "blocked" ? 1.8 : 4.4} distance={11} decay={2} />
    {active ? <Html position={[0, 5.25, 0]} center distanceFactor={12}><div className="ground-active-label"><strong>{destination.label}</strong><span>{destination.signature} · {destination.detail}</span><em>{STATE_LABEL[destination.workforceState]} · {destination.availability}</em><small>{destination.emotionalSentence}</small></div></Html> : null}
  </group>;
}
