"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Phase =
  | "home"
  | "transitionToLifemap"
  | "lifemap"
  | "focus"
  | "replay"
  | "transitionHomeFromLifemap"
  | "transitionToGround"
  | "ground"
  | "detail"
  | "transitionHomeFromGround";

type StarTier = "near" | "mid" | "far";
type GroundObjectId = "cube" | "hanger" | "spire";

type Star = {
  id: string;
  position: [number, number, number];
  size: number;
  tier: StarTier;
};

type CameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
};

const STAR_SEED = 170141;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function lerpVec3(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  return new THREE.Vector3(
    THREE.MathUtils.lerp(a.x, b.x, t),
    THREE.MathUtils.lerp(a.y, b.y, t),
    THREE.MathUtils.lerp(a.z, b.z, t),
  );
}

function bezier3(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
  t: number,
) {
  const p0 = lerpVec3(a, b, t);
  const p1 = lerpVec3(b, c, t);
  const p2 = lerpVec3(c, d, t);
  const q0 = lerpVec3(p0, p1, t);
  const q1 = lerpVec3(p1, p2, t);
  return lerpVec3(q0, q1, t);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function applyMaterialOpacity(obj: THREE.Object3D, opacity: number) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((m) => {
        if ("opacity" in m) {
          m.transparent = opacity < 0.999;
          m.opacity = opacity;
          m.depthWrite = opacity > 0.5;
        }
      });
    } else if (material && "opacity" in material) {
      material.transparent = opacity < 0.999;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.5;
    }
  });
}

function setGroupOpacity(group: THREE.Group | null, opacity: number) {
  if (!group) return;
  group.visible = opacity > 0.001;
  applyMaterialOpacity(group, opacity);
}

function generateStars(): Star[] {
  const rand = mulberry32(STAR_SEED);
  const stars: Star[] = [];
  const nearCount = 34;
  const midCount = 82;
  const farCount = 132;

  for (let i = 0; i < nearCount + midCount + farCount; i += 1) {
    const tier: StarTier =
      i < nearCount ? "near" : i < nearCount + midCount ? "mid" : "far";

    const radius =
      tier === "near"
        ? 5 + rand() * 4
        : tier === "mid"
          ? 10 + rand() * 9
          : 20 + rand() * 18;

    const angle = rand() * Math.PI * 2;
    const vertical =
      tier === "near"
        ? -2 + rand() * 4
        : tier === "mid"
          ? -5 + rand() * 10
          : -9 + rand() * 18;

    const zBase =
      tier === "near"
        ? -4 + rand() * 6
        : tier === "mid"
          ? -12 + rand() * 20
          : -30 + rand() * 54;

    const size =
      tier === "near"
        ? 0.10 + rand() * 0.08
        : tier === "mid"
          ? 0.055 + rand() * 0.045
          : 0.022 + rand() * 0.024;

    stars.push({
      id: `star-${i}`,
      position: [
        Math.cos(angle) * radius,
        vertical,
        Math.sin(angle) * radius * 0.42 + zBase,
      ],
      size,
      tier,
    });
  }

  stars[4] = { id: "hero-a", position: [-1.7, 0.8, -4.8], size: 0.20, tier: "near" };
  stars[16] = { id: "hero-b", position: [1.9, -0.2, -5.4], size: 0.19, tier: "near" };
  stars[28] = { id: "hero-c", position: [0.12, 1.15, -4.1], size: 0.21, tier: "near" };

  return stars;
}

function homePose(t = 0): CameraPose {
  return {
    position: new THREE.Vector3(
      0.12 + Math.sin(t * 0.14) * 0.12,
      2.55 + Math.sin(t * 0.09) * 0.05,
      10.05 + Math.cos(t * 0.11) * 0.11,
    ),
    target: new THREE.Vector3(0.03, 1.34, 0.02),
    fov: 35.4,
  };
}

