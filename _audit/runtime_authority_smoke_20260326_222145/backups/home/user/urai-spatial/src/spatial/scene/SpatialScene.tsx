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
};

const HOME_POS = new THREE.Vector3(0, 1.55, 8.25);
const HOME_LOOK = new THREE.Vector3(0, 1.15, 0);

const LIFEMAP_POS = new THREE.Vector3(0, 8.5, 15.0);
const LIFEMAP_LOOK = new THREE.Vector3(0, 8.5, 0);

const GROUND_POS = new THREE.Vector3(0, -6.5, 6.0);
const GROUND_LOOK = new THREE.Vector3(0, -8.0, -2.0);

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function smoothstep(t: number) {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
}

function makeStars(): StarNode[] {
  const rand = seeded(42);
  const clusters = [
    { cx: -6, cy: 7, cz: -8, spread: 7, count: 5 },
    { cx: 3, cy: 10, cz: -12, spread: 6, count: 5 },
    { cx: 9, cy: 6, cz: -18, spread: 8, count: 4 },
    { cx: -10, cy: 12, cz: -20, spread: 6, count: 4 },
  ];

  const out: StarNode[] = [];
  let i = 0;

  for (const cluster of clusters) {
    for (let n = 0; n < cluster.count; n++) {
      const rx = (rand() - 0.5) * cluster.spread;
      const ry = (rand() - 0.5) * cluster.spread * 0.7;
      const rz = (rand() - 0.5) * cluster.spread;
      const energy = 0.6 + rand() * 0.8;
      const radius = 0.22 + rand() * 0.28;
      out.push({
        id: `memory-${i + 1}`,
        position: [cluster.cx + rx, cluster.cy + ry, cluster.cz + rz],
        radius,
        energy,
      });
      i++;
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
      const focusOffset = new THREE.Vector3(0, 0.15, phase === 'focus' ? 4.9 : 2.7);
      targetPos = star.clone().add(focusOffset);
      targetLook = star.clone();
    }

    const posDamp = transitionActive ? 4.75 : 5.75;
    const lookDamp = transitionActive ? 5.25 : 6.0;

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

function HomeSky({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <mesh
      position={[0, 13, -24]}
      visible={enabled}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (enabled) onClick();
      }}
    >
      <planeGeometry args={[120, 70]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function HomeGround({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <group visible={enabled}>
      <mesh
        position={[0, -20.5, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (enabled) onClick();
        }}
      >
        <sphereGeometry args={[20, 64, 64]} />
        <meshStandardMaterial color="#04133A" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

function HomeOrb({ enabled }: { enabled: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || !enabled) return;
    const pulse = 0.03 * Math.sin(state.clock.elapsedTime * 0.85);
    group.current.scale.setScalar(1 + pulse * 0.25);
  });

  return (
    <group ref={group} visible={enabled} position={[0, 1.2, 0]}>
      <mesh>
        <sphereGeometry args={[0.95, 48, 48]} />
        <meshStandardMaterial color="#BAC6E8" emissive="#8A97BF" emissiveIntensity={0.45} roughness={0.75} metalness={0} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.28, 48, 48]} />
        <meshBasicMaterial color="#AAB7DE" transparent opacity={0.08} />
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
  const interactive = phase === 'lifemap';

  return (
    <group visible={phase === 'lifemap' || phase === 'focus' || phase === 'replay'}>
      {stars.map((star, idx) => {
        const isSelected = selectedStar?.id === star.id;
        const subdued = phase !== 'lifemap' && !isSelected;
        const baseRadius = star.radius * (subdued ? 0.72 : 1.0);
        const haloRadius = baseRadius * (isSelected ? 3.2 : 2.15);
        const opacity = subdued ? 0.08 : 0.13;

        return (
          <group key={star.id} position={star.position}>
            <mesh
              onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                if (!interactive || inputLocked) return;
                onSelect(star);
              }}
            >
              <sphereGeometry args={[baseRadius, 24, 24]} />
              <meshStandardMaterial
                color={isSelected ? '#D9E4FF' : '#AEB9D9'}
                emissive={isSelected ? '#B7C5F2' : '#7D89A8'}
                emissiveIntensity={isSelected ? 0.85 : 0.35}
                roughness={0.6}
                metalness={0}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[haloRadius, 18, 18]} />
              <meshBasicMaterial color="#A8B4D9" transparent opacity={opacity} />
            </mesh>
            {idx % 3 === 0 && (
              <mesh position={[0.25, -0.18, -1.2]}>
                <sphereGeometry args={[0.07, 10, 10]} />
                <meshBasicMaterial color="#7F8AA7" transparent opacity={subdued ? 0.07 : 0.22} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function FocusStar({
  phase,
  selectedStar,
  onReplay,
  inputLocked,
}: {
  phase: Phase;
  selectedStar: StarNode | null;
  onReplay: () => void;
  inputLocked: boolean;
}) {
  const active = (phase === 'focus' || phase === 'replay') && !!selectedStar;
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || !active || !selectedStar) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + 0.012 * Math.sin(t * 0.9);
    group.current.scale.setScalar(pulse);
  });

  if (!selectedStar) return null;

  return (
    <group ref={group} visible={active} position={selectedStar.position}>
      <mesh
        visible={phase === 'focus'}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (phase === 'focus' && !inputLocked) onReplay();
        }}
      >
        <sphereGeometry args={[1.05, 48, 48]} />
        <meshStandardMaterial color="#D3DCF7" emissive="#9FAEDB" emissiveIntensity={0.7} roughness={0.7} metalness={0} />
      </mesh>
      <mesh visible={phase === 'focus'}>
        <sphereGeometry args={[2.7, 36, 36]} />
        <meshBasicMaterial color="#B8C4E6" transparent opacity={0.08} />
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
    group.current.rotation.y = Math.sin(t * 0.22) * 0.03;
  });

  if (!selectedStar) return null;

  return (
    <group ref={group} visible={active} position={selectedStar.position}>
      <mesh>
        <sphereGeometry args={[0.95, 48, 48]} />
        <meshStandardMaterial color="#D3DCF7" emissive="#B8C6EA" emissiveIntensity={0.6} roughness={0.8} metalness={0} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.05, 48, 48]} />
        <meshBasicMaterial color="#AEB9D9" transparent opacity={0.16} />
      </mesh>
      <mesh rotation={[Math.PI / 2.25, 0, 0]}>
        <ringGeometry args={[2.4, 3.0, 64]} />
        <meshBasicMaterial color="#7C86A3" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[3.6, -0.55, -0.4]}>
        <sphereGeometry args={[0.58, 20, 20]} />
        <meshBasicMaterial color="#5F6886" transparent opacity={0.16} />
      </mesh>
      <mesh position={[-3.1, 0.7, 0.25]}>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshBasicMaterial color="#5F6886" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function GroundModeField({ phase }: { phase: Phase }) {
  const active = phase === 'ground';
  return (
    <group visible={active}>
      <mesh position={[0, -28, -4]}>
        <sphereGeometry args={[26, 64, 64]} />
        <meshStandardMaterial color="#031030" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, -7.5, -2]}>
        <sphereGeometry args={[7.5, 48, 48]} />
        <meshBasicMaterial color="#0B1E4C" transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

