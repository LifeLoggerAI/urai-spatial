'use client';

import * as React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type Phase = 'HOME' | 'LIFEMAP' | 'FOCUS' | 'REPLAY';

type StarNode = {
  id: string;
  position: [number, number, number];
  intensity: number;
  emotionalTone: 'warm' | 'cold' | 'neutral';
  clusterId: string | null;
  memoryRef: string;
};

type CameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
};

const HOME_FOV = 50;
const HOME_POS = new THREE.Vector3(0, 1.6, 6);
const HOME_TARGET = new THREE.Vector3(0, 1.2, 0);

const LIFEMAP_FOV = 50;
const LIFEMAP_POS = new THREE.Vector3(0, 0.15, 10);
const LIFEMAP_TARGET = new THREE.Vector3(0, 0.05, 0);

const FOCUS_FOV = 46;
const REPLAY_FOV = 44;

const STAR_DATA: StarNode[] = [
  { id: 's1',  position: [-1.3,  0.55,  0.6], intensity: 0.95, emotionalTone: 'neutral', clusterId: 'c1', memoryRef: 'm1' },
  { id: 's2',  position: [-0.55, 0.95, -0.8], intensity: 0.62, emotionalTone: 'cold',    clusterId: 'c1', memoryRef: 'm2' },
  { id: 's3',  position: [ 0.10, 1.02, -1.2], intensity: 0.71, emotionalTone: 'cold',    clusterId: 'c1', memoryRef: 'm3' },
  { id: 's4',  position: [ 0.78, 1.08, -0.55], intensity: 0.83, emotionalTone: 'neutral', clusterId: 'c1', memoryRef: 'm4' },
  { id: 's5',  position: [ 1.18, 0.42,  0.2], intensity: 0.54, emotionalTone: 'neutral', clusterId: 'c1', memoryRef: 'm5' },
  { id: 's6',  position: [ 0.02, 0.05,  0.0], intensity: 1.00, emotionalTone: 'warm',    clusterId: 'c2', memoryRef: 'm6' },
  { id: 's7',  position: [-0.88,-0.58,  0.8], intensity: 0.41, emotionalTone: 'cold',    clusterId: 'c2', memoryRef: 'm7' },
  { id: 's8',  position: [-0.18,-0.42,  0.35],intensity: 0.48, emotionalTone: 'neutral', clusterId: 'c2', memoryRef: 'm8' },
  { id: 's9',  position: [ 0.34,-0.34,  0.12],intensity: 0.52, emotionalTone: 'cold',    clusterId: 'c2', memoryRef: 'm9' },
  { id: 's10', position: [ 0.88,-0.66,  0.92],intensity: 0.46, emotionalTone: 'cold',    clusterId: 'c2', memoryRef: 'm10' },
];

function toneColor(tone: StarNode['emotionalTone']): string {
  if (tone === 'warm') return '#d7deff';
  if (tone === 'cold') return '#a9c2ff';
  return '#c8d4ff';
}

function usePresenceState(): {
  phase: Phase;
  setPhase: React.Dispatch<React.SetStateAction<Phase>>;
  selectedStarId: string | null;
  setSelectedStarId: React.Dispatch<React.SetStateAction<string | null>>;
} {
  const [phase, setPhase] = React.useState<Phase>('HOME');
  const [selectedStarId, setSelectedStarId] = React.useState<string | null>(null);
  return { phase, setPhase, selectedStarId, setSelectedStarId };
}

function lerp(current: number, target: number, alpha: number): number {
  return current + (target - current) * alpha;
}

