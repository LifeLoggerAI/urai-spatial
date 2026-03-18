"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Phase =
  | "home"
  | "transitionToGround"
  | "ground"
  | "focusObject"
  | "transitionHomeFromGround"
  | "transitionToLifemap"
  | "lifemap"
  | "transitionHomeFromLifemap";

function isPerspectiveCamera(
  camera: THREE.Camera
): camera is THREE.PerspectiveCamera {
  return (camera as THREE.PerspectiveCamera).isPerspectiveCamera === true;
}

type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

function damp(dt: number, speed = 6) {
  return 1 - Math.exp(-speed * dt);
}

const POSES: Record<Phase, CameraPose> = {
  home: { position: [0, 2.8, 9.5], target: [0, 1.4, 0], fov: 48 },
  transitionToGround: { position: [0, 1.9, 6.6], target: [0, 0.8, 2.0], fov: 50 },
  ground: { position: [0, 1.55, 5.4], target: [0, 0.7, 2.8], fov: 50 },
  focusObject: { position: [0.55, 1.35, 3.9], target: [1.2, 0.7, 3.45], fov: 34 },
  transitionHomeFromGround: { position: [0, 2.2, 7.2], target: [0, 1.0, 1.0], fov: 50 },
  transitionToLifemap: { position: [0, 5.5, 12.5], target: [0, 4.2, -8], fov: 58 },
  lifemap: { position: [0, 8.5, 18], target: [0, 7, -18], fov: 62 },
  transitionHomeFromLifemap: { position: [0, 4.2, 11.2], target: [0, 2.2, -2], fov: 54 },
};

function getGroundPose(depth: number): CameraPose {
  const base: CameraPose = {
    position: [0, 1.55, 5.4],
    target: [0, 0.7, 2.8],
    fov: 50,
  };

  const deep: CameraPose = {
    position: [0, 1.35, 4.6],
    target: [0, 0.62, 3.35],
    fov: 52,
  };

  return {
    position: [
      THREE.MathUtils.lerp(base.position[0], deep.position[0], depth),
      THREE.MathUtils.lerp(base.position[1], deep.position[1], depth),
      THREE.MathUtils.lerp(base.position[2], deep.position[2], depth),
    ],
    target: [
      THREE.MathUtils.lerp(base.target[0], deep.target[0], depth),
      THREE.MathUtils.lerp(base.target[1], deep.target[1], depth),
      THREE.MathUtils.lerp(base.target[2], deep.target[2], depth),
    ],
    fov: THREE.MathUtils.lerp(base.fov, deep.fov, depth),
  };
}

