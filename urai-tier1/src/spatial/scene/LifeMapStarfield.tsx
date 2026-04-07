import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism";
'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export type LifeMapStarfieldProps = {
  visible?: boolean;
  opacity?: number;
  progress?: number;
  focusMode?: boolean;
  onSelectStar?: () => void;
};

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function buildLayer(
  count: number,
  spreadX: number,
  spreadY: number,
  zMin: number,
  zMax: number,
  centerBias: number
) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const bx = uraiRandom() - 0.5;
    const by = uraiRandom() - 0.5;
    const bias = 1 - Math.pow(uraiRandom(), centerBias);

    positions[i * 3 + 0] = bx * spreadX * (0.35 + bias * 0.65);
    positions[i * 3 + 1] = by * spreadY * (0.35 + bias * 0.65);
    positions[i * 3 + 2] = zMin - uraiRandom() * (zMax - zMin);
  }

  return positions;
}

function buildAnchorLayer(count: number, spreadX: number, spreadY: number, zMin: number, zMax: number) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const angle = uraiRandom() * Math.PI * 2;
    const radius = Math.pow(uraiRandom(), 0.55);

    positions[i * 3 + 0] = Math.cos(angle) * spreadX * radius * 0.48;
    positions[i * 3 + 1] = Math.sin(angle) * spreadY * radius * 0.38;
    positions[i * 3 + 2] = zMin - uraiRandom() * (zMax - zMin);
  }

  return positions;
}

function StarLayer({
  positions,
  size,
  baseOpacity,
  color,
  rotSpeed,
  driftX,
  driftY,
  emergeOffset,
  progress = 1,
  visible = true,
  focusMode = false,
}: {
  positions: Float32Array;
  size: number;
  baseOpacity: number;
  color: string;
  rotSpeed: number;
  driftX: number;
  driftY: number;
  emergeOffset: number;
  progress?: number;
  visible?: boolean;
  focusMode?: boolean;
}) {
  const ref = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (!ref.current || !visible) return;

    const t = state.clock.getElapsedTime();
    const appear = THREE.MathUtils.clamp((progress - emergeOffset) / (1 - emergeOffset), 0, 1);
    const eased = smoothstep(appear);
    const focusFade = focusMode ? 0.12 : 1;
    const mat = ref.current.material as THREE.PointsMaterial;

    ref.current.rotation.y = t * rotSpeed * (0.7 + eased * 0.85);
    ref.current.rotation.x = Math.sin(t * rotSpeed * 5.5) * 0.018 * eased;
    ref.current.position.x = Math.sin(t * rotSpeed * 15) * driftX * eased;
    ref.current.position.y = Math.cos(t * rotSpeed * 11) * driftY * eased;

    mat.opacity = baseOpacity * eased * focusFade;
  });

  return (
    <points ref={ref} visible={visible}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
      />
    </points>
  );
}

