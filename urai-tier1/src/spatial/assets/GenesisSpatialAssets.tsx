"use client";

import { Float, Line, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { CanonMode } from "../store/useSceneStore";

const BLUE = "#79d9ff";
const VIOLET = "#9a7cff";
const INDIGO = "#18245f";
const GOLD = "#ffd58a";
const EMBER = "#ff8b69";
const VOID = "#040611";

function seeded(index: number, salt = 0) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function Crystal({ position, scale = 1, color = BLUE }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <Float speed={0.35} rotationIntensity={0.08} floatIntensity={0.12}>
      <mesh position={position} scale={[scale * 0.62, scale * 1.8, scale * 0.62]} castShadow receiveShadow>
        <octahedronGeometry args={[0.55, 0]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.42}
          transmission={0.28}
          transparent
          opacity={0.82}
          roughness={0.16}
          metalness={0.18}
          thickness={0.8}
        />
      </mesh>
    </Float>
  );
}

function LuminousFlora({ count = 90, radius = 11 }: { count?: number; radius?: number }) {
  const stems = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const angle = seeded(index, 1) * Math.PI * 2;
        const distance = 2.2 + seeded(index, 2) * radius;
        return {
          position: [Math.cos(angle) * distance, -2.5 + seeded(index, 3) * 0.18, -5.5 + Math.sin(angle) * distance] as [number, number, number],
          height: 0.18 + seeded(index, 4) * 0.52,
          hue: index % 3 === 0 ? VIOLET : index % 3 === 1 ? BLUE : "#b9a2ff",
        };
      }),
    [count, radius],
  );

  return (
    <group>
      {stems.map((stem, index) => (
        <group key={index} position={stem.position}>
          <mesh position={[0, stem.height * 0.5, 0]}>
            <cylinderGeometry args={[0.012, 0.02, stem.height, 5]} />
            <meshStandardMaterial color="#254f63" emissive={stem.hue} emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0, stem.height, 0]}>
            <sphereGeometry args={[0.035 + (index % 4) * 0.012, 8, 8]} />
            <meshBasicMaterial color={stem.hue} transparent opacity={0.92} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function AuroraRibbons() {
  const ribbons = useMemo(
    () =>
      Array.from({ length: 5 }, (_, band) =>
        Array.from({ length: 28 }, (_, index) => {
          const x = -16 + index * 1.18;
          const y = 13.5 + band * 0.9 + Math.sin(index * 0.38 + band) * (0.8 + band * 0.12);
          const z = -31 - band * 4 + Math.cos(index * 0.22) * 1.4;
          return new THREE.Vector3(x, y, z);
        }),
      ),
    [],
  );

  return (
    <group>
      {ribbons.map((points, index) => (
        <Line
          key={index}
          points={points}
          color={index % 2 === 0 ? BLUE : VIOLET}
          lineWidth={1.2 + index * 0.22}
          transparent
          opacity={0.18}
        />
      ))}
    </group>
  );
}

function WaterTerraces() {
  return (
    <group position={[0, -2.72, -7]}>
      {[0, 1, 2, 3].map((level) => (
        <mesh key={level} rotation={[-Math.PI / 2, 0, 0]} position={[level % 2 === 0 ? -1.8 : 2.4, level * 0.08, -level * 3.4]}>
          <circleGeometry args={[4.8 + level * 2.1, 96]} />
          <meshPhysicalMaterial
            color={level % 2 === 0 ? "#071d51" : "#101855"}
            emissive={BLUE}
            emissiveIntensity={0.05}
            transparent
            opacity={0.38 - level * 0.04}
            roughness={0.08}
            metalness={0.28}
            transmission={0.14}
          />
        </mesh>
      ))}
    </group>
  );
}

function SteppingPath() {
  return (
    <group position={[0, -2.37, -2.2]}>
      {Array.from({ length: 18 }, (_, index) => {
        const z = -index * 1.25;
        const x = Math.sin(index * 0.72) * 0.55;
        return (
          <mesh key={index} position={[x, -0.18 - index * 0.015, z]} rotation={[0, index * 0.28, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.62 + (index % 3) * 0.08, 0.74, 0.18, 7]} />
            <meshStandardMaterial color="#101834" emissive={index % 4 === 0 ? BLUE : VIOLET} emissiveIntensity={0.07} roughness={0.56} />
          </mesh>
        );
      })}
    </group>
  );
}

function HomeSanctuary() {
  return (
    <group>
      <WaterTerraces />
      <SteppingPath />
      <LuminousFlora />
      <AuroraRibbons />
      <Sparkles count={160} scale={[34, 18, 45]} position={[0, 5, -18]} size={1.35} speed={0.08} color={BLUE} opacity={0.28} />

      <group position={[-8.5, -1.8, -12]}>
        <Crystal position={[0, 0, 0]} scale={1.7} />
        <Crystal position={[1.7, -0.4, -1.5]} scale={0.9} color={VIOLET} />
        <Crystal position={[-1.5, -0.3, -2.4]} scale={1.15} color="#a9f0ff" />
      </group>
      <group position={[8.8, -1.4, -15]}>
        <Crystal position={[0, 0, 0]} scale={2.1} color={VIOLET} />
        <Crystal position={[-2.1, -0.65, 1.2]} scale={0.85} />
      </group>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 10.5, 0.1, -18]}>
          <mesh castShadow receiveShadow>
            <coneGeometry args={[4.2, 10, 9]} />
            <meshStandardMaterial color="#09122d" emissive={side < 0 ? VIOLET : BLUE} emissiveIntensity={0.035} roughness={0.88} />
          </mesh>
          <mesh position={[-side * 1.3, -0.4, 1.2]} rotation={[0, 0, side * 0.08]}>
            <planeGeometry args={[1.2, 6.8, 1, 16]} />
            <meshPhysicalMaterial color={BLUE} emissive={BLUE} emissiveIntensity={0.22} transparent opacity={0.22} roughness={0.05} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function OrbitalRing({ radius, tilt, color = BLUE }: { radius: number; tilt: [number, number, number]; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * (0.025 + radius * 0.001);
  });
  return (
    <mesh ref={ref} rotation={tilt}>
      <torusGeometry args={[radius, 0.025, 8, 180]} />
      <meshBasicMaterial color={color} transparent opacity={0.34} />
    </mesh>
  );
}

function FloatingIsland({ position, scale = 1, color = VIOLET }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <Float speed={0.45} floatIntensity={0.35} rotationIntensity={0.04}>
      <group position={position} scale={scale}>
        <mesh rotation={[Math.PI, 0, 0]} castShadow>
          <coneGeometry args={[1.75, 2.8, 7]} />
          <meshStandardMaterial color="#080d25" emissive={color} emissiveIntensity={0.08} roughness={0.76} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[1.78, 1.62, 0.24, 48]} />
          <meshPhysicalMaterial color="#182658" emissive={color} emissiveIntensity={0.18} metalness={0.45} roughness={0.25} />
        </mesh>
        <Crystal position={[0, 1.2, 0]} scale={0.72} color={color} />
      </group>
    </Float>
  );
}

