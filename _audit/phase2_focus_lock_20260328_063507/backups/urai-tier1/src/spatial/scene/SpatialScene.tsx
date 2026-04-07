'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type Phase = 'HOME' | 'LIFEMAP' | 'FOCUS';

type TransitionState = 'IDLE' | 'HOME_TO_LIFEMAP' | 'LIFEMAP_TO_FOCUS' | 'FOCUS_TO_LIFEMAP' | 'LIFEMAP_TO_HOME';

type StarNode = {
  id: string;
  position: [number, number, number];
  intensity: number;
};

const HOME_CAMERA_POS = new THREE.Vector3(0, 1.6, 6);
const HOME_LOOK_TARGET = new THREE.Vector3(0, 1.2, 0);

const LIFEMAP_CAMERA_POS = new THREE.Vector3(0, 0.8, 16);
const LIFEMAP_LOOK_TARGET = new THREE.Vector3(0, 0.2, -20);

const FOCUS_DISTANCE_BASE = 2.8;
const FOCUS_DISTANCE_INTENSITY_GAIN = 0.45;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function easeInCubic(t: number) {
  return t * t * t;
}

function easeOutCubic(t: number) {
  const x = 1 - t;
  return 1 - x * x * x;
}

function canonicalConvergenceCurve(t: number) {
  const x = clamp01(t);
  if (x <= 0.2) {
    return 0.1 * easeInCubic(x / 0.2);
  }
  if (x <= 0.8) {
    return 0.1 + ((x - 0.2) / 0.6) * 0.8;
  }
  return 0.9 + easeOutCubic((x - 0.8) / 0.2) * 0.1;
}

function computeFocusCamera(star: StarNode) {
  const starPos = new THREE.Vector3(...star.position);
  const dir = starPos.clone().normalize();
  const fallback = dir.lengthSq() > 0.0001 ? dir : new THREE.Vector3(0, 0, -1);
  const distance = FOCUS_DISTANCE_BASE - star.intensity * FOCUS_DISTANCE_INTENSITY_GAIN;

  const pos = starPos.clone().add(new THREE.Vector3(
    -fallback.x * distance * 0.25,
    distance * 0.18,
    distance
  ));

  const target = starPos.clone();

  return { pos, target };
}

