"use client";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ScenePhase } from "../types/scene";

type StarPoint = {
  id: string;
  position: [number, number, number];
  size: number;
  tone: string;
};

const STAR_COUNT = 56;
const ASCENT_MS = 1800;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function generateStars(count: number): StarPoint[] {
  const rnd = lcg(19830414);
  const out: StarPoint[] = [];

  for (let i = 0; i < count; i += 1) {
    const ring = i < 14 ? 0.9 + rnd() * 1.6 : 2.5 + rnd() * 9.5;
    const angle = rnd() * Math.PI * 2;
    const vertical = (rnd() - 0.5) * (i < 14 ? 1.2 : 7.5);
    const depth = -2 - rnd() * 24;
    const skew = 0.55 + rnd() * 1.35;
    const x = Math.cos(angle) * ring * skew;
    const y = vertical + Math.sin(angle * 1.7) * (i < 14 ? 0.15 : 0.75);
    const z = depth + (i < 14 ? 5.5 : 0);
    const size = i < 14 ? 0.05 + rnd() * 0.05 : 0.035 + rnd() * 0.11;
    const tone = rnd() > 0.82 ? "#dfeaff" : rnd() > 0.58 ? "#bfd2ff" : "#f2f7ff";

    out.push({
      id: `star-${i + 1}`,
      position: [x, y, z],
      size,
      tone,
    });
  }

  return out;
}

function stepBackPhase(phase: ScenePhase): ScenePhase {
  if (phase === "replay") return "focus";
  if (phase === "focus") return "lifemap";
  if (phase === "lifemap") return "home";
  if (phase === "ascent") return "home";
  return "home";
}

function CameraRig({
  phase,
  selected,
}: {
  phase: ScenePhase;
  selected: StarPoint | null;
}) {
  const { camera } = useThree();
  const lookAtRef = useRef(new THREE.Vector3(0, 0, -6));
  const posRef = useRef(new THREE.Vector3(0, 0.2, 10.4));

  useFrame(() => {
    const targetPos = new THREE.Vector3(0, 0.2, 10.4);
    const targetLook = new THREE.Vector3(0, 0.1, -2.2);
    let targetFov = 48;

    if (phase === "ascent") {
      targetPos.set(0, 0.45, 7.1);
      targetLook.set(0, 0.2, -6.5);
      targetFov = 44;
    } else if (phase === "lifemap") {
      targetPos.set(0, 0.15, 5.05);
      targetLook.set(0, 0, -11.2);
      targetFov = 41;
    } else if ((phase === "focus" || phase === "replay") && selected) {
      const star = new THREE.Vector3(...selected.position);
      if (phase === "focus") {
        targetPos.copy(star).add(new THREE.Vector3(0, 0.34, 3.3));
        targetLook.copy(star);
        targetFov = 34;
      } else {
        targetPos.copy(star).add(new THREE.Vector3(0, -0.1, 2.15));
        targetLook.copy(star).add(new THREE.Vector3(0, -0.05, -0.55));
        targetFov = 28;
      }
    }

    posRef.current.lerp(targetPos, 0.06);
    lookAtRef.current.lerp(targetLook, 0.08);

    camera.position.copy(posRef.current);
    camera.lookAt(lookAtRef.current);
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = THREE.MathUtils.lerp(perspective.fov, targetFov, 0.08);
    perspective.updateProjectionMatrix();
  });

  return null;
}

