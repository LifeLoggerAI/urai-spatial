"use client";

import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
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

type Star = {
  id: string;
  position: [number, number, number];
  size: number;
};

type GroundObjectId = "cube" | "hanger" | "spire";

type GroundObjectDef = {
  id: GroundObjectId;
  position: [number, number, number];
};

type CameraPose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
};

const STAR_SEED = 41083;

function easeInOut(t: number) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
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

function computeAlpha(phase: Phase) {
  const homeAlpha =
    phase === "home" || phase === "transitionToLifemap" || phase === "transitionToGround"
      ? 1
      : phase === "transitionHomeFromLifemap" || phase === "transitionHomeFromGround"
        ? 1
        : 0;

  const lifemapAlpha =
    phase === "lifemap" || phase === "focus" || phase === "replay" || phase === "transitionToLifemap" || phase === "transitionHomeFromLifemap"
      ? 1
      : 0;

  const groundAlpha =
    phase === "ground" || phase === "detail" || phase === "transitionToGround" || phase === "transitionHomeFromGround"
      ? 1
      : 0;

  return { homeAlpha, lifemapAlpha, groundAlpha };
}

function homePose(t = 0): CameraPose {
  const driftX = Math.sin(t * 0.17) * 0.16;
  const driftY = Math.sin(t * 0.11) * 0.05;
  const driftZ = Math.cos(t * 0.13) * 0.14;
  return {
    position: new THREE.Vector3(0.15 + driftX, 2.75 + driftY, 10.3 + driftZ),
    target: new THREE.Vector3(0.15, 1.42, 0.15),
    fov: 36,
  };
}

function lifemapPose(t = 0): CameraPose {
  const driftX = Math.sin(t * 0.16) * 0.12;
  const driftY = Math.sin(t * 0.09) * 0.08;
  const driftZ = Math.cos(t * 0.12) * 0.22;
  return {
    position: new THREE.Vector3(driftX, 0.42 + driftY, 13.8 + driftZ),
    target: new THREE.Vector3(0, 0.22, 0),
    fov: 34,
  };
}

function groundPose(t = 0): CameraPose {
  const driftX = Math.sin(t * 0.16) * 0.12;
  const driftY = Math.sin(t * 0.12) * 0.04;
  const driftZ = Math.cos(t * 0.14) * 0.12;
  return {
    position: new THREE.Vector3(-0.35 + driftX, 2.08 + driftY, 8.25 + driftZ),
    target: new THREE.Vector3(0.18, 1.02, 0.18),
    fov: 38,
  };
}

function focusPose(star: Star, t = 0): CameraPose {
  const driftX = Math.sin(t * 0.2) * 0.06;
  const driftY = Math.sin(t * 0.14) * 0.05;
  return {
    position: new THREE.Vector3(
      star.position[0] + 0.85 + driftX,
      star.position[1] + 0.3 + driftY,
      star.position[2] + 3.8,
    ),
    target: new THREE.Vector3(star.position[0], star.position[1] + 0.02, star.position[2]),
    fov: 31,
  };
}

function replayPose(star: Star, t = 0): CameraPose {
  const orbit = Math.sin(t * 0.09) * 0.2;
  const rise = Math.sin(t * 0.05) * 0.08;
  return {
    position: new THREE.Vector3(
      star.position[0] - 0.5 + orbit,
      star.position[1] + 0.48 + rise,
      star.position[2] + 4.9,
    ),
    target: new THREE.Vector3(star.position[0], star.position[1] + 0.1, star.position[2]),
    fov: 29,
  };
}

function detailPose(id: GroundObjectId, t = 0): CameraPose {
  switch (id) {
    case "cube":
      return {
        position: new THREE.Vector3(-3.9 + Math.sin(t * 0.18) * 0.05, 1.45, 2.2 + Math.cos(t * 0.14) * 0.08),
        target: new THREE.Vector3(-2.75, 1.18, -0.55),
        fov: 32,
      };
    case "hanger":
      return {
        position: new THREE.Vector3(-0.25 + Math.sin(t * 0.16) * 0.04, 1.48, 4.6 + Math.cos(t * 0.12) * 0.08),
        target: new THREE.Vector3(0.25, 1.85, 0.15),
        fov: 30,
      };
    case "spire":
    default:
      return {
        position: new THREE.Vector3(3.2 + Math.sin(t * 0.17) * 0.05, 1.25, 3.4 + Math.cos(t * 0.13) * 0.08),
        target: new THREE.Vector3(2.55, 1.02, 0.05),
        fov: 31,
      };
  }
}

