'use client';

import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import CameraDirector from './CameraDirector';
import HomeEnvironment from './HomeEnvironment';
import Orb from './Orb';
import Starfield, { type StarfieldStar } from './Starfield';
import type { ScenePhase, StarPoint } from './sceneState';
import { isHomeFamily } from './sceneState';

const PHASE_DURATION_MS: Record<ScenePhase, number> = {
  home: 0,
  enter_init: 260,
  enter_ascent: 900,
  enter_separation: 520,
  enter_arrival: 320,
  lifemap: 0,
  focus_lock: 380,
  focus_travel: 1650,
  focus_arrive: 900,
  replay: 0,
  return_from_replay: 900,
  return_to_lifemap: 1200,
  return_home_descent: 2000,
  return_home_settle: 320,
};

const STABLE_PHASES: ScenePhase[] = ['home', 'lifemap', 'focus_arrive', 'replay'];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function phaseToStarfieldPhase(phase: ScenePhase): 'home' | 'lifemap' | 'focus' | 'replay' {
  if (phase === 'replay' || phase === 'return_from_replay') return 'replay';
  if (
    phase === 'focus_lock' ||
    phase === 'focus_travel' ||
    phase === 'focus_arrive' ||
    phase === 'return_to_lifemap'
  ) return 'focus';
  if (
    phase === 'home' ||
    phase === 'enter_init' ||
    phase === 'enter_ascent' ||
    phase === 'enter_separation'
  ) return 'home';
  return 'lifemap';
}