function Environment({ phase }: { phase: ScenePhase }) {
  const groundRef = useRef<THREE.Mesh>(null);
  const horizonRef = useRef<THREE.Mesh>(null);
  const replayVeilRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (groundRef.current) {
      const target = phase === "home" ? 0.22 : phase === "ascent" ? 0.1 : 0;
      const material = groundRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = THREE.MathUtils.lerp(material.opacity, target, 0.08);
    }

    if (horizonRef.current) {
      const target = phase === "home" ? 0.14 : phase === "ascent" ? 0.08 : 0.015;
      const material = horizonRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = THREE.MathUtils.lerp(material.opacity, target, 0.08);
    }

    if (replayVeilRef.current) {
      const target = phase === "replay" ? 0.28 : 0;
      const material = replayVeilRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = THREE.MathUtils.lerp(material.opacity, target, 0.08);
    }
  });

  return (
    <>
      <color attach="background" args={["#020711"]} />
      <fog attach="fog" args={["#020711", 12, 38]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[3.5, 4.5, 8]} intensity={0.45} color="#c8d6ff" />
      <pointLight position={[0, 0.9, 2.5]} intensity={1.45} color="#dfe8ff" distance={18} />
      <pointLight position={[0, -0.4, -12]} intensity={0.2} color="#95a8ff" distance={26} />

      <mesh ref={groundRef} position={[0, -1.95, -8.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[18, 96]} />
        <meshBasicMaterial color="#0f203e" transparent opacity={0.2} />
      </mesh>

      <mesh ref={horizonRef} position={[0, -1.1, -15.5]}>
        <ringGeometry args={[4.5, 15.8, 96]} />
        <meshBasicMaterial color="#183661" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={replayVeilRef} position={[0, 0, -16]}>
        <planeGeometry args={[80, 60]} />
        <meshBasicMaterial color="#01040b" transparent opacity={0} />
      </mesh>
    </>
  );
}

function OrbWorld({ phase }: { phase: ScenePhase }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloARef = useRef<THREE.Mesh>(null);
  const haloBRef = useRef<THREE.Mesh>(null);
  const retreatRef = useRef(0);

  useFrame(() => {
    const targetRetreat = phase === "home" ? 0 : phase === "ascent" ? 0.75 : 1;
    retreatRef.current = THREE.MathUtils.lerp(retreatRef.current, targetRetreat, phase === "ascent" ? 0.035 : 0.08);

    const t = clamp01(retreatRef.current);
    const eased = t * t * (3 - 2 * t);

    if (groupRef.current) {
      groupRef.current.position.lerp(
        new THREE.Vector3(0, 0.12 + eased * 0.18, THREE.MathUtils.lerp(0.9, -9.5, eased)),
        0.08,
      );
      groupRef.current.scale.lerp(
        new THREE.Vector3(
          THREE.MathUtils.lerp(1, 0.18, eased),
          THREE.MathUtils.lerp(1, 0.18, eased),
          1,
        ),
        0.08,
      );
    }

    const coreOpacity = THREE.MathUtils.lerp(0.98, 0.03, eased);
    const haloAOpacity = THREE.MathUtils.lerp(0.12, 0.01, eased);
    const haloBOpacity = THREE.MathUtils.lerp(0.06, 0.004, eased);

    if (coreRef.current) {
      const material = coreRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = THREE.MathUtils.lerp(material.opacity, coreOpacity, 0.08);
    }

    if (haloARef.current) {
      const material = haloARef.current.material as THREE.MeshBasicMaterial;
      material.opacity = THREE.MathUtils.lerp(material.opacity, haloAOpacity, 0.08);
      haloARef.current.scale.lerp(
        new THREE.Vector3(
          THREE.MathUtils.lerp(1, 1.7, eased),
          THREE.MathUtils.lerp(1, 1.7, eased),
          1,
        ),
        0.08,
      );
    }

    if (haloBRef.current) {
      const material = haloBRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = THREE.MathUtils.lerp(material.opacity, haloBOpacity, 0.08);
      haloBRef.current.scale.lerp(
        new THREE.Vector3(
          THREE.MathUtils.lerp(1, 2.4, eased),
          THREE.MathUtils.lerp(1, 2.4, eased),
          1,
        ),
        0.08,
      );
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={haloBRef}>
        <ringGeometry args={[2.8, 7.6, 128]} />
        <meshBasicMaterial color="#0d2a58" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={haloARef}>
        <ringGeometry args={[1.55, 4.3, 128]} />
        <meshBasicMaterial color="#274a86" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.5, 48, 48]} />
        <meshBasicMaterial color="#dbe6f8" transparent opacity={0.98} />
      </mesh>
    </group>
  );
}