function groundPose(t = 0): CameraPose {
  return {
    position: new THREE.Vector3(
      -0.42 + Math.sin(t * 0.15) * 0.10,
      2.02 + Math.sin(t * 0.10) * 0.04,
      8.0 + Math.cos(t * 0.13) * 0.10,
    ),
    target: new THREE.Vector3(0.08, 1.0, 0.02),
    fov: 37.0,
  };
}

function lifemapPose(t = 0): CameraPose {
  return {
    position: new THREE.Vector3(
      Math.sin(t * 0.10) * 0.18,
      0.24 + Math.sin(t * 0.07) * 0.08,
      18.4 + Math.cos(t * 0.09) * 0.30,
    ),
    target: new THREE.Vector3(0, 0.08, -10.5),
    fov: 29.8,
  };
}

function focusPose(star: Star, t = 0): CameraPose {
  return {
    position: new THREE.Vector3(
      star.position[0] + 1.65 + Math.sin(t * 0.10) * 0.03,
      star.position[1] + 0.56 + Math.sin(t * 0.07) * 0.03,
      star.position[2] + 9.1 + Math.cos(t * 0.06) * 0.08,
    ),
    target: new THREE.Vector3(star.position[0], star.position[1] + 0.03, star.position[2]),
    fov: 22.8,
  };
}

function replayPose(star: Star, t = 0): CameraPose {
  return {
    position: new THREE.Vector3(
      star.position[0] - 1.55 + Math.sin(t * 0.045) * 0.14,
      star.position[1] + 0.78 + Math.sin(t * 0.035) * 0.03,
      star.position[2] + 10.6 + Math.cos(t * 0.04) * 0.09,
    ),
    target: new THREE.Vector3(star.position[0], star.position[1] + 0.08, star.position[2]),
    fov: 21.9,
  };
}

function detailPose(id: GroundObjectId, t = 0): CameraPose {
  if (id === "cube") {
    return {
      position: new THREE.Vector3(
        -4.0 + Math.sin(t * 0.15) * 0.04,
        1.42 + Math.sin(t * 0.08) * 0.03,
        3.15 + Math.cos(t * 0.10) * 0.08,
      ),
      target: new THREE.Vector3(-2.78, 1.10, -0.95),
      fov: 30.6,
    };
  }
  if (id === "hanger") {
    return {
      position: new THREE.Vector3(
        -0.18 + Math.sin(t * 0.14) * 0.04,
        1.54 + Math.sin(t * 0.08) * 0.03,
        5.15 + Math.cos(t * 0.10) * 0.08,
      ),
      target: new THREE.Vector3(0.24, 1.90, 0.15),
      fov: 28.8,
    };
  }
  return {
    position: new THREE.Vector3(
      3.20 + Math.sin(t * 0.15) * 0.04,
      1.22 + Math.sin(t * 0.08) * 0.03,
      3.95 + Math.cos(t * 0.10) * 0.08,
    ),
    target: new THREE.Vector3(2.55, 0.98, 0.04),
    fov: 29.3,
  };
}

function getWorldOpacities(phase: Phase, elapsedMs: number) {
  const tLife = clamp01(elapsedMs / 2900);
  const tHomeLife = clamp01(elapsedMs / 2250);
  const tGround = clamp01(elapsedMs / 2200);
  const tHomeGround = clamp01(elapsedMs / 1900);

  if (phase === "home") return { home: 1, life: 0, ground: 0 };
  if (phase === "lifemap" || phase === "focus" || phase === "replay") return { home: 0, life: 1, ground: 0 };
  if (phase === "ground" || phase === "detail") return { home: 0, life: 0, ground: 1 };

  if (phase === "transitionToLifemap") {
    const home = 1 - easeOutCubic(clamp01((tLife - 0.06) / 0.22));
    const life = easeInOutCubic(clamp01((tLife - 0.28) / 0.56));
    return { home, life, ground: 0 };
  }

  if (phase === "transitionHomeFromLifemap") {
    const life = 1 - easeOutCubic(clamp01((tHomeLife - 0.06) / 0.34));
    const home = easeInOutCubic(clamp01((tHomeLife - 0.34) / 0.50));
    return { home, life, ground: 0 };
  }

  if (phase === "transitionToGround") {
    const home = 1 - easeOutCubic(clamp01((tGround - 0.08) / 0.24));
    const ground = easeInOutCubic(clamp01((tGround - 0.30) / 0.52));
    return { home, life: 0, ground };
  }

  if (phase === "transitionHomeFromGround") {
    const ground = 1 - easeOutCubic(clamp01((tHomeGround - 0.06) / 0.34));
    const home = easeInOutCubic(clamp01((tHomeGround - 0.34) / 0.50));
    return { home, life: 0, ground };
  }

  return { home: 0, life: 0, ground: 0 };
}