function CameraAuthority({
  phase,
  transitionState,
  selectedStar,
  requestHome,
  requestLifeMap,
}: {
  phase: Phase;
  transitionState: TransitionState;
  selectedStar: StarNode | null;
  requestHome: boolean;
  requestLifeMap: boolean;
}) {
  const { camera } = useThree();

  const lookRef = useRef(new THREE.Vector3().copy(HOME_LOOK_TARGET));
  const fromPosRef = useRef(new THREE.Vector3().copy(HOME_CAMERA_POS));
  const fromLookRef = useRef(new THREE.Vector3().copy(HOME_LOOK_TARGET));
  const toPosRef = useRef(new THREE.Vector3().copy(HOME_CAMERA_POS));
  const toLookRef = useRef(new THREE.Vector3().copy(HOME_LOOK_TARGET));
  const progressRef = useRef(1);
  const lastTransitionRef = useRef<TransitionState>('IDLE');

  useEffect(() => {
    const currentTransition = transitionState;

    if (currentTransition === 'IDLE') {
      lastTransitionRef.current = 'IDLE';
      return;
    }

    if (lastTransitionRef.current === currentTransition) {
      return;
    }

    fromPosRef.current.copy(camera.position);
    fromLookRef.current.copy(lookRef.current);
    progressRef.current = 0;

    if (currentTransition === 'HOME_TO_LIFEMAP') {
      toPosRef.current.copy(LIFEMAP_CAMERA_POS);
      toLookRef.current.copy(LIFEMAP_LOOK_TARGET);
    } else if (currentTransition === 'LIFEMAP_TO_HOME') {
      toPosRef.current.copy(HOME_CAMERA_POS);
      toLookRef.current.copy(HOME_LOOK_TARGET);
    } else if (currentTransition === 'LIFEMAP_TO_FOCUS' && selectedStar) {
      const focus = computeFocusCamera(selectedStar);
      toPosRef.current.copy(focus.pos);
      toLookRef.current.copy(focus.target);
    } else if (currentTransition === 'FOCUS_TO_LIFEMAP') {
      toPosRef.current.copy(LIFEMAP_CAMERA_POS);
      toLookRef.current.copy(LIFEMAP_LOOK_TARGET);
    } else {
      toPosRef.current.copy(camera.position);
      toLookRef.current.copy(lookRef.current);
      progressRef.current = 1;
    }

    lastTransitionRef.current = currentTransition;
  }, [camera, selectedStar, transitionState]);

  useFrame((_, dt) => {
    if (transitionState !== 'IDLE') {
      const duration =
        transitionState === 'LIFEMAP_TO_FOCUS' ? 2.1 :
        transitionState === 'FOCUS_TO_LIFEMAP' ? 1.6 :
        transitionState === 'HOME_TO_LIFEMAP' ? 2.0 :
        transitionState === 'LIFEMAP_TO_HOME' ? 2.0 :
        1.8;

      progressRef.current = clamp01(progressRef.current + dt / duration);
      const k = canonicalConvergenceCurve(progressRef.current);

      camera.position.lerpVectors(fromPosRef.current, toPosRef.current, k);
      lookRef.current.lerpVectors(fromLookRef.current, toLookRef.current, k);
      camera.lookAt(lookRef.current);
      camera.updateProjectionMatrix();
      return;
    }

    if (requestHome) {
      camera.position.copy(HOME_CAMERA_POS);
      lookRef.current.copy(HOME_LOOK_TARGET);
      camera.lookAt(lookRef.current);
      return;
    }

    if (phase === 'LIFEMAP' || requestLifeMap) {
      camera.position.copy(LIFEMAP_CAMERA_POS);
      lookRef.current.copy(LIFEMAP_LOOK_TARGET);
      camera.lookAt(lookRef.current);
      return;
    }

    if (phase === 'FOCUS' && selectedStar) {
      const focus = computeFocusCamera(selectedStar);
      camera.position.copy(focus.pos);
      lookRef.current.copy(focus.target);
      camera.lookAt(lookRef.current);
      return;
    }

    camera.position.copy(HOME_CAMERA_POS);
    lookRef.current.copy(HOME_LOOK_TARGET);
    camera.lookAt(lookRef.current);
  });

  return null;
}

function HomeEnvironment({ dimmed }: { dimmed: boolean }) {
  return (
    <>
      <color attach="background" args={['#02060b']} />
      <fog attach="fog" args={['#02060b', 12, 55]} />

      <ambientLight intensity={dimmed ? 0.18 : 0.35} />
      <hemisphereLight intensity={dimmed ? 0.22 : 0.45} groundColor="#020305" color="#102238" />
      <directionalLight position={[0, 8, 6]} intensity={dimmed ? 0.14 : 0.25} />
      <pointLight position={[0, 1.8, 0.8]} intensity={dimmed ? 0.45 : 0.65} distance={18} color="#9dbdff" />

      <mesh position={[0, -0.72, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow visible={!dimmed}>
        <circleGeometry args={[4.15, 96]} />
        <meshStandardMaterial color="#04090f" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, -0.69, -1.5]} rotation={[-Math.PI / 2, 0, 0]} visible={!dimmed}>
        <ringGeometry args={[4.1, 11.8, 96]} />
        <meshBasicMaterial color="#08111d" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, -0.67, -12]} visible={!dimmed}>
        <boxGeometry args={[34, 8, 2]} />
        <meshBasicMaterial color="#07111c" transparent opacity={0.35} />
      </mesh>
    </>
  );
}

