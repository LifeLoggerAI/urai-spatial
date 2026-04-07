'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type SceneMode = 'home' | 'lifemap' | 'focus' | 'replay';
type TransitionPhase = 'idle' | 'ascend' | 'descend' | 'focus' | 'replay';

type StarNode = {
  id: string;
  position: [number, number, number];
  size: number;
  color: string;
  title: string;
  label: string;
  summary: string;
  detail: string;
  chapter: string;
  signature: string;
  timeband: string;
  isReplay: boolean;
};

const STAR_SEED = 19830414;
const STAR_COUNT = 42;
const TRANSITION_MS = 900;

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSpatialStars(seed: number, count: number): StarNode[] {
  const rnd = mulberry32(seed);
  const colors = ['#dbeafe', '#bfdbfe', '#c7d2fe', '#93c5fd', '#a5b4fc', '#e0f2fe'];
  const chapters = ['Threshold', 'Recovery', 'Forge', 'Signal', 'Orbit', 'Recall'];
  const timebands = ['childhood', 'origin', 'breakthrough', 'winter', 'summer', 'present'];
  const out: StarNode[] = [];

  for (let i = 0; i < count; i += 1) {
    const ring = 10 + rnd() * 22;
    const theta = rnd() * Math.PI * 2;
    const phi = (rnd() - 0.5) * 1.4;

    const x = Math.cos(theta) * ring + (rnd() - 0.5) * 2.4;
    const y = Math.sin(phi) * 12 + (rnd() - 0.5) * 1.6;
    const z = Math.sin(theta) * ring + (rnd() - 0.5) * 8;

    out.push({
      id: `star-${i + 1}`,
      position: [Number(x.toFixed(4)), Number(y.toFixed(4)), Number(z.toFixed(4))],
      size: Number((0.08 + rnd() * 0.22).toFixed(4)),
      color: colors[i % colors.length],
      title: `Memory ${i + 1}`,
      label: `Star ${i + 1}`,
      summary: `Anchor ${i + 1} across the URAI life map.`,
      detail: `This is a locked placeholder memory node used to stabilize Home, LifeMap, Focus, and Replay as one continuous world.`,
      chapter: chapters[i % chapters.length],
      signature: `SIG-${String(i + 1).padStart(2, '0')}`,
      timeband: timebands[i % timebands.length],
      isReplay: i % 3 === 0,
    });
  }

  out[0] = {
    ...out[0],
    title: 'Forge',
    label: 'Forge',
    summary: 'Primary focus/replay anchor.',
    detail: 'Primary focus and replay target used for the single-scene stabilization pass.',
    chapter: 'Forge',
    signature: 'FORGE-ANCHOR',
    timeband: 'present',
    isReplay: true,
    size: 0.32,
  };

  return out;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function vec3(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z);
}

function modeLabel(mode: SceneMode, selectedStar: StarNode | null) {
  if (mode === 'focus' && selectedStar?.title) return selectedStar.title.toUpperCase();
  return mode.toUpperCase();
}

function lowerLabel(mode: SceneMode, selectedStar: StarNode | null) {
  if (mode === 'focus' && selectedStar?.title) return selectedStar.title;
  return mode;
}

function useStableStars() {
  return useMemo(() => buildSpatialStars(STAR_SEED, STAR_COUNT), []);
}

function CameraRig({
  mode,
  selectedStar,
  transitionPhase,
}: {
  mode: SceneMode;
  selectedStar: StarNode | null;
  transitionPhase: TransitionPhase;
}) {
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPos = useRef(new THREE.Vector3(0, 0.4, 12));
  const desiredLook = useRef(new THREE.Vector3(0, 0, 0));
  const tmpOrbit = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    const t = performance.now() * 0.001;

    if (mode === 'home') {
      desiredPos.current.set(0, 0.3, 12);
      desiredLook.current.set(0, 0, 0);
    } else if (mode === 'lifemap') {
      desiredPos.current.set(0, 1.8, 38);
      desiredLook.current.set(0, 0, 0);
    } else if (selectedStar) {
      const [sx, sy, sz] = selectedStar.position;
      const starVec = vec3(sx, sy, sz);
      const dir = starVec.clone().normalize();
      const focusDistance = mode === 'replay' ? 4.8 : 6.4;
      desiredPos.current.copy(starVec.clone().add(dir.multiplyScalar(focusDistance)));
      desiredLook.current.copy(starVec);

      if (mode === 'replay') {
        tmpOrbit.current.set(
          Math.sin(t * 0.55) * 0.55,
          Math.cos(t * 0.38) * 0.28,
          Math.cos(t * 0.52) * 0.48
        );
        desiredPos.current.add(tmpOrbit.current);
      }
    }

    const phaseBoost = transitionPhase === 'ascend' || transitionPhase === 'descend' ? 0.085 : 0.065;
    camera.position.lerp(desiredPos.current, phaseBoost);
    lookAtRef.current.lerp(desiredLook.current, phaseBoost);
    camera.lookAt(lookAtRef.current);
  });

  return null;
}