function LifeMapObservatory() {
  const islands = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        const radius = 10 + (index % 4) * 3.2;
        return {
          position: [Math.cos(angle) * radius, 5 + (index % 5) * 2.1, -15 + Math.sin(angle) * radius] as [number, number, number],
          scale: 0.55 + (index % 4) * 0.16,
          color: index % 3 === 0 ? GOLD : index % 2 === 0 ? BLUE : VIOLET,
        };
      }),
    [],
  );

  return (
    <group>
      <mesh position={[0, 3.3, -8.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[5.5, 6.2, 0.55, 72]} />
        <meshPhysicalMaterial color="#10173d" emissive={VIOLET} emissiveIntensity={0.13} metalness={0.68} roughness={0.18} />
      </mesh>
      <group position={[0, 4, -12]}>
        <OrbitalRing radius={8} tilt={[1.12, 0.1, 0.18]} />
        <OrbitalRing radius={12} tilt={[0.92, 0.7, -0.24]} color={VIOLET} />
        <OrbitalRing radius={17} tilt={[1.3, -0.25, 0.42]} color={GOLD} />
      </group>
      {islands.map((island, index) => <FloatingIsland key={index} {...island} />)}
      <Sparkles count={420} scale={[58, 36, 70]} position={[0, 10, -24]} size={1.1} speed={0.12} color="#d7d1ff" opacity={0.38} />
    </group>
  );
}