function Orb({
  visible,
  onEnterLifeMap,
}: {
  visible: boolean;
  onEnterLifeMap: () => void;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || !visible) return;
    const t = state.clock.getElapsedTime();
    group.current.position.y = 1.15 + Math.sin(t * 0.35) * 0.015;
  });

  if (!visible) return null;

  return (
    <group ref={group} position={[0, 1.15, 0]}>
      <mesh onClick={(e) => { e.stopPropagation(); onEnterLifeMap(); }}>
        <sphereGeometry args={[0.34, 64, 64]} />
        <meshStandardMaterial
          color="#bfd3ff"
          emissive="#8fb6ff"
          emissiveIntensity={0.9}
          roughness={0.18}
          metalness={0.02}
        />
      </mesh>

      <mesh scale={[1.9, 1.9, 1.9]}>
        <sphereGeometry args={[0.34, 48, 48]} />
        <meshBasicMaterial color="#4f84ff" transparent opacity={0.07} depthWrite={false} />
      </mesh>

      <mesh position={[0, -1.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 48]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.26} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FocusField({ star }: { star: StarNode | null }) {
  if (!star) return null;

  const pos = star.position;
  const haloScale = 3.6 + star.intensity * 1.4;
  const shellScale = 5.6 + star.intensity * 1.6;

  return (
    <group position={pos}>
      <mesh scale={[haloScale, haloScale, haloScale]}>
        <sphereGeometry args={[0.34, 36, 36]} />
        <meshBasicMaterial color="#5b8cff" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh scale={[shellScale, shellScale * 0.7, shellScale]}>
        <sphereGeometry args={[0.28, 36, 36]} />
        <meshBasicMaterial color="#284266" transparent opacity={0.06} depthWrite={false} />
      </mesh>
    </group>
  );
}

function LifeMapStars({
  phase,
  selectedStarId,
  onSelectStar,
}: {
  phase: Phase;
  selectedStarId: string | null;
  onSelectStar: (star: StarNode) => void;
}) {
  const stars = useMemo<StarNode[]>(
    () => [
      { id: 's1', position: [-2.8, -1.4, -18], intensity: 0.60 },
      { id: 's2', position: [-0.3, -1.8, -15], intensity: 0.92 },
      { id: 's3', position: [2.4, -1.5, -20], intensity: 0.42 },
      { id: 's4', position: [0.8, 1.4, -24], intensity: 0.36 },
      { id: 's5', position: [-4.0, 0.5, -30], intensity: 0.25 },
      { id: 's6', position: [3.9, 0.2, -33], intensity: 0.20 },
      { id: 's7', position: [0.0, 0.8, -28], intensity: 0.18 },
      { id: 's8', position: [-1.7, 1.6, -26], intensity: 0.22 },
    ],
    []
  );

  const handleStarClick = (e: ThreeEvent<MouseEvent>, star: StarNode) => {
    e.stopPropagation();
    if (phase === 'LIFEMAP') {
      onSelectStar(star);
    }
  };

  return (
    <group>
      {stars.map((star) => {
        const isSelected = selectedStarId === star.id;
        const isFocus = phase === 'FOCUS' && isSelected;
        const coreRadius = isFocus ? 0.42 : 0.18 + star.intensity * 0.06;
        const haloScale = isFocus ? 3.6 : 2.4;
        const coreOpacity = isFocus ? 1 : 0.9 + star.intensity * 0.4;
        const haloOpacity = isFocus ? 0.22 : 0.12 + star.intensity * 0.1;
        const ringOpacity = isFocus ? 0.2 : 0.12;

        return (
          <group key={star.id} position={star.position}>
            <mesh onClick={(e) => handleStarClick(e, star)}>
              <sphereGeometry args={[coreRadius, 28, 28]} />
              <meshBasicMaterial
                color={isFocus ? '#eef4ff' : '#d9e6ff'}
                transparent
                opacity={coreOpacity}
                depthWrite={false}
              />
            </mesh>

            <mesh scale={[haloScale, haloScale, haloScale]}>
              <sphereGeometry args={[coreRadius, 20, 20]} />
              <meshBasicMaterial
                color={isFocus ? '#89aeff' : '#7fa8ff'}
                transparent
                opacity={haloOpacity}
                depthWrite={false}
              />
            </mesh>

            {(star.intensity > 0.5 || isFocus) ? (
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[coreRadius * 1.3, coreRadius * 2, 40]} />
                <meshBasicMaterial
                  color="#8fb2ff"
                  transparent
                  opacity={ringOpacity}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function SceneRoot() {
  const [phase, setPhase] = useState<Phase>('HOME');
  const [transitionState, setTransitionState] = useState<TransitionState>('IDLE');
  const [selectedStar, setSelectedStar] = useState<StarNode | null>(null);
  const [inputLocked, setInputLocked] = useState(false);

  useEffect(() => {
    if (transitionState === 'IDLE') return;

    const ms =
      transitionState === 'LIFEMAP_TO_FOCUS' ? 2100 :
      transitionState === 'FOCUS_TO_LIFEMAP' ? 1600 :
      transitionState === 'HOME_TO_LIFEMAP' ? 2000 :
      transitionState === 'LIFEMAP_TO_HOME' ? 2000 :
      1800;

    const timer = window.setTimeout(() => {
      if (transitionState === 'HOME_TO_LIFEMAP') {
        setPhase('LIFEMAP');
      } else if (transitionState === 'LIFEMAP_TO_FOCUS') {
        setPhase('FOCUS');
      } else if (transitionState === 'FOCUS_TO_LIFEMAP') {
        setPhase('LIFEMAP');
      } else if (transitionState === 'LIFEMAP_TO_HOME') {
        setPhase('HOME');
        setSelectedStar(null);
      }
      setTransitionState('IDLE');
      setInputLocked(false);
    }, ms);

    return () => window.clearTimeout(timer);
  }, [transitionState]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || inputLocked) return;

      if (phase === 'FOCUS') {
        setInputLocked(true);
        setTransitionState('FOCUS_TO_LIFEMAP');
        return;
      }

      if (phase === 'LIFEMAP') {
        setInputLocked(true);
        setTransitionState('LIFEMAP_TO_HOME');
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inputLocked, phase]);

  const enterLifeMap = () => {
    if (inputLocked || phase !== 'HOME') return;
    setInputLocked(true);
    setTransitionState('HOME_TO_LIFEMAP');
  };

  const selectStar = (star: StarNode) => {
    if (inputLocked || phase !== 'LIFEMAP') return;
    setSelectedStar(star);
    setInputLocked(true);
    setTransitionState('LIFEMAP_TO_FOCUS');
  };

  const requestHome = phase === 'HOME' && transitionState === 'IDLE';
  const requestLifeMap = phase === 'LIFEMAP' && transitionState === 'IDLE';

  const dimHome = phase !== 'HOME' || transitionState === 'HOME_TO_LIFEMAP';
  const showOrb = phase === 'HOME' || transitionState === 'LIFEMAP_TO_HOME';
  const showLifeMap = phase === 'LIFEMAP' || phase === 'FOCUS' || transitionState === 'HOME_TO_LIFEMAP' || transitionState === 'LIFEMAP_TO_FOCUS' || transitionState === 'FOCUS_TO_LIFEMAP';

  return (
    <>
      <CameraAuthority
        phase={phase}
        transitionState={transitionState}
        selectedStar={selectedStar}
        requestHome={requestHome}
        requestLifeMap={requestLifeMap}
      />

      <HomeEnvironment dimmed={dimHome} />

      <Orb visible={showOrb} onEnterLifeMap={enterLifeMap} />

      {showLifeMap ? (
        <>
          <LifeMapStars
            phase={phase}
            selectedStarId={selectedStar?.id ?? null}
            onSelectStar={selectStar}
          />
          <FocusField star={phase === 'FOCUS' || transitionState === 'LIFEMAP_TO_FOCUS' || transitionState === 'FOCUS_TO_LIFEMAP' ? selectedStar : null} />
        </>
      ) : null}

      <mesh
        position={[0, 0, -40]}
        onClick={() => {
          if (phase === 'HOME' && !inputLocked) {
            enterLifeMap();
          }
        }}
      >
        <planeGeometry args={[400, 220]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

export default function SpatialScene() {
  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', background: '#02060b' }}>
      <Canvas
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: 50, near: 0.1, far: 2000, position: [0, 1.6, 6] }}
        dpr={[1, 1.5]}
      >
        <SceneRoot />
      </Canvas>
    </div>
  );
}