function Orb({
  mode,
  transitionPhase,
}: {
  mode: SceneMode;
  transitionPhase: TransitionPhase;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const homeVisible = mode === 'home' || transitionPhase === 'descend';
    const targetOpacity = homeVisible ? 0.98 : 0.0;
    const targetScale = mode === 'home' ? 1.0 : transitionPhase === 'descend' ? 0.7 : 0.24;

    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.075);
    mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
    mesh.rotation.y += 0.0028;
    mesh.rotation.x += 0.0011;
    mesh.visible = mat.opacity > 0.01;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[0.55, 32, 32]} />
      <meshBasicMaterial ref={matRef} color="#f3f4f6" transparent opacity={0.98} />
    </mesh>
  );
}

function StarField({
  stars,
  mode,
  selectedStar,
  isTransitioning,
  onSelect,
}: {
  stars: StarNode[];
  mode: SceneMode;
  selectedStar: StarNode | null;
  isTransitioning: boolean;
  onSelect: (star: StarNode) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const targetScale = mode === 'home' ? 0.54 : mode === 'lifemap' ? 1.0 : mode === 'focus' ? 0.92 : 0.96;
    const targetY = mode === 'home' ? -0.05 : 0.0;
    group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);
    group.position.lerp(new THREE.Vector3(0, targetY, 0), 0.05);

    if (mode !== 'replay') {
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, 0, 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      {stars.map((star) => (
        <StarNodeMesh
          key={star.id}
          star={star}
          mode={mode}
          isSelected={selectedStar?.id === star.id}
          isTransitioning={isTransitioning}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function StarNodeMesh({
  star,
  mode,
  isSelected,
  isTransitioning,
  onSelect,
}: {
  star: StarNode;
  mode: SceneMode;
  isSelected: boolean;
  isTransitioning: boolean;
  onSelect: (star: StarNode) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const hovered = useRef(false);

  const onPointerOver = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    hovered.current = true;
    if (typeof document !== 'undefined') {
      document.body.style.cursor = mode === 'lifemap' && !isTransitioning ? 'pointer' : 'default';
    }
  }, [isTransitioning, mode]);

  const onPointerOut = useCallback(() => {
    hovered.current = false;
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'default';
    }
  }, []);

  const onClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (mode !== 'lifemap' || isTransitioning) return;
    onSelect(star);
  }, [isTransitioning, mode, onSelect, star]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const starVec = new THREE.Vector3(star.position[0], star.position[1], star.position[2]);
    const distance = camera.position.distanceTo(starVec);

    let targetOpacity = mode === 'home' ? 0.28 : 0.88;
    if (mode === 'focus' || mode === 'replay') {
      targetOpacity = isSelected ? 1.0 : 0.14;
    }

    const depthBoost = smoothstep(42, 5, distance);
    const hoverBoost = hovered.current ? 0.14 : 0.0;
    const selectedBoost = isSelected ? 0.28 : 0.0;
    const targetScale = star.size * (mode === 'home' ? 0.75 : 1.0) * (1 + depthBoost * 0.7 + hoverBoost + selectedBoost);

    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.08);
    mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
  });

  return (
    <mesh
      ref={meshRef}
      position={star.position}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial ref={matRef} color={star.color} transparent opacity={mode === 'home' ? 0.28 : 0.88} />
    </mesh>
  );
}

