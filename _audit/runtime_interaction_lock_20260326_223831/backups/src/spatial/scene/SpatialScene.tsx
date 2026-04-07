'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type Phase = 'home' | 'lifemap' | 'focus' | 'replay' | 'ground';

type StarNode = {
  id: string;
  position: [number, number, number];
  radius: number;
  energy: number;
  band: 'near' | 'mid' | 'far';
};

const HOME_POS = new THREE.Vector3(0, 1.8, 9.8);
const HOME_LOOK = new THREE.Vector3(0, 1.2, 0);

const LIFEMAP_POS = new THREE.Vector3(0, 8.6, 12.8);
const LIFEMAP_LOOK = new THREE.Vector3(0, 8.3, -8.5);

const GROUND_POS = new THREE.Vector3(0, -7.0, 5.2);
const GROUND_LOOK = new THREE.Vector3(0, -8.8, -4.0);

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeStars(): StarNode[] {
  const rand = seeded(42);
  const out: StarNode[] = [];
  let i = 0;

  const nearClusters = [
    { cx: -5, cy: 7.5, cz: -8, spread: 4.5, count: 6 },
    { cx: 4, cy: 8.2, cz: -10, spread: 4.8, count: 6 },
  ];

  const midClusters = [
    { cx: -9, cy: 9.4, cz: -18, spread: 8, count: 8 },
    { cx: 3, cy: 10.5, cz: -22, spread: 7, count: 8 },
    { cx: 11, cy: 7.5, cz: -26, spread: 9, count: 6 },
  ];

  const farClusters = [
    { cx: -18, cy: 16, cz: -48, spread: 15, count: 16 },
    { cx: 0, cy: 18, cz: -58, spread: 18, count: 14 },
    { cx: 20, cy: 13, cz: -52, spread: 16, count: 16 },
  ];

  for (const cluster of nearClusters) {
    for (let n = 0; n < cluster.count; n++) {
      const rx = (rand() - 0.5) * cluster.spread;
      const ry = (rand() - 0.5) * cluster.spread * 0.6;
      const rz = (rand() - 0.5) * cluster.spread;
      out.push({
        id: `memory-near-${++i}`,
        position: [cluster.cx + rx, cluster.cy + ry, cluster.cz + rz],
        radius: 0.22 + rand() * 0.14,
        energy: 0.7 + rand() * 0.5,
        band: 'near',
      });
    }
  }

  for (const cluster of midClusters) {
    for (let n = 0; n < cluster.count; n++) {
      const rx = (rand() - 0.5) * cluster.spread;
      const ry = (rand() - 0.5) * cluster.spread * 0.7;
      const rz = (rand() - 0.5) * cluster.spread;
      out.push({
        id: `memory-mid-${++i}`,
        position: [cluster.cx + rx, cluster.cy + ry, cluster.cz + rz],
        radius: 0.14 + rand() * 0.09,
        energy: 0.55 + rand() * 0.35,
        band: 'mid',
      });
    }
  }

  for (const cluster of farClusters) {
    for (let n = 0; n < cluster.count; n++) {
      const rx = (rand() - 0.5) * cluster.spread;
      const ry = (rand() - 0.5) * cluster.spread * 0.8;
      const rz = (rand() - 0.5) * cluster.spread;
      out.push({
        id: `memory-far-${++i}`,
        position: [cluster.cx + rx, cluster.cy + ry, cluster.cz + rz],
        radius: 0.05 + rand() * 0.04,
        energy: 0.35 + rand() * 0.2,
        band: 'far',
      });
    }
  }

  return out;
}

function CameraRig({
  phase,
  selectedStar,
  transitionActive,
}: {
  phase: Phase;
  selectedStar: StarNode | null;
  transitionActive: boolean;
}) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, dt) => {
    let targetPos = HOME_POS.clone();
    let targetLook = HOME_LOOK.clone();

    if (phase === 'lifemap') {
      targetPos = LIFEMAP_POS.clone();
      targetLook = LIFEMAP_LOOK.clone();
    }

    if (phase === 'ground') {
      targetPos = GROUND_POS.clone();
      targetLook = GROUND_LOOK.clone();
    }

    if ((phase === 'focus' || phase === 'replay') && selectedStar) {
      const star = new THREE.Vector3(...selectedStar.position);
      const offset =
        phase === 'focus'
          ? new THREE.Vector3(0, 0.12, 3.65)
          : new THREE.Vector3(0, 0.05, 2.15);
      targetPos = star.clone().add(offset);
      targetLook = star.clone();
    }

    const posDamp = transitionActive ? 3.8 : 4.8;
    const lookDamp = transitionActive ? 4.4 : 5.4;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.x, posDamp, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.y, posDamp, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.z, posDamp, dt);

    look.current.x = THREE.MathUtils.damp(look.current.x, targetLook.x, lookDamp, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, targetLook.y, lookDamp, dt);
    look.current.z = THREE.MathUtils.damp(look.current.z, targetLook.z, lookDamp, dt);

    camera.lookAt(look.current);
  });

  return null;
}