function ReplayChamber({
  phase,
  selected,
}: {
  phase: ScenePhase;
  selected: StarPoint | null;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    const targetOpacity = phase === "replay" && selected ? 1 : 0;
    const materialA = groupRef.current.children[0] instanceof THREE.Mesh
      ? (groupRef.current.children[0].material as THREE.MeshBasicMaterial)
      : null;
    const materialB = groupRef.current.children[1] instanceof THREE.Mesh
      ? (groupRef.current.children[1].material as THREE.MeshBasicMaterial)
      : null;
    const materialC = groupRef.current.children[2] instanceof THREE.Mesh
      ? (groupRef.current.children[2].material as THREE.MeshBasicMaterial)
      : null;

    if (selected) {
      groupRef.current.position.lerp(new THREE.Vector3(...selected.position), 0.1);
    }

    if (materialA) materialA.opacity = THREE.MathUtils.lerp(materialA.opacity, 0.18 * targetOpacity, 0.08);
    if (materialB) materialB.opacity = THREE.MathUtils.lerp(materialB.opacity, 0.1 * targetOpacity, 0.08);
    if (materialC) materialC.opacity = THREE.MathUtils.lerp(materialC.opacity, 0.22 * targetOpacity, 0.08);

    const targetScale = phase === "replay" && selected ? 1 : 0.76;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.45, 2.8, 128]} />
        <meshBasicMaterial color="#4c6dbe" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[1.95, 0.03, 16, 128]} />
        <meshBasicMaterial color="#84a2ff" transparent opacity={0} />
      </mesh>
      <mesh position={[0, 0, -1.05]}>
        <planeGeometry args={[4.8, 4.8]} />
        <meshBasicMaterial color="#091122" transparent opacity={0} />
      </mesh>
    </group>
  );
}