type Star = {
  id: string;
  position: [number, number, number];
  scale: number;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStars(count = 120): Star[] {
  const stars: Star[] = [];
  const rng = mulberry32(42);

  for (let i = 0; i < count; i++) {
    const x = (rng() - 0.5) * 24;
    const y = 4 + rng() * 8;
    const z = -8 - rng() * 28;
    const scale = 0.06 + rng() * 0.12;
    stars.push({ id: `star-${i}`, position: [x, y, z], scale });
  }

  return stars;
}

export default function SpatialScene() {
  const [phase, setPhase] = useState<Phase>("home");
  const [groundDepth, setGroundDepth] = useState(0);

  const lookTarget = useRef(new THREE.Vector3(0, 1.4, 0));
  const touchStartY = useRef<number | null>(null);
  const pinchStart = useRef<number | null>(null);

  function resolvePose(): CameraPose {
    if (phase === "ground") return getGroundPose(groundDepth);
    return POSES[phase];
  }

  function isTransition() {
    return phase.includes("transition");
  }

  function onSwipe(dy: number) {
    if (phase !== "ground") return;

    if (dy < -70) {
      setGroundDepth((v) => Math.min(1, v + 0.35));
    } else if (dy > 70) {
      if (groundDepth > 0.15) {
        setGroundDepth((v) => Math.max(0, v - 0.35));
      } else {
        setPhase("transitionHomeFromGround");
      }
    }
  }

  function onPinch(delta: number) {
    if (phase !== "ground") return;

    if (delta > 0.1) {
      setGroundDepth((v) => Math.min(1, v + 0.25));
    } else if (delta < -0.1) {
      if (groundDepth > 0.15) {
        setGroundDepth((v) => Math.max(0, v - 0.25));
      } else {
        setPhase("transitionHomeFromGround");
      }
    }
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (phase === "transitionToGround") {
      timer = setTimeout(() => setPhase("ground"), 700);
    } else if (phase === "transitionHomeFromGround") {
      timer = setTimeout(() => {
        setGroundDepth(0);
        setPhase("home");
      }, 700);
    } else if (phase === "transitionToLifemap") {
      timer = setTimeout(() => setPhase("lifemap"), 900);
    } else if (phase === "transitionHomeFromLifemap") {
      timer = setTimeout(() => setPhase("home"), 900);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [phase]);

  return (
    <Canvas
      camera={{ position: POSES.home.position, fov: POSES.home.fov, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
      onTouchStart={(e) => {
        if (isTransition()) return;

        if (e.touches.length === 1) {
          touchStartY.current = e.touches[0].clientY;
        }
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          pinchStart.current = Math.hypot(dx, dy);
        }
      }}
      onTouchMove={(e) => {
        if (isTransition()) return;

        if (e.touches.length === 1 && touchStartY.current != null) {
          const dy = e.touches[0].clientY - touchStartY.current;
          onSwipe(dy);
          touchStartY.current = null;
        }

        if (e.touches.length === 2 && pinchStart.current != null) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          const delta = (dist - pinchStart.current) / pinchStart.current;
          onPinch(delta);
          pinchStart.current = null;
        }
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#070b17"]} />
      <fog attach="fog" args={["#070b17", 24, 90]} />

      <SceneInner
        phase={phase}
        groundDepth={groundDepth}
        resolvePose={resolvePose}
        lookTarget={lookTarget}
        onGroundClick={() => {
          if (phase === "home" && !isTransition()) setPhase("transitionToGround");
        }}
        onSkyClick={() => {
          if (phase === "home" && !isTransition()) setPhase("transitionToLifemap");
        }}
        onObjectClick={() => {
          if (phase === "ground") setPhase("focusObject");
          else if (phase === "focusObject") setPhase("ground");
        }}
        onReturnFromLifemap={() => {
          if (phase === "lifemap") setPhase("transitionHomeFromLifemap");
        }}
      />
    </Canvas>
  );
}

function SceneInner({
  phase,
  groundDepth,
  resolvePose,
  lookTarget,
  onGroundClick,
  onSkyClick,
  onObjectClick,
  onReturnFromLifemap,
}: {
  phase: Phase;
  groundDepth: number;
  resolvePose: () => CameraPose;
  lookTarget: React.MutableRefObject<THREE.Vector3>;
  onGroundClick: () => void;
  onSkyClick: () => void;
  onObjectClick: () => void;
  onReturnFromLifemap: () => void;
}) {
  const stars = useMemo(() => makeStars(), []);

  useFrame((state, dt) => {
    const camera = state.camera;
    const pose = resolvePose();
    const a = damp(dt);

    const pos = new THREE.Vector3(...pose.position);
    const tgt = new THREE.Vector3(...pose.target);

    camera.position.lerp(pos, a);
    lookTarget.current.lerp(tgt, a);
    camera.lookAt(lookTarget.current);

    if (isPerspectiveCamera(camera)) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, pose.fov, a);
      camera.updateProjectionMatrix();
    }
  });

  const groundLift = THREE.MathUtils.lerp(0, 0.35, groundDepth);
  const objectZ = THREE.MathUtils.lerp(2.8, 4.2, groundDepth);

  return (
    <>
      <ambientLight intensity={1.45} />
      <hemisphereLight args={["#bcd4ff", "#1b2233", 0.85]} />
      <directionalLight position={[4, 10, 6]} intensity={2.2} color="#dbe7ff" />
      <pointLight position={[0, 2.2, 1.2]} intensity={18} distance={18} color="#8ec5ff" />
      <pointLight position={[0, 6, -14]} intensity={10} distance={40} color="#7aa2ff" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} onClick={onGroundClick}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1b2233" roughness={0.96} metalness={0.02} />
      </mesh>

      <mesh position={[0, 0.02 + groundLift, 0]}>
        <cylinderGeometry args={[3.8, 5.8, 0.2, 64]} />
        <meshStandardMaterial color="#2a3550" roughness={0.95} metalness={0.04} />
      </mesh>

      {(phase === "home" || phase.includes("Ground")) && (
        <>
          <mesh position={[0, 1.2, 0]}>
            <sphereGeometry args={[0.62, 48, 48]} />
            <meshStandardMaterial
              color="#a9d1ff"
              emissive="#6ea8ff"
              emissiveIntensity={2.4}
              roughness={0.18}
              metalness={0.15}
            />
          </mesh>

          <mesh position={[0, 3.0, -8.8]} onClick={onSkyClick}>
            <sphereGeometry args={[1.15, 32, 32]} />
            <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
          </mesh>

          <mesh position={[0, 3.15, -10.4]}>
            <ringGeometry args={[2.3, 3.0, 64]} />
            <meshBasicMaterial color="#8fb8ff" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {(phase === "ground" ||
        phase === "focusObject" ||
        phase === "transitionToGround" ||
        phase === "transitionHomeFromGround") && (
        <>
          <mesh position={[-1.9, 0.3, objectZ - 0.1]}>
            <boxGeometry args={[0.8, 0.6, 0.8]} />
            <meshStandardMaterial color="#5e6f8f" roughness={0.9} />
          </mesh>

          <mesh position={[1.8, 0.48, objectZ + 0.2]} onClick={onObjectClick}>
            <sphereGeometry args={[0.55, 32, 32]} />
            <meshStandardMaterial
              color={phase === "focusObject" ? "#ffd7a8" : "#d0b28a"}
              emissive={phase === "focusObject" ? "#ffb45e" : "#000000"}
              emissiveIntensity={phase === "focusObject" ? 1.4 : 0}
              roughness={0.55}
              metalness={0.08}
            />
          </mesh>
        </>
      )}

      {(phase === "lifemap" ||
        phase === "transitionToLifemap" ||
        phase === "transitionHomeFromLifemap") && (
        <group>
          {stars.map((star) => (
            <mesh key={star.id} position={star.position} onClick={onReturnFromLifemap}>
              <sphereGeometry args={[star.scale, 12, 12]} />
              <meshBasicMaterial color="#d9e8ff" />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}