function ReplayField({ star, visible }: { star: StarPoint | null; visible: boolean }) {
  if (!visible || !star) return null;
  const [x, y, z] = star.position as [number, number, number];

  return (
    <group position={[x, y, z]}>
      <mesh renderOrder={10}>
        <sphereGeometry args={[2.1, 40, 40]} />
        <meshBasicMaterial
          color="#7ea6ff"
          transparent
          opacity={0.04}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.04, -0.7]} renderOrder={11}>
        <planeGeometry args={[3.8, 1.6]} />
        <meshBasicMaterial
          color="#09111f"
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, -0.25, 0.16]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={12}>
        <ringGeometry args={[0.42, 1.85, 72]} />
        <meshBasicMaterial
          color="#547dff"
          transparent
          opacity={0.065}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function SpatialScene() {
  const [phase, setPhase] = useState<ScenePhase>('home');
  const [progress, setProgress] = useState<number>(1);
  const [selectedStar, setSelectedStar] = useState<StarPoint | null>(null);
  const [inputLocked, setInputLocked] = useState<boolean>(false);
  const rafRef = useRef<number | null>(null);

  const beginPhase = useCallback((next: ScenePhase) => {
    setPhase(next);
    setProgress(0);
    setInputLocked(!STABLE_PHASES.includes(next));
  }, []);

  const advanceFrom = useCallback((current: ScenePhase) => {
    switch (current) {
      case 'enter_init':
        beginPhase('enter_ascent');
        return;
      case 'enter_ascent':
        beginPhase('enter_separation');
        return;
      case 'enter_separation':
        beginPhase('enter_arrival');
        return;
      case 'enter_arrival':
        setPhase('lifemap');
        setProgress(1);
        setInputLocked(false);
        return;
      case 'focus_lock':
        beginPhase('focus_travel');
        return;
      case 'focus_travel':
        beginPhase('focus_arrive');
        return;
      case 'return_from_replay':
        setPhase('focus_arrive');
        setProgress(1);
        setInputLocked(false);
        return;
      case 'return_to_lifemap':
        setPhase('lifemap');
        setProgress(1);
        setInputLocked(false);
        return;
      case 'return_home_descent':
        beginPhase('return_home_settle');
        return;
      case 'return_home_settle':
        setPhase('home');
        setProgress(1);
        setSelectedStar(null);
        setInputLocked(false);
        return;
      default:
        return;
    }
  }, [beginPhase]);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const duration = PHASE_DURATION_MS[phase] ?? 0;

    if (duration <= 0) {
      setProgress(1);
      setInputLocked(!STABLE_PHASES.includes(phase));
      return;
    }

    let start = 0;
    setInputLocked(true);

    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = clamp01((ts - start) / duration);
      setProgress(p);

      if (p >= 1) {
        advanceFrom(phase);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, advanceFrom]);

  const enterLifemap = useCallback(() => {
    if (inputLocked || phase !== 'home') return;
    beginPhase('enter_init');
  }, [beginPhase, inputLocked, phase]);

  const enterFocus = useCallback((star: StarfieldStar) => {
    if (inputLocked || phase !== 'lifemap') return;

    const canonicalStar = {
      id: star.id,
      position: star.position,
      intensity: 0.82,
      emotionalTone: 'neutral',
      clusterId: null,
      memoryRef: star.id,
    } as unknown as StarPoint;

    setSelectedStar(canonicalStar);
    beginPhase('focus_lock');
  }, [beginPhase, inputLocked, phase]);

  const enterReplay = useCallback(() => {
    if (inputLocked || phase !== 'focus_arrive' || !selectedStar) return;
    setPhase('replay');
    setProgress(1);
    setInputLocked(false);
  }, [inputLocked, phase, selectedStar]);

  const unwind = useCallback(() => {
    if (inputLocked) return;

    if (phase === 'replay') {
      beginPhase('return_from_replay');
      return;
    }

    if (phase === 'focus_arrive') {
      beginPhase('return_to_lifemap');
      return;
    }

    if (phase === 'lifemap') {
      beginPhase('return_home_descent');
    }
  }, [beginPhase, inputLocked, phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      unwind();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [unwind]);

  const homeBlend = useMemo(() => {
    if (phase === 'home') return 1;
    if (phase === 'enter_init') return 1 - progress * 0.03;
    if (phase === 'enter_ascent') return 0.97 - progress * 0.15;
    if (phase === 'enter_separation') return 0.82 - progress * 0.34;
    if (phase === 'enter_arrival') return 0.48 - progress * 0.36;
    if (phase === 'return_home_descent') return 0.12 + progress * 0.68;
    if (phase === 'return_home_settle') return 0.8 + progress * 0.2;
    return 0;
  }, [phase, progress]);

  const ascentBlend = useMemo(() => {
    if (phase === 'enter_init') return 0.06 + progress * 0.08;
    if (phase === 'enter_ascent') return 0.14 + progress * 0.38;
    if (phase === 'enter_separation') return 0.52 + progress * 0.24;
    if (phase === 'enter_arrival') return 0.76 + progress * 0.24;
    if (phase === 'return_home_descent') return 1 - progress * 0.62;
    if (phase === 'return_home_settle') return 0.38 - progress * 0.38;
    return 0;
  }, [phase, progress]);

  const starfieldVisible = phase !== 'home';
  const starfieldPresence = useMemo(() => {
    if (phase === 'home') return 0;
    if (phase === 'enter_init') return 0.02 + progress * 0.05;
    if (phase === 'enter_ascent') return 0.07 + progress * 0.15;
    if (phase === 'enter_separation') return 0.22 + progress * 0.28;
    if (phase === 'enter_arrival') return 0.50 + progress * 0.50;
    if (phase === 'lifemap') return 1;
    if (phase === 'focus_lock') return 0.74;
    if (phase === 'focus_travel') return 0.52;
    if (phase === 'focus_arrive') return 0.34;
    if (phase === 'replay') return 0.08;
    if (phase === 'return_from_replay') return 0.08 + progress * 0.2;
    if (phase === 'return_to_lifemap') return 0.28 + progress * 0.72;
    if (phase === 'return_home_descent') return 1 - progress * 0.8;
    if (phase === 'return_home_settle') return 0.2 - progress * 0.2;
    return 0;
  }, [phase, progress]);

  const starfieldInteractive = !inputLocked && (phase === 'lifemap' || phase === 'focus_arrive');

  const handleStarSelect = useCallback((star: StarfieldStar) => {
    if (inputLocked) return;

    if (phase === 'lifemap') {
      enterFocus(star);
      return;
    }

    if (phase === 'focus_arrive' && selectedStar && star.id === selectedStar.id) {
      enterReplay();
    }
  }, [enterFocus, enterReplay, inputLocked, phase, selectedStar]);

  return (
    <Canvas
      gl={{ antialias: true }}
      camera={{ position: [0, 1.6, 6], fov: 50, near: 0.1, far: 2000 }}
      onPointerMissed={() => {
        if (phase === 'home' && !inputLocked) enterLifemap();
      }}
    >
      <CameraDirector phase={phase} progress={progress} selectedStar={selectedStar} />

      <ambientLight intensity={0.16} />
      <directionalLight position={[4, 6, 4]} intensity={0.66} />
      <pointLight position={[0, 2.05, 1.8]} intensity={1.08} color="#6f8cff" />

      <HomeEnvironment worldBlend={homeBlend} ascentBlend={ascentBlend} />

      {isHomeFamily(phase) && (
        <Orb
          opacity={Math.max(0, homeBlend)}
          scale={1}
          y={0.9 + ascentBlend * 0.12}
          z={-1.8 - ascentBlend * 0.18}
        />
      )}

      <Starfield
        visible={starfieldVisible}
        presence={starfieldPresence}
        interactive={starfieldInteractive}
        selectedId={selectedStar?.id ?? null}
        phase={phaseToStarfieldPhase(phase)}
        onSelectStar={handleStarSelect}
      />

      <ReplayField star={selectedStar} visible={phase === 'replay'} />
    </Canvas>
  );
}