function StarsLayer({
  phase,
  stars,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: {
  phase: ScenePhase;
  stars: StarPoint[];
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (star: StarPoint) => void;
}) {
  return (
    <>
      {stars.map((star) => {
        const isSelected = star.id === selectedId;
        const isHovered = star.id === hoveredId;
        const isHome = phase === "home";
        const isAscent = phase === "ascent";
        const focusLike = phase === "focus" || phase === "replay";

        let scale = 1;
        let opacity = 0.92;
        let color = star.tone;

        if (isHome) {
          opacity = star.position[2] > -4 ? 0.86 : 0.55;
          scale = 1.08;
        } else if (isAscent) {
          opacity = star.position[2] > -4 ? 0.7 : 0.5;
          scale = 1.04;
        } else if (focusLike) {
          opacity = isSelected ? 1 : 0.08;
          scale = isSelected ? 2.25 : 0.72;
          color = isSelected ? "#f4f8ff" : "#7b8eb8";
        } else {
          opacity = isHovered ? 1 : isSelected ? 1 : 0.9;
          scale = isHovered ? 1.65 : isSelected ? 1.55 : 1;
        }

        return (
          <mesh
            key={star.id}
            position={star.position}
            scale={star.size * scale}
            onPointerOver={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              if (phase === "lifemap" || phase === "focus") onHover(star.id);
            }}
            onPointerOut={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              onHover(null);
            }}
            onClick={(event: ThreeEvent<MouseEvent>) => {
              event.stopPropagation();
              if (phase !== "home" && phase !== "ascent") onSelect(star);
            }}
          >
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </>
  );
}

function SceneWorld({
  phase,
  stars,
  selected,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: {
  phase: ScenePhase;
  stars: StarPoint[];
  selected: StarPoint | null;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (star: StarPoint) => void;
}) {
  return (
    <>
      <CameraRig phase={phase} selected={selected} />
      <Environment phase={phase} />
      <OrbWorld phase={phase} />
      <ReplayChamber phase={phase} selected={selected} />
      <group position={[0, 0.02, 0]}>
        <StarsLayer
          phase={phase}
          stars={stars}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onHover={onHover}
          onSelect={onSelect}
        />
      </group>
    </>
  );
}

export default function SpatialScene() {
  const [phase, setPhase] = useState<ScenePhase>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const stars = useMemo(() => generateStars(STAR_COUNT), []);
  const selected = useMemo(() => stars.find((star) => star.id === selectedId) ?? null, [stars, selectedId]);
  const ascentTimerRef = useRef<number | null>(null);

  const clearAscentTimer = useCallback(() => {
    if (ascentTimerRef.current !== null) {
      window.clearTimeout(ascentTimerRef.current);
      ascentTimerRef.current = null;
    }
  }, []);

  const beginAscent = useCallback(() => {
    clearAscentTimer();
    setHoveredId(null);
    setSelectedId(null);
    setPhase("ascent");
    ascentTimerRef.current = window.setTimeout(() => {
      setPhase("lifemap");
      ascentTimerRef.current = null;
    }, ASCENT_MS);
  }, [clearAscentTimer]);

  const goBack = useCallback(() => {
    clearAscentTimer();
    setHoveredId(null);
    setPhase((current) => {
      const next = stepBackPhase(current);
      if (current === "focus" || current === "lifemap" || current === "ascent") {
        setSelectedId(null);
      }
      if (current === "replay") {
        return "focus";
      }
      if (current === "focus") {
        return "lifemap";
      }
      if (current === "lifemap" || current === "ascent") {
        return "home";
      }
      return next;
    });
  }, [clearAscentTimer]);

  const enterReplay = useCallback(() => {
    if (!selected) return;
    clearAscentTimer();
    setPhase("replay");
  }, [clearAscentTimer, selected]);

  const handleStarSelect = useCallback(
    (star: StarPoint) => {
      clearAscentTimer();
      setHoveredId(null);
      setSelectedId(star.id);

      if (phase === "lifemap") {
        setPhase("focus");
        return;
      }

      if (phase === "focus" && selectedId === star.id) {
        setPhase("replay");
      }
    },
    [clearAscentTimer, phase, selectedId],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        goBack();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();

        if (phase === "home") {
          beginAscent();
          return;
        }

        if (phase === "focus" && selected) {
          enterReplay();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearAscentTimer();
    };
  }, [beginAscent, clearAscentTimer, enterReplay, goBack, phase, selected]);

  const title =
    phase === "home"
      ? "HOME"
      : phase === "ascent"
      ? "ASCENT"
      : phase === "lifemap"
      ? "LIFEMAP"
      : phase === "focus"
      ? "FOCUS"
      : "REPLAY";

  const copy =
    phase === "home"
      ? "Enter or click empty space to begin ascent."
      : phase === "ascent"
      ? "The orb stays back and fades while the camera carries forward into the field."
      : phase === "lifemap"
      ? "Select a star to enter focus. Escape returns to home."
      : phase === "focus"
      ? "Selected star isolated. Enter or Replay moves into chamber view. Escape returns to LifeMap."
      : "Replay chamber active. Escape returns to Focus.";

  return (
    <div
      className="urai-scene"
      onClick={() => {
        if (phase === "home") beginAscent();
      }}
    >
      <div className="urai-canvas">
        <Canvas camera={{ position: [0, 0.2, 10.4], fov: 48 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
          <SceneWorld
            phase={phase}
            stars={stars}
            selected={selected}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={handleStarSelect}
          />
        </Canvas>
      </div>

      <div className="urai-ui">
        <div className="urai-panel" onClick={(event) => event.stopPropagation()}>
          <p className="urai-kicker">URAI SPATIAL</p>
          <h1 className="urai-title">{title}</h1>
          <p className="urai-copy">{copy}</p>

          <div className="urai-actions">
            {phase === "home" && <button className="urai-btn" onClick={beginAscent}>Begin ascent</button>}

            {phase === "lifemap" && (
              <button className="urai-btn urai-btn--ghost" disabled>
                Click a star
              </button>
            )}

            {phase === "focus" && (
              <>
                <button className="urai-btn" onClick={enterReplay} disabled={!selected}>
                  Replay
                </button>
                <button className="urai-btn urai-btn--ghost" onClick={goBack}>
                  Back
                </button>
              </>
            )}

            {phase === "replay" && (
              <button className="urai-btn urai-btn--ghost" onClick={goBack}>
                Back
              </button>
            )}

            {(phase === "lifemap" || phase === "ascent") && (
              <button className="urai-btn urai-btn--ghost" onClick={goBack}>
                Back
              </button>
            )}
          </div>
        </div>

        <div className="urai-hint">
          ESC walks back one step:
          <span className="urai-pill">Replay → Focus</span>
          <span className="urai-pill">Focus → LifeMap</span>
          <span className="urai-pill">LifeMap → Home</span>
        </div>
      </div>
    </div>
  );
}