function HomeWorld(props: {
  alpha: number;
  phase: Phase;
  onSkyClick: () => void;
  onGroundClick: () => void;
}) {
  const { alpha, phase, onSkyClick, onGroundClick } = props;
  const groupRef = useRef<THREE.Group>(null);
  const interactive = phase === "home";

  useFrame(() => setGroupOpacity(groupRef.current, alpha));

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, -34]}>
        <sphereGeometry args={[78, 32, 32]} />
        <meshBasicMaterial color="#0a1526" side={THREE.BackSide} transparent opacity={1} depthWrite={false} />
      </mesh>

      <mesh position={[0, 6.8, -12]}>
        <planeGeometry args={[46, 18]} />
        <meshBasicMaterial color="#4d6b9d" transparent opacity={0.06} depthWrite={false} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[24, 96]} />
        <meshStandardMaterial color="#33507f" roughness={0.96} metalness={0.0} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[6.8, 10.8, 96]} />
        <meshStandardMaterial color="#5877b7" emissive="#28457c" emissiveIntensity={0.12} roughness={0.98} metalness={0.02} />
      </mesh>

      <mesh position={[-0.56, 0.92, 0.44]}>
        <sphereGeometry args={[0.82, 48, 48]} />
        <meshStandardMaterial color="#f3f8ff" emissive="#a9c9ff" emissiveIntensity={0.35} roughness={0.22} metalness={0.10} />
      </mesh>

      <mesh position={[1.20, 2.04, -0.08]}>
        <capsuleGeometry args={[0.38, 1.60, 12, 24]} />
        <meshStandardMaterial color="#0f2136" emissive="#294a78" emissiveIntensity={0.18} roughness={0.62} metalness={0.08} />
      </mesh>

      <mesh position={[1.20, 3.28, -0.08]}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#152740" roughness={0.68} metalness={0.06} />
      </mesh>

      <mesh visible={interactive} position={[0, 8.0, -6]} onClick={interactive ? onSkyClick : undefined}>
        <planeGeometry args={[52, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh visible={interactive} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]} onClick={interactive ? onGroundClick : undefined}>
        <circleGeometry args={[12.8, 72]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function LifemapWorld(props: {
  alpha: number;
  phase: Phase;
  stars: Star[];
  hoveredStar: string | null;
  selectedStar: Star | null;
  onBackHome: () => void;
  onSelectStar: (star: Star) => void;
  onEnterReplay: () => void;
  onExitFocusOrReplay: () => void;
}) {
  const { alpha, phase, stars, hoveredStar, selectedStar, onBackHome, onSelectStar, onEnterReplay, onExitFocusOrReplay } = props;
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => setGroupOpacity(groupRef.current, alpha));

  const showField = phase === "lifemap" || phase === "transitionToLifemap" || phase === "transitionHomeFromLifemap";
  const showNode = phase === "focus" || phase === "replay";
  const replay = phase === "replay";

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, -58]}>
        <sphereGeometry args={[165, 44, 44]} />
        <meshBasicMaterial color={replay ? "#02050b" : "#02070f"} side={THREE.BackSide} transparent opacity={1} depthWrite={false} />
      </mesh>

      {showField && (
        <>
          <mesh position={[0, 0, -42]} onClick={phase === "lifemap" ? onBackHome : undefined}>
            <planeGeometry args={[260, 260]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          {stars.map((star) => {
            const hovered = hoveredStar === star.id;
            const selected = selectedStar?.id === star.id;
            const scale = selected ? 2.0 : hovered ? 1.6 : 1.0;

            const emissive =
              selected
                ? "#eef6ff"
                : hovered
                  ? "#d5e7ff"
                  : star.tier === "near"
                    ? "#a7cdff"
                    : star.tier === "mid"
                      ? "#5f95d6"
                      : "#315377";

            const intensity =
              selected
                ? 1.40
                : hovered
                  ? 1.05
                  : star.tier === "near"
                    ? 0.62
                    : star.tier === "mid"
                      ? 0.22
                      : 0.07;

            const opacity =
              star.tier === "near" ? 1 : star.tier === "mid" ? 0.88 : 0.58;

            return (
              <mesh
                key={star.id}
                position={star.position}
                scale={scale}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStar(star);
                }}
              >
                <sphereGeometry args={[star.size, 16, 16]} />
                <meshStandardMaterial
                  color="#f8fbff"
                  emissive={emissive}
                  emissiveIntensity={intensity}
                  roughness={0.20}
                  metalness={0.0}
                  transparent={opacity < 0.999}
                  opacity={opacity}
                />
              </mesh>
            );
          })}
        </>
      )}

      {showNode && selectedStar && (
        <group position={selectedStar.position}>
          <mesh onClick={phase === "focus" ? onEnterReplay : onExitFocusOrReplay}>
            <sphereGeometry args={[0.42, 48, 48]} />
            <meshStandardMaterial
              color={replay ? "#eff7ff" : "#f8fbff"}
              emissive={replay ? "#d2e7ff" : "#bbdcff"}
              emissiveIntensity={replay ? 1.08 : 0.56}
              roughness={0.12}
              metalness={0.04}
            />
          </mesh>

          <mesh scale={replay ? 2.0 : 1.55}>
            <sphereGeometry args={[0.58, 48, 48]} />
            <meshBasicMaterial
              color={replay ? "#76b3ff" : "#5da7ff"}
              transparent
              opacity={replay ? 0.07 : 0.045}
              depthWrite={false}
            />
          </mesh>

          {replay && (
            <>
              <mesh rotation={[Math.PI / 2, 0.10, 0]} position={[0, 0.01, -0.08]}>
                <ringGeometry args={[0.82, 0.90, 96]} />
                <meshBasicMaterial color="#a8ceff" transparent opacity={0.22} depthWrite={false} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0.42, 0]} position={[0, 0.05, -0.18]}>
                <ringGeometry args={[1.15, 1.23, 96]} />
                <meshBasicMaterial color="#79b5ff" transparent opacity={0.10} depthWrite={false} />
              </mesh>
            </>
          )}
        </group>
      )}
    </group>
  );
}