function useCameraPresence(phase: Phase, selectedStar: StarNode | null): void {
  const { camera, clock } = useThree();

  const fromPos = React.useRef(HOME_POS.clone());
  const toPos = React.useRef(HOME_POS.clone());
  const fromTarget = React.useRef(HOME_TARGET.clone());
  const toTarget = React.useRef(HOME_TARGET.clone());
  const currentTarget = React.useRef(HOME_TARGET.clone());

  const fromFov = React.useRef(HOME_FOV);
  const toFov = React.useRef(HOME_FOV);

  const elapsed = React.useRef(0);
  const duration = React.useRef(1.7);

  const transitionKey = React.useRef<string>('HOME:none');
  const settled = React.useRef(false);

  React.useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;

    const nextKey = `${phase}:${selectedStar?.id ?? 'none'}`;
    if (transitionKey.current === nextKey) return;
    transitionKey.current = nextKey;

    fromPos.current.copy(camera.position);
    fromFov.current = typeof cam.fov === 'number' ? cam.fov : HOME_FOV;

    const worldDir = new THREE.Vector3();
    camera.getWorldDirection(worldDir);
    fromTarget.current.copy(camera.position.clone().add(worldDir.multiplyScalar(10)));
    currentTarget.current.copy(fromTarget.current);

    let base: CameraPose = {
      position: HOME_POS.clone(),
      target: HOME_TARGET.clone(),
      fov: HOME_FOV,
    };

    if (phase === 'LIFEMAP') {
      base = {
        position: LIFEMAP_POS.clone(),
        target: LIFEMAP_TARGET.clone(),
        fov: LIFEMAP_FOV,
      };
      duration.current = 2.0;
    } else if (phase === 'FOCUS' && selectedStar) {
      const star = new THREE.Vector3(...selectedStar.position);
      base = {
        position: star.clone().add(new THREE.Vector3(0, 0.10, 1.78)),
        target: star.clone(),
        fov: 44,
      };
      duration.current = 2.05;
    } else if (phase === 'REPLAY' && selectedStar) {
      const star = new THREE.Vector3(...selectedStar.position);
      base = {
        position: star.clone().add(new THREE.Vector3(0, 0.03, 0.86)),
        target: star.clone().add(new THREE.Vector3(0, -0.08, -0.92)),
        fov: 42,
      };
      duration.current = 1.45;
    } else {
      duration.current = 1.7;
    }

    toPos.current.copy(base.position);
    toTarget.current.copy(base.target);
    toFov.current = base.fov;

    elapsed.current = 0;
    settled.current = false;
  }, [camera, phase, selectedStar]);

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera;

    elapsed.current = Math.min(elapsed.current + delta, duration.current);
    const rawT = duration.current <= 0 ? 1 : Math.min(1, elapsed.current / duration.current);
    const easeOut = 1 - Math.pow(1 - rawT, 3);

    camera.position.lerpVectors(fromPos.current, toPos.current, easeOut);

    const target = new THREE.Vector3().lerpVectors(fromTarget.current, toTarget.current, easeOut);

    if (rawT < 1) {
      currentTarget.current.lerp(target, 0.24);
    } else {
      settled.current = true;
      currentTarget.current.copy(toTarget.current);

      if (phase === 'HOME') {
        const t = clock.getElapsedTime();
        currentTarget.current.x += Math.sin(t * 0.12) * 0.002;
        currentTarget.current.y += Math.cos(t * 0.10) * 0.002;
      }

      if (phase === 'LIFEMAP') {
        const t = clock.getElapsedTime();
        currentTarget.current.x += Math.sin(t * 0.10) * 0.0012;
        currentTarget.current.y += Math.cos(t * 0.08) * 0.001;
      }

      if (phase === 'FOCUS' && selectedStar) {
        const t = clock.getElapsedTime();
        currentTarget.current.x += Math.sin(t * 0.18) * 0.0009;
        currentTarget.current.y += Math.cos(t * 0.15) * 0.0007;
      }

      if (phase === 'REPLAY' && selectedStar) {
        const t = clock.getElapsedTime();
        currentTarget.current.x += Math.sin(t * 0.14) * 0.0005;
        currentTarget.current.y += Math.cos(t * 0.11) * 0.0004;
      }
    }

    camera.lookAt(currentTarget.current);

    if (typeof cam.fov === 'number') {
      cam.fov = lerp(fromFov.current, toFov.current, easeOut);
      cam.updateProjectionMatrix();
    }
  });
}