function BackgroundClickPlane({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (enabled) onClick();
  }, [enabled, onClick]);

  return (
    <mesh position={[0, 0, -18]} onClick={handleClick}>
      <planeGeometry args={[120, 80]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function SceneContents({
  stars,
  mode,
  selectedStar,
  transitionPhase,
  isTransitioning,
  onAscend,
  onSelectStar,
}: {
  stars: StarNode[];
  mode: SceneMode;
  selectedStar: StarNode | null;
  transitionPhase: TransitionPhase;
  isTransitioning: boolean;
  onAscend: () => void;
  onSelectStar: (star: StarNode) => void;
}) {
  return (
    <>
      <color attach="background" args={['#02030a']} />
      <fog attach="fog" args={['#02030a', 26, 82]} />
      <ambientLight intensity={0.9} />
      <pointLight position={[0, 0, 8]} intensity={0.8} color="#dbeafe" />
      <BackgroundClickPlane enabled={mode === 'home' && !isTransitioning} onClick={onAscend} />
      <Orb mode={mode} transitionPhase={transitionPhase} />
      <StarField
        stars={stars}
        mode={mode}
        selectedStar={selectedStar}
        isTransitioning={isTransitioning}
        onSelect={onSelectStar}
      />
      <CameraRig mode={mode} selectedStar={selectedStar} transitionPhase={transitionPhase} />
    </>
  );
}

export default function SpatialScene() {
  const stars = useStableStars();
  const [mode, setMode] = useState<SceneMode>('home');
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedStar, setSelectedStar] = useState<StarNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lockTransition = useCallback((nextMode: SceneMode, phase: TransitionPhase, nextSelectedStar?: StarNode | null) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTransitionPhase(phase);

    if (typeof nextSelectedStar !== 'undefined') {
      setSelectedStar(nextSelectedStar);
    }

    setMode(nextMode);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setTransitionPhase('idle');
    }, TRANSITION_MS);
  }, [isTransitioning]);

  const goHome = useCallback(() => {
    lockTransition('home', 'descend', null);
  }, [lockTransition]);

  const goLifeMap = useCallback(() => {
    lockTransition('lifemap', 'ascend', selectedStar);
  }, [lockTransition, selectedStar]);

  const goFocus = useCallback((star: StarNode) => {
    lockTransition('focus', 'focus', star);
  }, [lockTransition]);

  const goReplay = useCallback(() => {
    if (!selectedStar) return;
    lockTransition('replay', 'replay', selectedStar);
  }, [lockTransition, selectedStar]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof document !== 'undefined') document.body.style.cursor = 'default';
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isTransitioning) return;

      if (mode === 'replay') {
        lockTransition('focus', 'focus', selectedStar);
        return;
      }

      if (mode === 'focus') {
        lockTransition('lifemap', 'descend', selectedStar);
        return;
      }

      if (mode === 'lifemap') {
        goHome();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goHome, isTransitioning, lockTransition, mode, selectedStar]);

  const overlayTitle = useMemo(() => modeLabel(mode, selectedStar), [mode, selectedStar]);
  const overlayLower = useMemo(() => lowerLabel(mode, selectedStar), [mode, selectedStar]);
  const canReplay = mode === 'focus' && !!selectedStar?.isReplay;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#02030a', overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 0.3, 12], fov: 46 }} gl={{ antialias: true }} dpr={[1, 1.5]}>
        <SceneContents
          stars={stars}
          mode={mode}
          selectedStar={selectedStar}
          transitionPhase={transitionPhase}
          isTransitioning={isTransitioning}
          onAscend={goLifeMap}
          onSelectStar={goFocus}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          color: '#f3f4f6',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 28,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {overlayTitle}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 18,
          color: '#e5e7eb',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
          fontSize: 24,
          lineHeight: 1.1,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {overlayLower}
      </div>

      {mode === 'home' && !isTransitioning ? (
        <button
          type="button"
          onClick={goLifeMap}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
          }}
          aria-label="Enter LifeMap"
          title="Enter LifeMap"
        />
      ) : null}

      {canReplay ? (
        <button
          type="button"
          onClick={goReplay}
          disabled={isTransitioning}
          style={{
            position: 'absolute',
            right: 16,
            bottom: 18,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(2,3,10,0.84)',
            color: '#f3f4f6',
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: isTransitioning ? 'default' : 'pointer',
          }}
        >
          Replay
        </button>
      ) : null}
    </div>
  );
}
