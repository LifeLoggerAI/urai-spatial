import CameraRig from "../components/CameraRig";
"use client";

import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import { Group, MathUtils, Mesh, PerspectiveCamera, Vector3 } from "three";
import { useGestures } from "../input/useGestures";
import { SceneMode, useSceneStore } from "../state/sceneStore";
import ObjectNode from "./ObjectNode";
import Starfield, { Tier1Star, createTier1Stars } from "./Starfield";
import CinematicAtmosphere from "../effects/CinematicAtmosphere";
import CinematicLightingRig from "../lighting/CinematicLightingRig";
import OrbGlow from "./OrbGlow";
import CinematicGroundAccents from "./CinematicGroundAccents";
import CinematicFramingBias from "../effects/CinematicFramingBias";

interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

interface GroundItem {
  id: string;
  position: [number, number, number];
  kind: "cube" | "cone" | "pillar";
  color: string;
}

const HOME_ORB_POSITION: [number, number, number] = [-0.95, 0.4, -0.1];
const AVATAR_POSITION: [number, number, number] = [1.4, 0.25, -0.85];

const GROUND_ITEMS: GroundItem[] = [
  { id: "ground-cube", position: [-2.8, 0.82, -1.35], kind: "cube", color: "#86a5e6" },
  { id: "ground-cone", position: [2.55, 0.02, -1.05], kind: "cone", color: "#9ec0f5" },
  { id: "ground-pillar", position: [0.2, 0.1, -2.9], kind: "pillar", color: "#6e95e0" },
];

function cameraPoseForMode(
  mode: SceneMode,
  selectedStarPosition: [number, number, number] | null,
  selectedObjectPosition: [number, number, number] | null,
): CameraPose {
  switch (mode) {
    case "lifemap":
      return {
        position: [0.65, 0.18, 9.4],
        target: [0, -0.1, -11.6],
        fov: 46,
      };
    case "focus": {
      const target = selectedStarPosition ?? [0, 0, -10];
      return {
        position: [target[0] + 0.75, target[1] + 0.25, target[2] + 3.2],
        target,
        fov: 34,
      };
    }
    case "replay":
      return {
        position: [0.25, 0.05, 3.15],
        target: [0, 0, 0],
        fov: 36,
      };
    case "ground":
      return {
        position: [0.25, 1.6, 4.9],
        target: [0, 0.78, -1.55],
        fov: 46,
      };
    case "object": {
      const target = selectedObjectPosition ?? [0, 1.2, -1.4];
      return {
        position: [target[0] * 0.2 + 0.45, target[1] + 0.65, target[2] + 2.85],
        target: [target[0], target[1] + 0.4, target[2]],
        fov: 38,
      };
    }
    case "home":
    default:
      return {
        position: [1.35, 1.04, 6.15],
        target: [-0.55, 0.48, -0.15],
        fov: 44,
      };
  }
}