function Scene() {
  const stars = useMemo(() => makeStars(), []);
  const [phase, setPhase] = useState<Phase>('home');
  const [selectedStar, setSelectedStar] = useState<StarNode | null>(stars[0] ?? null);
  const [transitionActive, setTransitionActive] = useState<boolean>(true);
  const [inputLocked, setInputLocked] = useState<boolean>(true);

  const unlockAfter = (ms: number) => {
    setTransitionActive(true);
    setInputLocked(true);
    window.setTimeout(() => setTransitionActive(false), Math.max(200, ms - 120));
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
      if (e.key !== 'Escape') return;
      if (inputLocked) return;

      if (phase === 'replay') {
        setPhase('focus');
        unlockAfter(900);
        return;
      }
      if (phase === 'focus') {
        setPhase('lifemap');
        unlockAfter(900);
        return;
      }
      if (phase === 'lifemap') {
        setPhase('home');
        unlockAfter(1100);
        return;
      }
      if (phase === 'ground') {
        setPhase('home');
        unlockAfter(900);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, inputLocked]);

  const fogColor =
    phase === 'home'
      ? '#020A18'
      : phase === 'ground'
      ? '#020611'
      : '#020305';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        camera={{ position: [HOME_POS.x, HOME_POS.y + 0.2, HOME_POS.z + 0.45], fov: 42, near: 0.1, far: 600 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[fogColor]} />
        <fog attach="fog" args={[fogColor, 28, 190]} />

        <ambientLight intensity={phase === 'home' ? 0.34 : 0.16} />
        <pointLight position={[0, 2.5, 3]} intensity={phase === 'home' ? 0.42 : 0.12} color="#9FAEDB" />

        <CameraRig phase={phase} selectedStar={selectedStar} transitionActive={transitionActive} />

        <HomeSky
          enabled={phase === 'home'}
          onClick={() => {
            if (inputLocked) return;
            setPhase('lifemap');
            unlockAfter(1200);
          }}
        />

        <HomeGround
          enabled={phase === 'home'}
          onClick={() => {
            if (inputLocked) return;
            setPhase('ground');
            unlockAfter(950);
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
            unlockAfter(900);
          }}
        />

        <FocusStar
          phase={phase}
          selectedStar={selectedStar}
          inputLocked={inputLocked}
          onReplay={() => {
            setPhase('replay');
            unlockAfter(900);
          }}
        />

        <ReplayField phase={phase} selectedStar={selectedStar} />
        <GroundModeField phase={phase} />
      </Canvas>
    </div>
  );
}

export default Scene;