function generateStars(): Star[] {
  const rand = mulberry32(STAR_SEED);
  const stars: Star[] = [];
  const count = 84;

  for (let i = 0; i < count; i += 1) {
    const ring = i < 18 ? "near" : i < 46 ? "mid" : "far";
    const radius =
      ring === "near"
        ? 5 + rand() * 4
        : ring === "mid"
          ? 8 + rand() * 6
          : 13 + rand() * 7;

    const angle = rand() * Math.PI * 2;
    const height =
      ring === "near"
        ? -1 + rand() * 2.2
        : ring === "mid"
          ? -2 + rand() * 4
          : -3 + rand() * 6;

    const zJitter =
      ring === "near"
        ? -2 + rand() * 4
        : ring === "mid"
          ? -3 + rand() * 6
          : -5 + rand() * 10;

    stars.push({
      id: `star-${i}`,
      position: [
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius * 0.45 + zJitter,
      ],
      size: ring === "near" ? 0.12 + rand() * 0.07 : ring === "mid" ? 0.08 + rand() * 0.05 : 0.05 + rand() * 0.035,
    });
  }

  stars[8] = { id: "hero-a", position: [-1.35, 0.65, -1.4], size: 0.16 };
  stars[21] = { id: "hero-b", position: [1.7, -0.35, -2.2], size: 0.15 };
  stars[39] = { id: "hero-c", position: [0.1, 0.95, -0.8], size: 0.17 };

  return stars;
}

const GROUND_OBJECTS: GroundObjectDef[] = [
  { id: "cube", position: [-2.75, 1.05, -0.55] },
  { id: "hanger", position: [0.25, 1.2, 0.15] },
  { id: "spire", position: [2.55, 0.86, 0.05] },
];

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