function MemoryMonolith({ position, height, color }: { position: [number, number, number]; height: number; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, height * 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.48, 0.68, height, 6]} />
        <meshPhysicalMaterial color="#17234d" emissive={color} emissiveIntensity={0.28} transmission={0.36} transparent opacity={0.68} roughness={0.12} />
      </mesh>
      <mesh position={[0, height + 0.2, 0]}>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function MirrorRealm() {
  return (
    <group position={[0, 0.2, -13]}>
      <mesh>
        <torusGeometry args={[6.5, 0.42, 24, 160]} />
        <meshPhysicalMaterial color="#b4eaff" emissive={BLUE} emissiveIntensity={0.8} metalness={0.35} roughness={0.08} transmission={0.24} />
      </mesh>
      <mesh>
        <circleGeometry args={[6.05, 96]} />
        <meshPhysicalMaterial color="#243677" emissive={VIOLET} emissiveIntensity={0.32} transparent opacity={0.28} transmission={0.52} roughness={0.04} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        return (
          <MemoryMonolith
            key={index}
            position={[Math.cos(angle) * 10, -3.2, Math.sin(angle) * 5]}
            height={3.4 + (index % 4) * 1.25}
            color={index % 3 === 0 ? GOLD : index % 2 === 0 ? BLUE : VIOLET}
          />
        );
      })}
      <Sparkles count={220} scale={[26, 20, 22]} size={1.3} speed={0.14} color={BLUE} opacity={0.42} />
    </group>
  );
}

function ShadowRealm() {
  const shards = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        position: [(seeded(index, 10) - 0.5) * 30, -2.1 + seeded(index, 11) * 8, -8 - seeded(index, 12) * 34] as [number, number, number],
        rotation: [seeded(index, 13) * 1.2, seeded(index, 14) * Math.PI, seeded(index, 15) * 0.8] as [number, number, number],
        scale: 0.45 + seeded(index, 16) * 1.7,
      })),
    [],
  );
  return (
    <group>
      <mesh position={[0, -3.3, -15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[25, 12]} />
        <meshStandardMaterial color={VOID} emissive={EMBER} emissiveIntensity={0.06} roughness={0.7} metalness={0.35} />
      </mesh>
      {shards.map((shard, index) => (
        <Float key={index} speed={0.2 + (index % 4) * 0.08} floatIntensity={0.2} rotationIntensity={0.06}>
          <mesh position={shard.position} rotation={shard.rotation} scale={shard.scale} castShadow>
            <octahedronGeometry args={[0.72, 0]} />
            <meshPhysicalMaterial color="#111329" emissive={index % 4 === 0 ? EMBER : VIOLET} emissiveIntensity={0.17} metalness={0.58} roughness={0.28} />
          </mesh>
        </Float>
      ))}
      <mesh position={[0, 5, -42]} scale={[8, 15, 4]}>
        <octahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#05050b" emissive={VIOLET} emissiveIntensity={0.08} roughness={1} />
      </mesh>
      <Sparkles count={180} scale={[42, 24, 55]} position={[0, 4, -20]} size={1.5} speed={0.06} color={EMBER} opacity={0.2} />
    </group>
  );
}