function AnchorStars({
  positions,
  progress = 1,
  opacity = 1,
  visible = true,
  focusMode = false,
  onSelectStar,
}: {
  positions: Float32Array;
  progress?: number;
  opacity?: number;
  visible?: boolean;
  focusMode?: boolean;
  onSelectStar?: () => void;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const selectedRef = useRef<THREE.Mesh>(null);
  const pickIndex = 2;

  useFrame((state, delta) => {
    if (!visible) return;

    const t = state.clock.getElapsedTime();
    const appear = THREE.MathUtils.clamp((progress - 0.34) / 0.66, 0, 1);
    const eased = smoothstep(appear);
    const pulse = 0.86 + 0.14 * Math.sin(t * 0.7);

    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      pointsRef.current.rotation.y = t * 0.0016;
      pointsRef.current.position.x = Math.sin(t * 0.09) * 0.05;
      mat.opacity = opacity * eased * pulse * (focusMode ? 0.16 : 1);
    }

    if (selectedRef.current) {
      const targetOpacity = visible ? opacity * eased : 0;
      const mat = selectedRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * (1 - Math.exp(-delta * 4.8));
      selectedRef.current.scale.setScalar(1 + Math.sin(t * 0.8) * 0.08);
    }
  });

  const selectedX = positions[pickIndex * 3 + 0];
  const selectedY = positions[pickIndex * 3 + 1];
  const selectedZ = positions[pickIndex * 3 + 2];

  return (
    <group visible={visible}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          size={0.19}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>

      <mesh
        ref={selectedRef}
        position={[selectedX, selectedY, selectedZ]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelectStar?.();
        }}
      >
        <sphereGeometry args={[0.46, 28, 28]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function LifeMapStarfield({
  visible = true,
  opacity = 1,
  progress = 1,
  focusMode = false,
  onSelectStar,
}: LifeMapStarfieldProps) {
  const near = useMemo(() => buildLayer(320, 22, 16, 4, 20, 1.7), []);
  const mid = useMemo(() => buildLayer(560, 54, 38, 16, 66, 1.38), []);
  const far = useMemo(() => buildLayer(960, 132, 92, 46, 180, 1.18), []);
  const anchors = useMemo(() => buildAnchorLayer(14, 38, 28, 20, 110), []);

  const fogCoreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const farWashRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!visible) return;

    const t = state.clock.getElapsedTime();
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const eased = smoothstep(p);
    const focusFade = focusMode ? 0.16 : 1;

    if (fogCoreRef.current) {
      const mat = fogCoreRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity * eased * focusFade * (0.085 + Math.sin(t * 0.11) * 0.010);
      fogCoreRef.current.rotation.y = t * 0.015;
    }

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const local = THREE.MathUtils.clamp((progress - 0.08) / 0.92, 0, 1);
      mat.opacity = opacity * smoothstep(local) * focusFade * (0.065 + Math.cos(t * 0.08) * 0.008);
    }

    if (farWashRef.current) {
      const mat = farWashRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity * eased * focusFade * (0.042 + Math.sin(t * 0.06) * 0.006);
      farWashRef.current.rotation.y = -t * 0.008;
    }
  });

  return (
    <group visible={visible}>
      <mesh ref={farWashRef} position={[0, 0, -68]}>
        <sphereGeometry args={[78, 42, 28]} />
        <meshBasicMaterial
          color="#09142d"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={glowRef} position={[0, 0.25, -40]}>
        <sphereGeometry args={[46, 42, 28]} />
        <meshBasicMaterial
          color="#11224a"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={fogCoreRef} position={[0, 0.1, -22]}>
        <sphereGeometry args={[24, 32, 24]} />
        <meshBasicMaterial
          color="#081224"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <StarLayer
        positions={far}
        size={0.028}
        baseOpacity={0.30 * opacity}
        color="#668ae0"
        rotSpeed={0.0009}
        driftX={0.032}
        driftY={0.015}
        emergeOffset={0.05}
        progress={progress}
        visible={visible}
        focusMode={focusMode}
      />

      <StarLayer
        positions={mid}
        size={0.060}
        baseOpacity={0.52 * opacity}
        color="#a8c2ff"
        rotSpeed={0.0022}
        driftX={0.10}
        driftY={0.04}
        emergeOffset={0.18}
        progress={progress}
        visible={visible}
        focusMode={focusMode}
      />

      <StarLayer
        positions={near}
        size={0.125}
        baseOpacity={0.92 * opacity}
        color="#f4f8ff"
        rotSpeed={0.0052}
        driftX={0.24}
        driftY={0.10}
        emergeOffset={0.32}
        progress={progress}
        visible={visible}
        focusMode={focusMode}
      />

      <AnchorStars
        positions={anchors}
        progress={progress}
        opacity={0.96 * opacity}
        visible={visible}
        focusMode={focusMode}
        onSelectStar={onSelectStar}
      />
    </group>
  );
}