function HomeOrb(): React.JSX.Element {
  const meshRef = React.useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.position.y = 1.26 + Math.sin(t * 0.32) * 0.025 + Math.sin(t * 0.12 + 1.3) * 0.01;
  });

  return (
    <group>
      <mesh ref={meshRef} position={[0, 1.26, 0]}>
        <sphereGeometry args={[0.42, 64, 64]} />
        <meshStandardMaterial color="#7f91be" emissive="#19274d" emissiveIntensity={0.22} roughness={0.52} metalness={0.04} />
      </mesh>

      <mesh position={[0, 1.26, 0]}>
        <sphereGeometry args={[0.78, 48, 48]} />
        <meshBasicMaterial color="#1a264f" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function GroundArc(): React.JSX.Element {
  return (
    <mesh position={[0, -3.05, -2.3]} rotation={[-Math.PI / 2.28, 0, 0]}>
      <sphereGeometry args={[5.6, 96, 96, 0, Math.PI * 2, 0, Math.PI / 2.05]} />
      <meshStandardMaterial color="#020304" emissive="#020712" emissiveIntensity={0.05} roughness={1} metalness={0} />
    </mesh>
  );
}

function StarAnchor({
  star,
  active,
  onClick,
}: {
  star: StarNode;
  active: boolean;
  onClick: (id: string) => void;
}): React.JSX.Element {
  const coreRef = React.useRef<THREE.Mesh>(null);
  const haloRef = React.useRef<THREE.Mesh>(null);
  const base = React.useMemo(() => new THREE.Vector3(...star.position), [star.position]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * (0.65 + star.intensity * 0.5) + base.x * 2.4) * 0.04 * (0.6 + star.intensity * 0.5);

    if (coreRef.current) {
      const s = (0.07 + star.intensity * 0.11) * (active ? 1.35 : 1) * pulse;
      coreRef.current.scale.setScalar(s);
    }
    if (haloRef.current) {
      const hs = (0.22 + star.intensity * 0.35) * (active ? 1.18 : 1) * (1 + Math.sin(t * 0.42 + base.y) * 0.03);
      haloRef.current.scale.setScalar(hs);
    }
  });

  return (
    <group position={star.position}>
      <mesh ref={haloRef}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color={toneColor(star.emotionalTone)} transparent opacity={0.055 + star.intensity * 0.045} />
      </mesh>
      <mesh ref={coreRef} onClick={() => onClick(star.id)}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={toneColor(star.emotionalTone)} />
      </mesh>
    </group>
  );
}

function NearFieldDust(): React.JSX.Element {
  const pointsRef = React.useRef<THREE.Points>(null);

  const { positions, sizes } = React.useMemo(() => {
    const count = 180;
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      p[i * 3 + 0] = (Math.random() - 0.5) * 18;
      p[i * 3 + 1] = (Math.random() - 0.5) * 10;
      p[i * 3 + 2] = -2 - Math.random() * 10;
      s[i] = 0.015 + Math.random() * 0.022;
    }
    return { positions: p, sizes: s };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.04) * 0.02;
    pointsRef.current.position.x = Math.sin(clock.getElapsedTime() * 0.06) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} sizeAttenuation transparent opacity={0.22} color="#90a8ff" depthWrite={false} />
    </points>
  );
}