function HomeSky({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <mesh
      position={[0, 14, -22]}
      visible={enabled}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (enabled) onClick();
      }}
    >
      <planeGeometry args={[130, 78]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function HomeGround({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <group visible={enabled}>
      <mesh
        position={[0, -23, -2]}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (enabled) onClick();
        }}
      >
        <sphereGeometry args={[22, 64, 64]} />
        <meshStandardMaterial color="#031236" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, -3.9, -7]}>
        <sphereGeometry args={[9.5, 48, 48]} />
        <meshBasicMaterial color="#10214C" transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

function HomeOrb({ enabled }: { enabled: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || !enabled) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = 1.2 + Math.sin(t * 0.45) * 0.03;
    group.current.scale.setScalar(1 + Math.sin(t * 0.8) * 0.008);
  });

  return (
    <group ref={group} visible={enabled} position={[0, 1.2, 0]}>
      <mesh>
        <sphereGeometry args={[0.88, 48, 48]} />
        <meshStandardMaterial color="#C5D0EA" emissive="#8F9FC7" emissiveIntensity={0.38} roughness={0.82} metalness={0} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.22, 48, 48]} />
        <meshBasicMaterial color="#C1CDEA" transparent opacity={0.065} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.52, 48, 48]} />
        <meshBasicMaterial color="#AEBBDE" transparent opacity={0.03} />
      </mesh>
    </group>
  );
}

function LifeMapStars({
  phase,
  stars,
  selectedStar,
  onSelect,
  inputLocked,
}: {
  phase: Phase;
  stars: StarNode[];
  selectedStar: StarNode | null;
  onSelect: (s: StarNode) => void;
  inputLocked: boolean;
}) {
  return (
    <group visible={phase === 'lifemap' || phase === 'focus' || phase === 'replay'}>
      {stars.map((star) => {
        const isSelected = selectedStar?.id === star.id;
        const subdued = phase !== 'lifemap' && !isSelected;

        const baseRadius =
          star.band === 'near'
            ? star.radius
            : star.band === 'mid'
            ? star.radius * 0.92
            : star.radius * 0.85;

        const haloRadius =
          star.band === 'near'
            ? baseRadius * (isSelected ? 3.2 : 2.0)
            : star.band === 'mid'
            ? baseRadius * (isSelected ? 2.5 : 1.6)
            : baseRadius * 1.2;

        const opacity =
          star.band === 'near'
            ? subdued
              ? 0.05
              : 0.11
            : star.band === 'mid'
            ? subdued
              ? 0.035
              : 0.07
            : subdued
            ? 0.015
            : 0.03;

        const interactive = phase === 'lifemap' && star.band !== 'far';

        return (
          <group key={star.id} position={star.position}>
            <mesh
              onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                if (!interactive || inputLocked) return;
                onSelect(star);
              }}
            >
              <sphereGeometry args={[baseRadius * (subdued ? 0.88 : 1), 20, 20]} />
              <meshStandardMaterial
                color={isSelected ? '#DEE7FF' : star.band === 'far' ? '#8B95B3' : '#B6C1DE'}
                emissive={isSelected ? '#BFCBF2' : star.band === 'far' ? '#56607B' : '#7E89A8'}
                emissiveIntensity={isSelected ? 0.86 : star.band === 'far' ? 0.14 : 0.33}
                roughness={0.7}
                metalness={0}
              />
            </mesh>

            <mesh>
              <sphereGeometry args={[haloRadius, 16, 16]} />
              <meshBasicMaterial color="#AAB6D8" transparent opacity={opacity} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function FocusShell({
  phase,
  selectedStar,
  inputLocked,
  onReplay,
}: {
  phase: Phase;
  selectedStar: StarNode | null;
  inputLocked: boolean;
  onReplay: () => void;
}) {
  const active = (phase === 'focus' || phase === 'replay') && !!selectedStar;
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || !active) return;
    const t = state.clock.elapsedTime;
    group.current.scale.setScalar(1 + Math.sin(t * 0.9) * 0.008);
  });

  if (!selectedStar) return null;

  return (
    <group ref={group} visible={active} position={selectedStar.position}>
      <mesh
        visible={phase === 'focus'}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (!inputLocked && phase === 'focus') onReplay();
        }}
      >
        <sphereGeometry args={[0.82, 40, 40]} />
        <meshStandardMaterial color="#D5DDF4" emissive="#A2B0D9" emissiveIntensity={0.68} roughness={0.76} metalness={0} />
      </mesh>
      <mesh visible={phase === 'focus'}>
        <sphereGeometry args={[1.9, 28, 28]} />
        <meshBasicMaterial color="#B7C4E5" transparent opacity={0.08} />
      </mesh>
      <mesh visible={phase === 'focus'}>
        <sphereGeometry args={[2.55, 28, 28]} />
        <meshBasicMaterial color="#A4B0D2" transparent opacity={0.03} />
      </mesh>
    </group>
  );
}