function CameraRig({
  mode,
  selectedStarPosition,
  selectedObjectPosition,
}: {
  mode: SceneMode;
  selectedStarPosition: [number, number, number] | null;
  selectedObjectPosition: [number, number, number] | null;
}): null {
  const { camera } = useThree();
  const targetRef = useRef(new Vector3(0, 0, 0));
  const offsetRef = useRef(new Vector3(0, 0, 0));

  useFrame(({ clock }) => {
    const pose = cameraPoseForMode(mode, selectedStarPosition, selectedObjectPosition);
    const wobble = mode === "home" || mode === "ground" || mode === "lifemap" ? 0.08 : 0.02;
    const t = clock.elapsedTime;

    offsetRef.current.set(
      Math.sin(t * 0.22) * wobble,
      Math.cos(t * 0.17) * wobble * 0.55,
      Math.sin(t * 0.11) * wobble * 0.7,
    );

    const desiredPosition = new Vector3(...pose.position).add(offsetRef.current);
    const desiredTarget = new Vector3(...pose.target);

    camera.position.lerp(desiredPosition, 0.08);
    targetRef.current.lerp(desiredTarget, 0.1);
    camera.lookAt(targetRef.current);

    if (camera instanceof PerspectiveCamera) {
      camera.fov = MathUtils.lerp(camera.fov, pose.fov, 0.08);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

function LightingRig({ mode }: { mode: SceneMode }): JSX.Element {
  const skyIntensity = mode === "home" || mode === "lifemap" || mode === "focus" ? 1.35 : 0.92;
  const groundIntensity = mode === "ground" || mode === "object" ? 1.15 : 0.65;

  return (
    <>
      <ambientLight intensity={0.34} />
      <directionalLight
        position={[4.5, 5.8, 5.2]}
        intensity={2.2}
        color="#dce7ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5.5, 2.4, -6.2]} intensity={0.95} color="#6e9aff" />
      <pointLight position={[-1.2, 1.1, 0.6]} intensity={skyIntensity} color="#88c8ff" distance={9} />
      <pointLight position={[0, -2.5, 3.5]} intensity={groundIntensity} color="#0b255f" distance={18} />
      <pointLight position={[3.8, 2.2, -3.5]} intensity={0.7} color="#4d7eff" distance={10} />
    </>
  );
}

function BackgroundShell({ mode }: { mode: SceneMode }): JSX.Element {
  const color = mode === "ground" || mode === "object" ? "#02153e" : "#020d28";

  return (
    <>
      <color attach="background" args={[color]} />
      <fogExp2 attach="fog" args={["#06142d", mode === "lifemap" ? 0.03 : 0.05]} />
      <mesh position={[0, 18, -12]} rotation={[0.4, 0, 0]}>
        <sphereGeometry args={[38, 40, 40, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
        <meshBasicMaterial color="#112451" transparent opacity={0.82} side={1} />
      </mesh>
      <mesh position={[0, -8.5, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[32, 80]} />
        <meshStandardMaterial color="#0a2f82" emissive="#0a2f82" emissiveIntensity={0.28} roughness={1} />
      </mesh>
      <mesh position={[0, -2.3, -7]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.2, 12.8, 72]} />
        <meshBasicMaterial color="#4473d2" transparent opacity={0.74} />
      </mesh>
    </>
  );
}

function GroundSilhouettes({ active }: { active: boolean }): JSX.Element {
  const silhouettes = useMemo(() => {
    const items: Array<{
      key: string;
      position: [number, number, number];
      scale: [number, number, number];
      rotationY: number;
      kind: "box" | "cone";
    }> = [];

    const total = 16;
    for (let i = 0; i < total; i += 1) {
      const angle = (i / total) * Math.PI * 2;
      const radius = 9.5 + (i % 3) * 1.15;
      items.push({
        key: `sil-${i}`,
        position: [Math.cos(angle) * radius, 0.35, Math.sin(angle) * radius - 2.4],
        scale: [0.7 + (i % 4) * 0.25, 1.2 + (i % 5) * 0.4, 0.7 + ((i + 2) % 4) * 0.25],
        rotationY: angle + 0.4,
        kind: i % 2 === 0 ? "box" : "cone",
      });
    }

    return items;
  }, []);

  return (
    <group visible={active}>
      {silhouettes.map((item) => (
        <group
          key={item.key}
          position={item.position}
          rotation={[0, item.rotationY, 0]}
          scale={item.scale}
        >
          {item.kind === "box" ? (
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#061a4e" roughness={0.98} metalness={0.02} />
            </mesh>
          ) : (
            <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
              <coneGeometry args={[0.65, 1.4, 12]} />
              <meshStandardMaterial color="#061a4e" roughness={0.98} metalness={0.02} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function HomeOrb({
  mode,
  onEnterSky,
  onEnterGround,
}: {
  mode: SceneMode;
  onEnterSky: () => void;
  onEnterGround: () => void;
}): JSX.Element {
  const orbRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const skyGateRef = useRef<Mesh>(null);
  const groundGateRef = useRef<Mesh>(null);
  const [skyHovered, setSkyHovered] = useState(false);
  const [groundHovered, setGroundHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.25) * 0.025;

    if (orbRef.current) {
      orbRef.current.position.y = HOME_ORB_POSITION[1] + Math.sin(t * 0.9) * 0.04;
      orbRef.current.scale.setScalar(pulse);
      const material = orbRef.current.material;
      if ("emissiveIntensity" in material) {
        material.emissiveIntensity = mode === "home" ? 3.9 : 2.6;
      }
    }

    if (haloRef.current) {
      haloRef.current.scale.setScalar(1.2 + Math.sin(t * 1.2) * 0.03);
      const material = haloRef.current.material;
      if ("opacity" in material) {
        material.opacity = 0.22 + Math.sin(t * 1.4) * 0.03;
      }
    }

    if (skyGateRef.current) {
      const material = skyGateRef.current.material;
      if ("opacity" in material) {
        material.opacity = skyHovered ? 0.32 : 0.18;
      }
    }

    if (groundGateRef.current) {
      const material = groundGateRef.current.material;
      if ("opacity" in material) {
        material.opacity = groundHovered ? 0.24 : 0.13;
      }
    }
  });

  const skyOver = (event: ThreeEvent<PointerEvent>): void => {
    event.stopPropagation();
    setSkyHovered(true);
    if (typeof document !== "undefined") document.body.style.cursor = "pointer";
  };

  const skyOut = (): void => {
    setSkyHovered(false);
    if (typeof document !== "undefined") document.body.style.cursor = "default";
  };

  const groundOver = (event: ThreeEvent<PointerEvent>): void => {
    event.stopPropagation();
    setGroundHovered(true);
    if (typeof document !== "undefined") document.body.style.cursor = "pointer";
  };

  const groundOut = (): void => {
    setGroundHovered(false);
    if (typeof document !== "undefined") document.body.style.cursor = "default";
  };

  return (
    <group visible={mode === "home"}>
      <mesh ref={haloRef} position={HOME_ORB_POSITION}>
        <sphereGeometry args={[1.42, 32, 32]} />
        <meshBasicMaterial color="#8ccfff" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      <mesh ref={orbRef} position={HOME_ORB_POSITION} castShadow receiveShadow>
        <sphereGeometry args={[1.05, 40, 40]} />
        <meshStandardMaterial
          color="#a8d4ff"
          emissive="#9ed4ff"
          emissiveIntensity={3.9}
          roughness={0.14}
          metalness={0.02}
        />
      </mesh>

      <mesh
        ref={skyGateRef}
        position={[0.1, 3.85, -3.4]}
        rotation={[-0.42, 0, 0]}
        onPointerOver={skyOver}
        onPointerOut={skyOut}
        onClick={(event) => {
          event.stopPropagation();
          onEnterSky();
        }}
      >
        <circleGeometry args={[5.4, 48]} />
        <meshBasicMaterial color="#6eaef7" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh
        ref={groundGateRef}
        position={[0, -0.42, -1.85]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={groundOver}
        onPointerOut={groundOut}
        onClick={(event) => {
          event.stopPropagation();
          onEnterGround();
        }}
      >
        <ringGeometry args={[4.8, 8.2, 64]} />
        <meshBasicMaterial color="#325ebc" transparent opacity={0.13} depthWrite={false} />
      </mesh>
    </group>
  );
}

function AvatarFigure({ visible }: { visible: boolean }): JSX.Element {
  const bodyRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!bodyRef.current) return;
    const t = clock.elapsedTime;
    bodyRef.current.position.y = AVATAR_POSITION[1] + Math.sin(t * 0.85) * 0.03;
  });

  return (
    <group ref={bodyRef} position={AVATAR_POSITION} visible={visible}>
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.38, 1.95, 10, 22]} />
        <meshStandardMaterial
          color="#071e68"
          emissive="#0f2f85"
          emissiveIntensity={0.85}
          roughness={0.22}
          metalness={0.18}
        />
      </mesh>
      <mesh position={[0, 2.95, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.46, 26, 26]} />
        <meshStandardMaterial
          color="#082567"
          emissive="#12378f"
          emissiveIntensity={0.95}
          roughness={0.18}
          metalness={0.18}
        />
      </mesh>
      <mesh position={[0.18, 2.1, -0.1]}>
        <sphereGeometry args={[0.95, 18, 18]} />
        <meshBasicMaterial color="#4b83ff" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GroundWorld({
  mode,
  onSelectObject,
  selectedObject,
  onReturnHome,
}: {
  mode: SceneMode;
  onSelectObject: (id: string) => void;
  selectedObject: string | null;
  onReturnHome: () => void;
}): JSX.Element {
  const groundVisible = mode === "ground" || mode === "object";
  const returnHoveredRef = useRef<Mesh>(null);
  const [returnHovered, setReturnHovered] = useState(false);

  useFrame(() => {
    if (returnHoveredRef.current) {
      const material = returnHoveredRef.current.material;
      if ("opacity" in material) {
        material.opacity = returnHovered ? 0.22 : 0.12;
      }
    }
  });

  return (
    <group visible={groundVisible}>
      <GroundSilhouettes active={groundVisible} />

      <mesh position={[0, -0.02, -2.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[11.4, 96]} />
        <meshStandardMaterial
          color="#0b2f83"
          emissive="#0d2d75"
          emissiveIntensity={0.22}
          roughness={0.95}
          metalness={0.03}
        />
      </mesh>

      <mesh position={[0, 0.01, -2.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.2, 10.4, 96]} />
        <meshBasicMaterial color="#4f7edd" transparent opacity={0.76} />
      </mesh>

      {GROUND_ITEMS.map((item) => (
        <ObjectNode
          key={item.id}
          id={item.id}
          position={item.position}
          kind={item.kind}
          color={item.color}
          selected={selectedObject === item.id}
          onSelect={onSelectObject}
        />
      ))}

      <mesh
        ref={returnHoveredRef}
        position={[0, 0.04, 6.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(event) => {
          event.stopPropagation();
          setReturnHovered(true);
          if (typeof document !== "undefined") document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setReturnHovered(false);
          if (typeof document !== "undefined") document.body.style.cursor = "default";
        }}
        onClick={(event) => {
          event.stopPropagation();
          onReturnHome();
        }}
      >
        <ringGeometry args={[2.1, 3.35, 48]} />
        <meshBasicMaterial color="#2e63d1" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ReplayCore({ visible }: { visible: boolean }): JSX.Element {
  const outerRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (outerRef.current) {
      outerRef.current.rotation.y += 0.0025;
      const material = outerRef.current.material;
      if ("opacity" in material) {
        material.opacity = 0.17 + Math.sin(t * 1.1) * 0.03;
      }
    }

    if (innerRef.current) {
      innerRef.current.rotation.y -= 0.0032;
      const material = innerRef.current.material;
      if ("opacity" in material) {
        material.opacity = 0.2 + Math.sin(t * 1.6) * 0.03;
      }
    }

    if (coreRef.current) {
      coreRef.current.scale.setScalar(1 + Math.sin(t * 1.35) * 0.03);
      const material = coreRef.current.material;
      if ("emissiveIntensity" in material) {
        material.emissiveIntensity = 2.35 + Math.sin(t * 1.6) * 0.18;
      }
    }
  });

  return (
    <group visible={visible}>
      <mesh ref={outerRef}>
        <sphereGeometry args={[1.55, 36, 36]} />
        <meshBasicMaterial color="#67aef8" transparent opacity={0.17} depthWrite={false} />
      </mesh>
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[1.28, 2]} />
        <meshBasicMaterial color="#98d4ff" transparent opacity={0.2} wireframe depthWrite={false} />
      </mesh>
      <mesh ref={coreRef} castShadow receiveShadow>
        <sphereGeometry args={[0.94, 36, 36]} />
        <meshStandardMaterial
          color="#8fd1ff"
          emissive="#a1dfff"
          emissiveIntensity={2.35}
          roughness={0.08}
          metalness={0.06}
          transparent
          opacity={0.96}
        />
      </mesh>
    </group>
  );
}

function SceneContent(): JSX.Element {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const selectedObject = useSceneStore((s) => s.selectedObject);
  const goSky = useSceneStore((s) => s.goSky);
  const goGround = useSceneStore((s) => s.goGround);
  const goHome = useSceneStore((s) => s.goHome);
  const selectStar = useSceneStore((s) => s.selectStar);
  const selectObject = useSceneStore((s) => s.selectObject);
  const enterReplay = useSceneStore((s) => s.enterReplay);
  const exitReplay = useSceneStore((s) => s.exitReplay);
  const exitObject = useSceneStore((s) => s.exitObject);

  const stars = useMemo<Tier1Star[]>(() => createTier1Stars(), []);

  const selectedStarPosition = useMemo<[number, number, number] | null>(() => {
    const match = stars.find((item) => item.id === selectedStar);
    return match?.position ?? null;
  }, [selectedStar, stars]);

  const selectedObjectPosition = useMemo<[number, number, number] | null>(() => {
    const match = GROUND_ITEMS.find((item) => item.id === selectedObject);
    return match?.position ?? null;
  }, [selectedObject]);

  const starfieldGroupRef = useRef<Group>(null);
  const replayHoveredRef = useRef<Mesh>(null);
  const backFromFocusRef = useRef<Mesh>(null);
  const backFromReplayRef = useRef<Mesh>(null);

  const [replayHovered, setReplayHovered] = useState(false);
  const [focusBackHovered, setFocusBackHovered] = useState(false);
  const [replayBackHovered, setReplayBackHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (starfieldGroupRef.current) {
      starfieldGroupRef.current.position.x = Math.sin(t * 0.15) * 0.16;
      starfieldGroupRef.current.position.y = Math.cos(t * 0.13) * 0.1;
    }

    const entries = [
      { ref: replayHoveredRef, active: replayHovered, base: 0.14, peak: 0.26 },
      { ref: backFromFocusRef, active: focusBackHovered, base: 0.11, peak: 0.2 },
      { ref: backFromReplayRef, active: replayBackHovered, base: 0.11, peak: 0.2 },
    ];

    entries.forEach(({ ref, active, base, peak }) => {
      if (!ref.current) return;
      const material = ref.current.material;
      if ("opacity" in material) {
        material.opacity = active ? peak : base;
      }
    });
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  return (
    <>
      <CameraRig
        mode={mode}
        selectedStarPosition={selectedStarPosition}
        selectedObjectPosition={selectedObjectPosition}
      />

      <BackgroundShell mode={mode} />
      <LightingRig mode={mode} />

      <mesh position={[0, -0.52, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7.2, 80]} />
        <meshStandardMaterial color="#082a74" emissive="#082a74" emissiveIntensity={0.12} roughness={1} />
      </mesh>

      <HomeOrb mode={mode} onEnterSky={goSky} onEnterGround={goGround} />
      <AvatarFigure visible={mode === "home"} />

      <GroundWorld
        mode={mode}
        onSelectObject={selectObject}
        selectedObject={selectedObject}
        onReturnHome={goHome}
      />

      {(mode === "lifemap" || mode === "focus" || mode === "replay") && (
        <group>
          <Starfield
            mode={mode}
            selectedStarId={selectedStar}
            onSelectStar={selectStar}
            stars={stars}
            groupRef={starfieldGroupRef}
          />

          {selectedStarPosition && (mode === "focus" || mode === "replay") ? (
            <mesh position={selectedStarPosition}>
              <sphereGeometry args={[0.85, 28, 28]} />
              <meshBasicMaterial color="#86cfff" transparent opacity={mode === "focus" ? 0.14 : 0.06} />
            </mesh>
          ) : null}
        </group>
      )}

      {mode === "focus" && selectedStarPosition ? (
        <>
          <mesh
            ref={replayHoveredRef}
            position={[selectedStarPosition[0], selectedStarPosition[1] - 1.25, selectedStarPosition[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerOver={(event) => {
              event.stopPropagation();
              setReplayHovered(true);
              if (typeof document !== "undefined") document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setReplayHovered(false);
              if (typeof document !== "undefined") document.body.style.cursor = "default";
            }}
            onClick={(event) => {
              event.stopPropagation();
              enterReplay();
            }}
          >
            <ringGeometry args={[0.48, 0.84, 40]} />
            <meshBasicMaterial color="#71b8ff" transparent opacity={0.14} depthWrite={false} />
          </mesh>

          <mesh
            ref={backFromFocusRef}
            position={[
              selectedStarPosition[0] - 1.55,
              selectedStarPosition[1] + 0.1,
              selectedStarPosition[2] + 0.35,
            ]}
            rotation={[0, 0.1, 0]}
            onPointerOver={(event) => {
              event.stopPropagation();
              setFocusBackHovered(true);
              if (typeof document !== "undefined") document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setFocusBackHovered(false);
              if (typeof document !== "undefined") document.body.style.cursor = "default";
            }}
            onClick={(event) => {
              event.stopPropagation();
              useSceneStore.getState().setMode("lifemap");
            }}
          >
            <planeGeometry args={[0.8, 0.8]} />
            <meshBasicMaterial color="#3f7be0" transparent opacity={0.11} depthWrite={false} />
          </mesh>
        </>
      ) : null}

      <ReplayCore visible={mode === "replay"} />

      {mode === "replay" ? (
        <mesh
          ref={backFromReplayRef}
          position={[-1.45, 0, 0.25]}
          onPointerOver={(event) => {
            event.stopPropagation();
            setReplayBackHovered(true);
            if (typeof document !== "undefined") document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setReplayBackHovered(false);
            if (typeof document !== "undefined") document.body.style.cursor = "default";
          }}
          onClick={(event) => {
            event.stopPropagation();
            exitReplay();
          }}
        >
          <planeGeometry args={[0.9, 0.9]} />
          <meshBasicMaterial color="#4b87ec" transparent opacity={0.11} depthWrite={false} />
        </mesh>
      ) : null}

      {mode === "object" && selectedObjectPosition ? (
        <mesh
          position={[selectedObjectPosition[0], selectedObjectPosition[1] - 0.45, selectedObjectPosition[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(event) => {
            event.stopPropagation();
            exitObject();
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            if (typeof document !== "undefined") document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            if (typeof document !== "undefined") document.body.style.cursor = "default";
          }}
        >
          <ringGeometry args={[0.55, 0.92, 32]} />
          <meshBasicMaterial color="#6ea9f8" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      ) : null}
    </>
  );
}

export default function SpatialScene(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const mode = useSceneStore((s) => s.mode);

  useGestures(containerRef, mode);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, rgba(6,18,50,1) 0%, rgba(8,22,56,0.98) 22%, rgba(10,24,62,0.88) 45%, rgba(6,15,40,0.96) 60%, rgba(2,8,20,1) 100%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 72%, rgba(52,90,180,0.34), rgba(10,16,40,0.03) 35%, rgba(4,8,20,0.0) 55%), linear-gradient(180deg, rgba(96,150,255,0.16) 0%, rgba(18,32,68,0.0) 28%, rgba(0,0,0,0.0) 62%, rgba(2,8,22,0.42) 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.0) 24%, rgba(0,0,0,0.0) 72%, rgba(0,0,0,0.34) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [1.35, 1.04, 6.15], fov: 44, near: 0.1, far: 120 }}
        style={{ position: "relative", zIndex: 1 }}
      >
        <CameraRig />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