function FarFieldStars(): React.JSX.Element {
  const stars = React.useMemo(() => {
    const out: Array<[number, number, number]> = [];
    for (let i = 0; i < 42; i += 1) {
      const x = (Math.random() - 0.5) * 32;
      const y = (Math.random() - 0.5) * 18;
      const z = -10 - Math.random() * 60;
      out.push([x, y, z]);
    }
    return out;
  }, []);

  return (
    <group>
      {stars.map((s, i) => (
        <mesh key={`far-${i}`} position={s}>
          <sphereGeometry args={[0.025 + ((i % 5) * 0.005), 8, 8]} />
          <meshBasicMaterial color="#86a0f2" transparent opacity={0.14 + ((i % 4) * 0.03)} />
        </mesh>
      ))}
    </group>
  );
}

function MidFieldAnchors({
  selectedStarId,
  onSelect,
}: {
  selectedStarId: string | null;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  return (
    <group>
      {STAR_DATA.map((star) => (
        <StarAnchor
          key={star.id}
          star={star}
          active={selectedStarId === star.id}
          onClick={onSelect}
        />
      ))}
    </group>
  );
}

function ReplayField({ selectedStar }: { selectedStar: StarNode | null }): React.JSX.Element {
  const haloRef = React.useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!haloRef.current || !selectedStar) return;
    const t = clock.getElapsedTime();
    const s = 1.65 + Math.sin(t * 0.36) * 0.04;
    haloRef.current.scale.setScalar(s);
  });

  if (!selectedStar) return <></>;

  return (
    <group position={selectedStar.position}>
      <mesh ref={haloRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color={toneColor(selectedStar.emotionalTone)} transparent opacity={0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.12, 28, 28]} />
        <meshBasicMaterial color="#dce4ff" />
      </mesh>
    </group>
  );
}

function SceneWorld(): React.JSX.Element {
  const { phase, setPhase, selectedStarId, setSelectedStarId } = usePresenceState();
  const selectedStar = React.useMemo(
    () => STAR_DATA.find((s) => s.id === selectedStarId) ?? null,
    [selectedStarId]
  );

  useCameraPresence(phase, selectedStar);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;

      setPhase((prev) => {
        if (prev === 'REPLAY') return 'FOCUS';
        if (prev === 'FOCUS') return 'LIFEMAP';
        if (prev === 'LIFEMAP') {
          setSelectedStarId(null);
          return 'HOME';
        }
        return 'HOME';
      });
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPhase, setSelectedStarId]);

  const handleCanvasClick = React.useCallback(() => {
    if (phase === 'HOME') {
      setPhase('LIFEMAP');
      return;
    }
    if (phase === 'FOCUS') {
      setPhase('REPLAY');
    }
  }, [phase, setPhase]);

  const handleSelect = React.useCallback((id: string) => {
    setSelectedStarId(id);
    setPhase('FOCUS');
  }, [setPhase, setSelectedStarId]);

  return (
    <>
      <color attach="background" args={['#01060b']} />
      <fog attach="fog" args={['#01060b', 18, 92]} />

      <ambientLight intensity={0.36} />
      <directionalLight position={[2.5, 4, 4]} intensity={0.58} color="#b9c6f5" />
      <pointLight position={[0, 1.4, 1.8]} intensity={0.36} color="#8ea3e8" distance={18} decay={2} />

      <group onClick={handleCanvasClick}>
        {(phase === 'HOME') && (
          <>
            <FarFieldStars />
            <NearFieldDust />
            <HomeOrb />
            <GroundArc />
          </>
        )}

        {(phase === 'LIFEMAP' || phase === 'FOCUS' || phase === 'REPLAY') && (
          <>
            <FarFieldStars />
            <NearFieldDust />
            <MidFieldAnchors selectedStarId={selectedStarId} onSelect={handleSelect} />
          </>
        )}

        {phase === 'REPLAY' && <ReplayField selectedStar={selectedStar} />}
      </group>
    </>
  );
}

export default function SpatialScene(): React.JSX.Element {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#01060b' }}>
      <Canvas
        camera={{ position: [0, 1.6, 6], fov: 50, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.75]}
      >
        <SceneWorld />
      </Canvas>
    </div>
  );
}