function ReplayField({
  phase,
  selectedStar,
}: {
  phase: Phase;
  selectedStar: StarNode | null;
}) {
  const active = phase === 'replay' && !!selectedStar;
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || !active) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.18) * 0.04;
  });

  if (!selectedStar) return null;

  return (
    <group ref={group} visible={active} position={selectedStar.position}>
      <mesh>
        <sphereGeometry args={[0.76, 36, 36]} />
        <meshStandardMaterial color="#D7DEF1" emissive="#AFBCDF" emissiveIntensity={0.55} roughness={0.82} metalness={0} />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.55, 32, 32]} />
        <meshBasicMaterial color="#AEB9D8" transparent opacity={0.1} />
      </mesh>

      <mesh rotation={[Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[2.05, 2.45, 64]} />
        <meshBasicMaterial color="#7B85A3" transparent opacity={0.24} side={THREE.DoubleSide} />
      </mesh>

      <mesh rotation={[Math.PI / 2.3, 0.65, 0]}>
        <ringGeometry args={[2.75, 3.05, 64]} />
        <meshBasicMaterial color="#5C6584" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[2.9, -0.42, -0.28]}>
        <sphereGeometry args={[0.33, 18, 18]} />
        <meshBasicMaterial color="#5B6483" transparent opacity={0.17} />
      </mesh>

      <mesh position={[-2.35, 0.58, 0.16]}>
        <sphereGeometry args={[0.24, 18, 18]} />
        <meshBasicMaterial color="#5B6483" transparent opacity={0.11} />
      </mesh>
    </group>
  );
}

function GroundModeField({ phase }: { phase: Phase }) {
  return (
    <group visible={phase === 'ground'}>
      <mesh position={[0, -30, -5]}>
        <sphereGeometry args={[28, 64, 64]} />
        <meshStandardMaterial color="#020D26" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, -8.8, -4]}>
        <sphereGeometry args={[8.5, 40, 40]} />
        <meshBasicMaterial color="#0A1940" transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

function SceneCore() {
  const stars = useMemo(() => makeStars(), []);
  const [phase, setPhase] = useState<Phase>('home');
  const [selectedStar, setSelectedStar] = useState<StarNode | null>(stars.find((s) => s.band !== 'far') ?? stars[0] ?? null);
  const [transitionActive, setTransitionActive] = useState(true);
  const [inputLocked, setInputLocked] = useState(true);

  const unlockAfter = (ms: number) => {
    setTransitionActive(true);
    setInputLocked(true);
    window.setTimeout(() => setTransitionActive(false), Math.max(220, ms - 140));
    window.setTimeout(() => setInputLocked(false), ms);
  };

  useEffect(() => {
    const t1 = window.setTimeout(() => setTransitionActive(false), 700);
    const t2 = window.setTimeout(() => setInputLocked(false), 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || inputLocked) return;

      if (phase === 'replay') {
        setPhase('focus');
        unlockAfter(780);
        return;
      }

      if (phase === 'focus') {
        setPhase('lifemap');
        unlockAfter(860);
        return;
      }

      if (phase === 'lifemap') {
        setPhase('home');
        unlockAfter(1080);
        return;
      }

      if (phase === 'ground') {
        setPhase('home');
        unlockAfter(920);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, inputLocked]);

  const backgroundColor =
    phase === 'home'
      ? '#020913'
      : phase === 'ground'
      ? '#020711'
      : '#010207';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        camera={{ position: [HOME_POS.x, HOME_POS.y, HOME_POS.z], fov: 40, near: 0.1, far: 700 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[backgroundColor]} />
        <fog attach="fog" args={[backgroundColor, 26, 180]} />

        <ambientLight intensity={phase === 'home' ? 0.3 : 0.12} />
        <pointLight position={[0, 2.5, 4]} intensity={phase === 'home' ? 0.36 : 0.08} color="#9FAFD3" />
        <pointLight position={[0, 10, -18]} intensity={phase === 'lifemap' ? 0.2 : 0.05} color="#7D88AA" />

        <CameraRig phase={phase} selectedStar={selectedStar} transitionActive={transitionActive} />

        <HomeSky
          enabled={phase === 'home'}
          onClick={() => {
            if (inputLocked) return;
            setPhase('lifemap');
            unlockAfter(1180);
          }}
        />

        <HomeGround
          enabled={phase === 'home'}
          onClick={() => {
            if (inputLocked) return;
            setPhase('ground');
            unlockAfter(920);
          }}
        />

        <HomeOrb enabled={phase === 'home'} />

        <LifeMapStars
          phase={phase}
          stars={stars}
          selectedStar={selectedStar}
          inputLocked={inputLocked}
          onSelect={(star) => {
            setSelectedStar(star);
            setPhase('focus');
            unlockAfter(860);
          }}
        />

        <FocusShell
          phase={phase}
          selectedStar={selectedStar}
          inputLocked={inputLocked}
          onReplay={() => {
            setPhase('replay');
            unlockAfter(760);
          }}
        />

        <ReplayField phase={phase} selectedStar={selectedStar} />
        <GroundModeField phase={phase} />
      </Canvas>
    </div>
  );
}

export default function SpatialScene() {
  return <SceneCore />;
}