function PassportArchive() {
  return (
    <group position={[0, -0.3, -10]}>
      {[-1, 0, 1].map((column) =>
        Array.from({ length: 4 }, (_, row) => (
          <group key={`${column}-${row}`} position={[column * 4.4, row * 2.5 - 3.4, -Math.abs(column) * 1.4]}>
            <mesh>
              <boxGeometry args={[3.2, 1.8, 0.26]} />
              <meshPhysicalMaterial color="#132357" emissive={column === 0 ? BLUE : VIOLET} emissiveIntensity={0.18} transmission={0.46} transparent opacity={0.58} roughness={0.08} />
            </mesh>
            <mesh position={[0, 0, 0.18]}>
              <torusGeometry args={[0.42, 0.045, 8, 48]} />
              <meshBasicMaterial color={column === 0 ? GOLD : BLUE} />
            </mesh>
          </group>
        )),
      )}
      <mesh position={[0, -4.6, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[8.5, 9.2, 0.45, 64]} />
        <meshStandardMaterial color="#0a1230" emissive={BLUE} emissiveIntensity={0.08} metalness={0.55} roughness={0.22} />
      </mesh>
    </group>
  );
}

function CouncilPresence({ angle, index }: { angle: number; index: number }) {
  const radius = 9.5;
  const x = Math.cos(angle) * radius;
  const z = -14 + Math.sin(angle) * 4.8;
  const color = [BLUE, VIOLET, GOLD, "#ff9bde", "#82ffe2", "#b9a4ff"][index % 6];
  return (
    <group position={[x, -1.8, z]} rotation={[0, -angle + Math.PI / 2, 0]}>
      <mesh position={[0, 3.1, 0]} scale={[1.5, 3.2, 1.2]}>
        <capsuleGeometry args={[0.62, 1.6, 8, 18]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.38} transparent opacity={0.42} transmission={0.42} roughness={0.12} />
      </mesh>
      <mesh position={[0, 5.45, 0]}>
        <sphereGeometry args={[0.78, 24, 24]} />
        <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.65} transparent opacity={0.62} transmission={0.34} />
      </mesh>
      <mesh position={[0, 5.45, -0.05]}>
        <torusGeometry args={[1.18, 0.045, 8, 64]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[2.1, 2.45, 0.45, 48]} />
        <meshStandardMaterial color="#101735" emissive={color} emissiveIntensity={0.12} metalness={0.5} roughness={0.28} />
      </mesh>
    </group>
  );
}

function CouncilChamber() {
  return (
    <group>
      <mesh position={[0, -2.25, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[8.4, 9.2, 0.65, 72]} />
        <meshPhysicalMaterial color="#11183a" emissive={VIOLET} emissiveIntensity={0.1} metalness={0.68} roughness={0.2} />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => <CouncilPresence key={index} index={index} angle={(index / 6) * Math.PI * 2} />)}
      <group position={[0, 8.8, -12]} rotation={[Math.PI / 2, 0, 0]}>
        <OrbitalRing radius={7.5} tilt={[0, 0, 0]} color={GOLD} />
        <OrbitalRing radius={10.5} tilt={[0, 0, 0.2]} color={VIOLET} />
      </group>
      <Sparkles count={230} scale={[30, 22, 36]} position={[0, 5, -13]} size={1.1} speed={0.1} color="#e0d7ff" opacity={0.34} />
    </group>
  );
}

function LivingGround() {
  return (
    <group position={[0, -2.1, -6]}>
      {Array.from({ length: 9 }, (_, ring) => (
        <mesh key={ring} rotation={[-Math.PI / 2, 0, ring * 0.14]} position={[0, ring * 0.04, -ring * 1.25]}>
          <torusGeometry args={[2.2 + ring * 1.4, 0.12 + (ring % 3) * 0.04, 10, 72]} />
          <meshStandardMaterial color="#132342" emissive={ring % 2 === 0 ? BLUE : VIOLET} emissiveIntensity={0.18} roughness={0.58} />
        </mesh>
      ))}
      <LuminousFlora count={120} radius={14} />
      <Sparkles count={130} scale={[32, 8, 36]} position={[0, 0, -9]} size={1.2} speed={0.08} color="#82ffe2" opacity={0.3} />
    </group>
  );
}

export function GenesisSpatialAssets({ phase }: { phase: CanonMode }) {
  const visiblePhase = phase === "ASCENT" ? "HOME" : phase;
  return (
    <group name="urai-genesis-spatial-assets">
      {(visiblePhase === "HOME" || visiblePhase === "ASCENT") && <HomeSanctuary />}
      {visiblePhase === "GROUND" && <LivingGround />}
      {visiblePhase === "LIFEMAP" && <LifeMapObservatory />}
      {visiblePhase === "FOCUS" && <MirrorRealm />}
      {visiblePhase === "REPLAY" && <ShadowRealm />}
      {visiblePhase === "PASSPORT" && <PassportArchive />}
      {visiblePhase === "STATUS" && <CouncilChamber />}
    </group>
  );
}