function GroundWorld(props: {
  alpha: number;
  phase: Phase;
  selectedObject: GroundObjectId | null;
  hoveredObject: GroundObjectId | null;
  onBackHome: () => void;
  onSelectObject: (id: GroundObjectId) => void;
  onExitDetail: () => void;
}) {
  const { alpha, phase, selectedObject, hoveredObject, onBackHome, onSelectObject, onExitDetail } = props;
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => setGroupOpacity(groupRef.current, alpha));

  const isDetail = phase === "detail";
  const isGround = phase === "ground" || phase === "transitionToGround" || phase === "transitionHomeFromGround";

  const otherOpacity = (id: GroundObjectId) => !isDetail ? 1 : selectedObject === id ? 1 : 0.05;
  const target = (id: GroundObjectId) => selectedObject === id || hoveredObject === id;

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} onClick={phase === "ground" ? onBackHome : undefined}>
        <circleGeometry args={[9.2, 96]} />
        <meshStandardMaterial color="#2b4472" roughness={0.94} metalness={0.02} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[6.0, 7.8, 96]} />
        <meshStandardMaterial color="#506fb0" emissive="#27447b" emissiveIntensity={0.12} roughness={0.96} metalness={0.02} />
      </mesh>

      <group
        name="cube"
        position={[-2.78, 1.04, -0.66]}
        scale={selectedObject === "cube" ? 1.08 : hoveredObject === "cube" ? 1.04 : 1}
        onClick={(e) => {
          e.stopPropagation();
          if (phase === "ground") onSelectObject("cube");
          if (phase === "detail" && selectedObject === "cube") onExitDetail();
        }}
      >
        <mesh>
          <boxGeometry args={[1.6, 1.6, 1.6]} />
          <meshStandardMaterial
            color="#6f90d6"
            emissive="#a6c0ff"
            emissiveIntensity={target("cube") ? 0.28 : 0.08}
            roughness={0.56}
            metalness={0.10}
            transparent={otherOpacity("cube") < 0.999}
            opacity={otherOpacity("cube")}
          />
        </mesh>
      </group>

      <group
        name="hanger"
        position={[0.24, 1.18, 0.15]}
        scale={selectedObject === "hanger" ? 1.08 : hoveredObject === "hanger" ? 1.04 : 1}
        onClick={(e) => {
          e.stopPropagation();
          if (phase === "ground") onSelectObject("hanger");
          if (phase === "detail" && selectedObject === "hanger") onExitDetail();
        }}
      >
        <mesh position={[0, 1.34, 0]}>
          <sphereGeometry args={[0.66, 32, 32]} />
          <meshStandardMaterial
            color="#ffa86b"
            emissive="#ffd19b"
            emissiveIntensity={target("hanger") ? 0.42 : 0.18}
            roughness={0.24}
            metalness={0.06}
            transparent={otherOpacity("hanger") < 0.999}
            opacity={otherOpacity("hanger")}
          />
        </mesh>

        <mesh position={[0, 2.82, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2.62, 18]} />
          <meshStandardMaterial
            color="#8fb5ff"
            emissive="#7ca6ff"
            emissiveIntensity={0.10}
            roughness={0.36}
            metalness={0.22}
            transparent={otherOpacity("hanger") < 0.999}
            opacity={otherOpacity("hanger")}
          />
        </mesh>
      </group>

      <group
        name="spire"
        position={[2.55, 0.88, 0.04]}
        scale={selectedObject === "spire" ? 1.08 : hoveredObject === "spire" ? 1.04 : 1}
        onClick={(e) => {
          e.stopPropagation();
          if (phase === "ground") onSelectObject("spire");
          if (phase === "detail" && selectedObject === "spire") onExitDetail();
        }}
      >
        <mesh>
          <cylinderGeometry args={[0.23, 0.78, 2.2, 32]} />
          <meshStandardMaterial
            color="#6fa5ff"
            emissive="#98bdff"
            emissiveIntensity={target("spire") ? 0.34 : 0.12}
            roughness={0.34}
            metalness={0.10}
            transparent={otherOpacity("spire") < 0.999}
            opacity={otherOpacity("spire")}
          />
        </mesh>
      </group>

      {isGround && (
        <mesh position={[0, 0.02, -12]} onClick={phase === "ground" ? onBackHome : undefined}>
          <planeGeometry args={[64, 42]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function CameraDirector(props: {
  phase: Phase;
  phaseStartedAt: number;
  selectedStar: Star | null;
  selectedObject: GroundObjectId | null;
}) {
  const { camera, scene } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const { phase, phaseStartedAt, selectedStar, selectedObject } = props;
  const targetRef = useRef(new THREE.Vector3(0, 1.2, 0));
  const bgRef = useRef(new THREE.Color("#0b1320"));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const elapsedMs = performance.now() - phaseStartedAt;

    let desired = homePose(t);

    if (phase === "home") desired = homePose(t);
    if (phase === "ground") desired = groundPose(t);
    if (phase === "lifemap") desired = lifemapPose(t);
    if (phase === "focus" && selectedStar) desired = focusPose(selectedStar, t);
    if (phase === "replay" && selectedStar) desired = replayPose(selectedStar, t);
    if (phase === "detail" && selectedObject) desired = detailPose(selectedObject, t);

    if (phase === "transitionToLifemap") {
      const n = clamp01(elapsedMs / 2900);
      const a = homePose(t);
      const preload: CameraPose = {
        position: new THREE.Vector3(0.10, 2.74, 9.78),
        target: new THREE.Vector3(0.04, 1.46, -0.26),
        fov: 34.9,
      };
      const depart: CameraPose = {
        position: new THREE.Vector3(0.00, 7.6, 2.7),
        target: new THREE.Vector3(0.0, 1.1, -14.0),
        fov: 32.4,
      };
      const arrive = lifemapPose(t);

      if (n < 0.18) {
        const k = easeOutCubic(n / 0.18);
        desired = {
          position: lerpVec3(a.position, preload.position, k),
          target: lerpVec3(a.target, preload.target, k),
          fov: THREE.MathUtils.lerp(a.fov, preload.fov, k),
        };
      } else {
        const k = easeInOutCubic((n - 0.18) / 0.82);
        desired = {
          position: bezier3(preload.position, depart.position, new THREE.Vector3(0.0, 1.8, -12.8), arrive.position, k),
          target: bezier3(preload.target, depart.target, new THREE.Vector3(0.0, 0.2, -24.0), arrive.target, k),
          fov: THREE.MathUtils.lerp(preload.fov, arrive.fov, k),
        };
      }
    }

    if (phase === "transitionHomeFromLifemap") {
      const n = clamp01(elapsedMs / 2250);
      const a = lifemapPose(t);
      const mid: CameraPose = {
        position: new THREE.Vector3(0.02, 5.0, 7.0),
        target: new THREE.Vector3(0.03, 1.30, -6.5),
        fov: 31.8,
      };
      const settle = homePose(t);
      const k = easeInOutCubic(n);
      desired = {
        position: bezier3(a.position, mid.position, new THREE.Vector3(0.08, 3.0, 8.6), settle.position, k),
        target: bezier3(a.target, mid.target, new THREE.Vector3(0.06, 1.34, -0.60), settle.target, k),
        fov: THREE.MathUtils.lerp(a.fov, settle.fov, k),
      };
    }

    if (phase === "transitionToGround") {
      const n = clamp01(elapsedMs / 2200);
      const a = homePose(t);
      const preload: CameraPose = {
        position: new THREE.Vector3(0.04, 2.42, 9.80),
        target: new THREE.Vector3(0.08, 1.10, 0.00),
        fov: 36.0,
      };
      const drop: CameraPose = {
        position: new THREE.Vector3(-0.18, 1.50, 8.75),
        target: new THREE.Vector3(0.06, 0.90, -0.55),
        fov: 36.9,
      };
      const arrive = groundPose(t);

      if (n < 0.18) {
        const k = easeOutCubic(n / 0.18);
        desired = {
          position: lerpVec3(a.position, preload.position, k),
          target: lerpVec3(a.target, preload.target, k),
          fov: THREE.MathUtils.lerp(a.fov, preload.fov, k),
        };
      } else {
        const k = easeInOutCubic((n - 0.18) / 0.82);
        desired = {
          position: bezier3(preload.position, drop.position, new THREE.Vector3(-0.26, 1.78, 7.4), arrive.position, k),
          target: bezier3(preload.target, drop.target, new THREE.Vector3(0.06, 0.98, -0.60), arrive.target, k),
          fov: THREE.MathUtils.lerp(preload.fov, arrive.fov, k),
        };
      }
    }

    if (phase === "transitionHomeFromGround") {
      const n = clamp01(elapsedMs / 1900);
      const a = groundPose(t);
      const mid: CameraPose = {
        position: new THREE.Vector3(-0.06, 1.82, 8.75),
        target: new THREE.Vector3(0.08, 1.0, -0.05),
        fov: 37.0,
      };
      const settle = homePose(t);
      const k = easeInOutCubic(n);
      desired = {
        position: bezier3(a.position, mid.position, new THREE.Vector3(0.03, 2.18, 9.52), settle.position, k),
        target: bezier3(a.target, mid.target, new THREE.Vector3(0.04, 1.28, -0.08), settle.target, k),
        fov: THREE.MathUtils.lerp(a.fov, settle.fov, k),
      };
    }

    const lerpAmount = phase.startsWith("transition") ? 0.11 : phase === "replay" ? 0.040 : 0.078;

    perspectiveCamera.position.lerp(desired.position, lerpAmount);
    targetRef.current.lerp(desired.target, lerpAmount);
    perspectiveCamera.lookAt(targetRef.current);
    perspectiveCamera.fov = THREE.MathUtils.lerp(perspectiveCamera.fov, desired.fov, 0.08);
    perspectiveCamera.updateProjectionMatrix();

    let bgTarget = new THREE.Color("#0b1320");
    if (phase === "home" || phase === "transitionToGround" || phase === "ground" || phase === "detail" || phase === "transitionHomeFromGround") {
      bgTarget = new THREE.Color("#0c1730");
    }
    if (phase === "lifemap" || phase === "transitionToLifemap" || phase === "transitionHomeFromLifemap" || phase === "focus") {
      bgTarget = new THREE.Color("#02070f");
    }
    if (phase === "replay") {
      bgTarget = new THREE.Color("#02050b");
    }

    bgRef.current.lerp(bgTarget, 0.05);
    scene.background = bgRef.current;
  });

  return null;
}

function PointerEvents(props: {
  stars: Star[];
  phase: Phase;
  setHoveredStar: (id: string | null) => void;
  setHoveredObject: (id: GroundObjectId | null) => void;
}) {
  const { stars, phase, setHoveredStar, setHoveredObject } = props;
  const { gl, scene, camera, raycaster } = useThree();
  const mouse = useRef(new THREE.Vector2(2, 2));

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onLeave = () => {
      mouse.current.set(2, 2);
      setHoveredStar(null);
      setHoveredObject(null);
      document.body.style.cursor = "default";
    };

    gl.domElement.addEventListener("pointermove", onMove);
    gl.domElement.addEventListener("pointerleave", onLeave);

    return () => {
      gl.domElement.removeEventListener("pointermove", onMove);
      gl.domElement.removeEventListener("pointerleave", onLeave);
      document.body.style.cursor = "default";
    };
  }, [gl, setHoveredStar, setHoveredObject]);

  useFrame(() => {
    raycaster.setFromCamera(mouse.current, camera);
    const hits = raycaster.intersectObjects(scene.children, true);

    let hoveredStar: string | null = null;
    let hoveredObject: GroundObjectId | null = null;

    for (const hit of hits) {
      const obj = hit.object;
      const pos = obj.getWorldPosition(new THREE.Vector3());

      if (phase === "lifemap") {
        const match = stars.find((s) => new THREE.Vector3(...s.position).distanceTo(pos) < 0.30);
        if (match) {
          hoveredStar = match.id;
          break;
        }
      }

      if (phase === "ground" || phase === "detail") {
        const name = obj.parent?.name || obj.name;
        if (name === "cube" || name === "hanger" || name === "spire") {
          hoveredObject = name;
          break;
        }
      }
    }

    setHoveredStar(hoveredStar);
    setHoveredObject(hoveredObject);
    document.body.style.cursor = hoveredStar || hoveredObject ? "pointer" : "default";
  });

  return null;
}