function HomeWorld(props: {
  alpha: number;
  phase: Phase;
  onSkyClick: () => void;
  onGroundClick: () => void;
}) {
  const { alpha, phase, onSkyClick, onGroundClick } = props;
  const interactive = phase === "home";
  const targetOpacity = alpha;
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    applyMaterialOpacity(groupRef.current, targetOpacity);
    groupRef.current.visible = targetOpacity > 0.001;
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[24, 96]} />
        <meshStandardMaterial color="#345f9a" roughness={0.95} metalness={0.0} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[7.5, 10.7, 72]} />
        <meshStandardMaterial color="#5b7ec0" emissive="#2e5b9a" emissiveIntensity={0.08} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-6.8, 0.45, -8.6]}>
        <boxGeometry args={[1.25, 0.9, 1.25]} />
        <meshStandardMaterial color="#2a3c64" roughness={0.9} metalness={0.02} />
      </mesh>

      <mesh position={[7.4, 0.42, -9.5]}>
        <boxGeometry args={[1.5, 0.84, 1.1]} />
        <meshStandardMaterial color="#243759" roughness={0.9} metalness={0.02} />
      </mesh>

      <mesh position={[-0.35, 0.9, 0.35]} castShadow>
        <sphereGeometry args={[0.74, 48, 48]} />
        <meshStandardMaterial color="#f1f8ff" emissive="#9bc4ff" emissiveIntensity={0.34} roughness={0.22} metalness={0.08} />
      </mesh>

      <mesh position={[1.35, 1.88, -0.2]} castShadow>
        <capsuleGeometry args={[0.34, 1.55, 10, 20]} />
        <meshStandardMaterial color="#0e1a2c" emissive="#27456f" emissiveIntensity={0.16} roughness={0.6} metalness={0.06} />
      </mesh>

      <mesh position={[1.35, 3.08, -0.2]} castShadow>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#14243b" roughness={0.7} metalness={0.05} />
      </mesh>

      <mesh
        visible={interactive}
        position={[0, 8, -6]}
        onClick={interactive ? onSkyClick : undefined}
      >
        <planeGeometry args={[48, 18]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh
        visible={interactive}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.18, 0]}
        onClick={interactive ? onGroundClick : undefined}
      >
        <circleGeometry args={[12.5, 64]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh position={[0, 8.8, -8]}>
        <planeGeometry args={[36, 10]} />
        <meshBasicMaterial color="#6b8bdb" transparent opacity={0.035} depthWrite={false} />
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
  const {
    alpha,
    phase,
    stars,
    hoveredStar,
    selectedStar,
    onBackHome,
    onSelectStar,
    onEnterReplay,
    onExitFocusOrReplay,
  } = props;

  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    applyMaterialOpacity(groupRef.current, alpha);
    groupRef.current.visible = alpha > 0.001;
  });

  const showField = phase === "lifemap" || phase === "transitionToLifemap" || phase === "transitionHomeFromLifemap";
  const showFocus = phase === "focus" || phase === "replay";
  const replayGlow = phase === "replay";

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, -22]}>
        <sphereGeometry args={[70, 32, 32]} />
        <meshBasicMaterial color={replayGlow ? "#050814" : "#07101c"} side={THREE.BackSide} transparent opacity={1} depthWrite={false} />
      </mesh>

      {showField && (
        <>
          <mesh position={[0, 0, -20]} onClick={phase === "lifemap" ? onBackHome : undefined}>
            <planeGeometry args={[120, 120]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          {stars.map((star) => {
            const isHovered = hoveredStar === star.id;
            const isSelected = selectedStar?.id === star.id;
            const emissiveIntensity = isSelected ? 1.35 : isHovered ? 0.95 : 0.45;
            const scale = isSelected ? 1.8 : isHovered ? 1.45 : 1;

            return (
              <mesh
                key={star.id}
                position={star.position}
                scale={scale}
                onClick={(e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  onSelectStar(star);
                }}
              >
                <sphereGeometry args={[star.size, 18, 18]} />
                <meshStandardMaterial
                  color="#f8fbff"
                  emissive={isSelected ? "#dbeaff" : isHovered ? "#b9d7ff" : "#7cb7ff"}
                  emissiveIntensity={emissiveIntensity}
                  roughness={0.15}
                  metalness={0.0}
                />
              </mesh>
            );
          })}
        </>
      )}

      {showFocus && selectedStar && (
        <group position={selectedStar.position}>
          <mesh onClick={phase === "focus" ? onEnterReplay : onExitFocusOrReplay}>
            <sphereGeometry args={[1.18, 48, 48]} />
            <meshStandardMaterial
              color={phase === "replay" ? "#eaf3ff" : "#f7fbff"}
              emissive={phase === "replay" ? "#d6e9ff" : "#b9d7ff"}
              emissiveIntensity={phase === "replay" ? 1.1 : 0.58}
              roughness={0.08}
              metalness={0.06}
            />
          </mesh>

          <mesh scale={phase === "replay" ? 2.05 : 1.72}>
            <sphereGeometry args={[1.28, 48, 48]} />
            <meshBasicMaterial
              color={phase === "replay" ? "#9fc8ff" : "#7ab6ff"}
              transparent
              opacity={phase === "replay" ? 0.14 : 0.08}
              depthWrite={false}
            />
          </mesh>

          {phase === "replay" && (
            <>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.12]}>
                <ringGeometry args={[1.55, 1.72, 72]} />
                <meshBasicMaterial color="#a7cbff" transparent opacity={0.25} depthWrite={false} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0.3, 0]} position={[0, 0.05, -0.2]}>
                <ringGeometry args={[1.94, 2.08, 72]} />
                <meshBasicMaterial color="#6eaefc" transparent opacity={0.12} depthWrite={false} />
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

  useFrame(() => {
    if (!groupRef.current) return;
    applyMaterialOpacity(groupRef.current, alpha);
    groupRef.current.visible = alpha > 0.001;
  });

  const isGround = phase === "ground" || phase === "transitionToGround" || phase === "transitionHomeFromGround";
  const isDetail = phase === "detail";

  const secondaryOpacity = isDetail ? 0.08 : 1;

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} onClick={phase === "ground" ? onBackHome : undefined}>
        <circleGeometry args={[8.9, 96]} />
        <meshStandardMaterial color="#2a4878" roughness={0.92} metalness={0.02} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[5.85, 7.3, 96]} />
        <meshStandardMaterial color="#4d6fb3" emissive="#24467c" emissiveIntensity={0.12} roughness={0.95} metalness={0.01} />
      </mesh>

      <group
        position={GROUND_OBJECTS[0].position}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (phase === "ground") onSelectObject("cube");
          if (phase === "detail" && selectedObject === "cube") onExitDetail();
        }}
        scale={selectedObject === "cube" ? 1.08 : hoveredObject === "cube" ? 1.04 : 1}
      >
        <mesh visible={!isDetail || selectedObject === "cube"}>
          <boxGeometry args={[1.55, 1.55, 1.55]} />
          <meshStandardMaterial
            color="#6d8fd1"
            emissive="#a7c0ff"
            emissiveIntensity={selectedObject === "cube" || hoveredObject === "cube" ? 0.25 : 0.08}
            roughness={0.58}
            metalness={0.08}
            transparent={isDetail && selectedObject !== "cube"}
            opacity={selectedObject === "cube" ? 1 : secondaryOpacity}
          />
        </mesh>
      </group>

      <group
        position={GROUND_OBJECTS[1].position}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (phase === "ground") onSelectObject("hanger");
          if (phase === "detail" && selectedObject === "hanger") onExitDetail();
        }}
        scale={selectedObject === "hanger" ? 1.08 : hoveredObject === "hanger" ? 1.04 : 1}
      >
        <mesh position={[0, 1.28, 0]} visible={!isDetail || selectedObject === "hanger"}>
          <sphereGeometry args={[0.64, 32, 32]} />
          <meshStandardMaterial
            color="#ff9b54"
            emissive="#ffb071"
            emissiveIntensity={selectedObject === "hanger" || hoveredObject === "hanger" ? 0.42 : 0.18}
            roughness={0.25}
            metalness={0.05}
            transparent={isDetail && selectedObject !== "hanger"}
            opacity={selectedObject === "hanger" ? 1 : secondaryOpacity}
          />
        </mesh>
        <mesh position={[0, 2.62, 0]} visible={!isDetail || selectedObject === "hanger"}>
          <cylinderGeometry args={[0.05, 0.05, 2.52, 18]} />
          <meshStandardMaterial
            color="#8fb2ff"
            emissive="#7aa6ff"
            emissiveIntensity={0.1}
            roughness={0.35}
            metalness={0.22}
            transparent={isDetail && selectedObject !== "hanger"}
            opacity={selectedObject === "hanger" ? 1 : secondaryOpacity}
          />
        </mesh>
      </group>

      <group
        position={GROUND_OBJECTS[2].position}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (phase === "ground") onSelectObject("spire");
          if (phase === "detail" && selectedObject === "spire") onExitDetail();
        }}
        scale={selectedObject === "spire" ? 1.08 : hoveredObject === "spire" ? 1.04 : 1}
      >
        <mesh visible={!isDetail || selectedObject === "spire"}>
          <cylinderGeometry args={[0.22, 0.74, 2.05, 32]} />
          <meshStandardMaterial
            color="#6ea4ff"
            emissive="#95bcff"
            emissiveIntensity={selectedObject === "spire" || hoveredObject === "spire" ? 0.34 : 0.12}
            roughness={0.34}
            metalness={0.1}
            transparent={isDetail && selectedObject !== "spire"}
            opacity={selectedObject === "spire" ? 1 : secondaryOpacity}
          />
        </mesh>
      </group>

      {isGround && (
        <mesh position={[0, 0.02, -12]} onClick={phase === "ground" ? onBackHome : undefined}>
          <planeGeometry args={[60, 40]} />
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

  const targetRef = useRef(new THREE.Vector3(0, 1.4, 0));
  const bg = useRef(new THREE.Color("#0b1320"));

  useFrame((state) => {
    const now = state.clock.getElapsedTime();
    const elapsedMs = performance.now() - phaseStartedAt;

    let desired: CameraPose = homePose(now);

    if (phase === "home") desired = homePose(now);
    if (phase === "lifemap") desired = lifemapPose(now);
    if (phase === "ground") desired = groundPose(now);
    if (phase === "focus" && selectedStar) desired = focusPose(selectedStar, now);
    if (phase === "replay" && selectedStar) desired = replayPose(selectedStar, now);
    if (phase === "detail" && selectedObject) desired = detailPose(selectedObject, now);

    if (phase === "transitionToLifemap") {
      const t = clamp01(elapsedMs / 2400);
      const eased = easeInOut(t);
      const a = homePose(now);
      const b = {
        position: new THREE.Vector3(0.1, 3.45, 10.05),
        target: new THREE.Vector3(0.18, 1.65, 0.1),
        fov: 35.5,
      };
      const c = {
        position: new THREE.Vector3(0.05, 7.35, 7.8),
        target: new THREE.Vector3(0.02, 2.7, -2.1),
        fov: 34.3,
      };
      const d = lifemapPose(now);
      desired = {
        position: bezier3(a.position, b.position, c.position, d.position, eased),
        target: bezier3(a.target, b.target, c.target, d.target, eased),
        fov: THREE.MathUtils.lerp(a.fov, d.fov, eased),
      };
    }

    if (phase === "transitionHomeFromLifemap") {
      const t = clamp01(elapsedMs / 2100);
      const eased = easeInOut(t);
      const a = lifemapPose(now);
      const b = {
        position: new THREE.Vector3(0.05, 5.6, 8.8),
        target: new THREE.Vector3(0.05, 1.9, -1.5),
        fov: 34.5,
      };
      const c = {
        position: new THREE.Vector3(0.12, 3.25, 9.6),
        target: new THREE.Vector3(0.12, 1.55, -0.2),
        fov: 35.3,
      };
      const d = homePose(now);
      desired = {
        position: bezier3(a.position, b.position, c.position, d.position, eased),
        target: bezier3(a.target, b.target, c.target, d.target, eased),
        fov: THREE.MathUtils.lerp(a.fov, d.fov, eased),
      };
    }

    if (phase === "transitionToGround") {
      const t = clamp01(elapsedMs / 2150);
      const eased = easeInOut(t);
      const a = homePose(now);
      const b = {
        position: new THREE.Vector3(0.05, 2.45, 10.0),
        target: new THREE.Vector3(0.2, 1.08, 0.05),
        fov: 36.2,
      };
      const c = {
        position: new THREE.Vector3(-0.15, 1.5, 9.25),
        target: new THREE.Vector3(0.22, 0.92, 0.08),
        fov: 37.3,
      };
      const d = groundPose(now);
      desired = {
        position: bezier3(a.position, b.position, c.position, d.position, eased),
        target: bezier3(a.target, b.target, c.target, d.target, eased),
        fov: THREE.MathUtils.lerp(a.fov, d.fov, eased),
      };
    }

    if (phase === "transitionHomeFromGround") {
      const t = clamp01(elapsedMs / 1850);
      const eased = easeInOut(t);
      const a = groundPose(now);
      const b = {
        position: new THREE.Vector3(-0.08, 1.75, 8.95),
        target: new THREE.Vector3(0.18, 1.06, 0.12),
        fov: 37.5,
      };
      const c = {
        position: new THREE.Vector3(0.02, 2.45, 9.9),
        target: new THREE.Vector3(0.15, 1.36, 0.08),
        fov: 36.4,
      };
      const d = homePose(now);
      desired = {
        position: bezier3(a.position, b.position, c.position, d.position, eased),
        target: bezier3(a.target, b.target, c.target, d.target, eased),
        fov: THREE.MathUtils.lerp(a.fov, d.fov, eased),
      };
    }

    const lerpAmount = phase.startsWith("transition") ? 0.1 : phase === "replay" ? 0.055 : 0.08;

    perspectiveCamera.position.lerp(desired.position, lerpAmount);
    targetRef.current.lerp(desired.target, lerpAmount);
    perspectiveCamera.lookAt(targetRef.current);

    perspectiveCamera.fov = THREE.MathUtils.lerp(perspectiveCamera.fov, desired.fov, 0.08);
    perspectiveCamera.updateProjectionMatrix();

    let bgTarget = new THREE.Color("#0b1320");
    if (phase === "home" || phase === "transitionToGround" || phase === "ground" || phase === "detail" || phase === "transitionHomeFromGround") {
      bgTarget = new THREE.Color("#0b1730");
    }
    if (phase === "lifemap" || phase === "transitionToLifemap" || phase === "transitionHomeFromLifemap" || phase === "focus") {
      bgTarget = new THREE.Color("#050b14");
    }
    if (phase === "replay") {
      bgTarget = new THREE.Color("#040811");
    }

    bg.current.lerp(bgTarget, 0.05);
    scene.background = bg.current;
  });

  return null;
}

function PointerEvents(props: {
  setHoveredStar: (id: string | null) => void;
  setHoveredObject: (id: GroundObjectId | null) => void;
  stars: Star[];
  phase: Phase;
}) {
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
      props.setHoveredStar(null);
      props.setHoveredObject(null);
      document.body.style.cursor = "default";
    };

    gl.domElement.addEventListener("pointermove", onMove);
    gl.domElement.addEventListener("pointerleave", onLeave);

    return () => {
      gl.domElement.removeEventListener("pointermove", onMove);
      gl.domElement.removeEventListener("pointerleave", onLeave);
      document.body.style.cursor = "default";
    };
  }, [gl, props]);

  useFrame(() => {
    raycaster.setFromCamera(mouse.current, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let hoveredStar: string | null = null;
    let hoveredObject: GroundObjectId | null = null;

    for (const hit of intersects) {
      const obj = hit.object;
      const pos = obj.getWorldPosition(new THREE.Vector3());

      if (props.phase === "lifemap") {
        const foundStar = props.stars.find((s) => {
          const d = new THREE.Vector3(...s.position).distanceTo(pos);
          return d < 0.25;
        });
        if (foundStar) {
          hoveredStar = foundStar.id;
          break;
        }
      }

      if (props.phase === "ground" || props.phase === "detail") {
        const name = obj.parent?.name || obj.name;
        if (name === "cube" || name === "hanger" || name === "spire") {
          hoveredObject = name;
          break;
        }
      }
    }

    props.setHoveredStar(hoveredStar);
    props.setHoveredObject(hoveredObject);
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
      const id = window.setTimeout(() => begin("lifemap"), 2400);
      return () => window.clearTimeout(id);
    }
    if (phase === "transitionHomeFromLifemap") {
      const id = window.setTimeout(() => {
        setSelectedStar(null);
        begin("home");
      }, 2100);
      return () => window.clearTimeout(id);
    }
    if (phase === "transitionToGround") {
      const id = window.setTimeout(() => begin("ground"), 2150);
      return () => window.clearTimeout(id);
    }
    if (phase === "transitionHomeFromGround") {
      const id = window.setTimeout(() => {
        setSelectedObject(null);
        begin("home");
      }, 1850);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [phase]);

  const { homeAlpha, lifemapAlpha, groundAlpha } = computeAlpha(phase);

  return (
    <>
      <color attach="background" args={["#0b1320"]} />
      <fog attach="fog" args={[phase === "replay" ? "#040811" : "#09111d", 18, 52]} />

      <ambientLight intensity={0.78} />
      <hemisphereLight args={["#b7d4ff", "#182338", 1.0]} />
      <directionalLight position={[7, 10, 8]} intensity={1.15} color="#f4f8ff" />
      <pointLight position={[-0.35, 1.0, 0.35]} intensity={phase === "home" ? 2.3 : 0.65} distance={14} color="#d7ebff" />
      <pointLight position={[0, 2.5, 3.5]} intensity={phase === "replay" ? 1.2 : phase === "lifemap" || phase === "focus" ? 0.8 : 0.45} distance={25} color="#8bb8ff" />

      <HomeWorld
        alpha={homeAlpha}
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

      <group visible={phase !== "transitionHomeFromGround"}>
        <GroundWorld
          alpha={groundAlpha}
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
      </group>

      <LifemapWorld
        alpha={lifemapAlpha}
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
          if (phase === "replay") {
            begin("lifemap");
            return;
          }
          if (phase === "focus") {
            begin("lifemap");
          }
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
        camera={{ position: [0.15, 2.75, 10.3], fov: 36, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