function SceneContent() {
  const stars = useMemo(() => generateStars(), []);
  const [phase, setPhase] = useState<Phase>("home");
  const [phaseStartedAt, setPhaseStartedAt] = useState<number>(performance.now());
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [selectedObject, setSelectedObject] = useState<GroundObjectId | null>(null);
  const [hoveredStar, setHoveredStar] = useState<string | null>(null);
  const [hoveredObject, setHoveredObject] = useState<GroundObjectId | null>(null);

  function begin(next: Phase) {
    setPhase(next);
    setPhaseStartedAt(performance.now());
  }

  useEffect(() => {
    if (phase === "transitionToLifemap") {
      const id = window.setTimeout(() => begin("lifemap"), 2900);
      return () => window.clearTimeout(id);
    }
    if (phase === "transitionHomeFromLifemap") {
      const id = window.setTimeout(() => {
        setSelectedStar(null);
        begin("home");
      }, 2250);
      return () => window.clearTimeout(id);
    }
    if (phase === "transitionToGround") {
      const id = window.setTimeout(() => begin("ground"), 2200);
      return () => window.clearTimeout(id);
    }
    if (phase === "transitionHomeFromGround") {
      const id = window.setTimeout(() => {
        setSelectedObject(null);
        begin("home");
      }, 1900);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [phase]);

  const elapsedMs = performance.now() - phaseStartedAt;
  const world = getWorldOpacities(phase, elapsedMs);

  return (
    <>
      <color attach="background" args={["#0b1320"]} />
      <fog attach="fog" args={[phase === "replay" ? "#02050b" : "#061018", 24, 110]} />

      <ambientLight intensity={0.84} />
      <hemisphereLight args={["#b7d4ff", "#182338", 1.0]} />
      <directionalLight position={[7, 10, 8]} intensity={1.16} color="#f3f8ff" />
      <pointLight position={[-0.56, 1.0, 0.44]} intensity={phase === "home" ? 2.34 : 0.55} distance={14} color="#d8ebff" />
      <pointLight position={[0, 2.6, 3.8]} intensity={phase === "replay" ? 0.70 : phase === "lifemap" || phase === "focus" ? 0.42 : 0.42} distance={26} color="#7eaef0" />

      <HomeWorld
        alpha={world.home}
        phase={phase}
        onSkyClick={() => {
          if (phase !== "home") return;
          begin("transitionToLifemap");
        }}
        onGroundClick={() => {
          if (phase !== "home") return;
          begin("transitionToGround");
        }}
      />

      <GroundWorld
        alpha={world.ground}
        phase={phase}
        selectedObject={selectedObject}
        hoveredObject={hoveredObject}
        onBackHome={() => {
          if (phase !== "ground") return;
          begin("transitionHomeFromGround");
        }}
        onSelectObject={(id) => {
          if (phase !== "ground") return;
          setSelectedObject(id);
          begin("detail");
        }}
        onExitDetail={() => {
          if (phase !== "detail") return;
          begin("ground");
        }}
      />

      <LifemapWorld
        alpha={world.life}
        phase={phase}
        stars={stars}
        hoveredStar={hoveredStar}
        selectedStar={selectedStar}
        onBackHome={() => {
          if (phase !== "lifemap") return;
          begin("transitionHomeFromLifemap");
        }}
        onSelectStar={(star) => {
          if (phase !== "lifemap") return;
          setSelectedStar(star);
          begin("focus");
        }}
        onEnterReplay={() => {
          if (phase !== "focus") return;
          begin("replay");
        }}
        onExitFocusOrReplay={() => {
          if (phase === "focus" || phase === "replay") begin("lifemap");
        }}
      />

      <PointerEvents
        stars={stars}
        phase={phase}
        setHoveredStar={setHoveredStar}
        setHoveredObject={setHoveredObject}
      />

      <CameraDirector
        phase={phase}
        phaseStartedAt={phaseStartedAt}
        selectedStar={selectedStar}
        selectedObject={selectedObject}
      />
    </>
  );
}

export default function SpatialScene() {
  return (
    <div className="h-full w-full">
      <Canvas
        shadows={false}
        dpr={[1, 1.75]}
        camera={{ position: [0.12, 2.55, 10.05], fov: 35.4, near: 0.1, far: 360 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
