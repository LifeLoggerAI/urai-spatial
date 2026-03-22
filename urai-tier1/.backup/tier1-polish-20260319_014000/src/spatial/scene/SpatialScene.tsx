"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import Starfield from "./Starfield";
import { useSceneStore, type SceneMode } from "../store/useSceneStore";
import {
  bezier3,
  clamp01,
  easeInOutCubic,
  lerpVec3,
  makeArcControlPoint,
} from "../lib/cinematic";
import { getStarPosition } from "./starData";

type ObjectDatum = {
  id: string;
  kind: "cube" | "cone" | "orb";
  position: THREE.Vector3;
  scale: number;
};

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function SceneBreath() {
  const { camera } = useThree();
  const basePos = useRef(new THREE.Vector3());
  const init = useRef(false);

  useEffect(() => {
    if (!init.current) {
      basePos.current.copy(camera.position);
      init.current = true;
    }
  }, [camera]);

  useFrame((state, dt) => {
    if (!init.current) return;
    const t = state.clock.getElapsedTime();
    const targetX = basePos.current.x + Math.sin(t * 0.22) * 0.08;
    const targetY = basePos.current.y + Math.cos(t * 0.18) * 0.05;
    const targetZ = basePos.current.z + Math.sin(t * 0.14) * 0.06;
    camera.position.x = damp(camera.position.x, targetX, 1.8, dt);
    camera.position.y = damp(camera.position.y, targetY, 1.8, dt);
    camera.position.z = damp(camera.position.z, targetZ, 1.4, dt);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function HomeFocalHierarchy() {
  return (
    <group>
      <pointLight position={[0, 1.35, 0.8]} intensity={1.6} distance={8} color="#cfe0ff" />
      <pointLight position={[0, 0.8, 0.2]} intensity={0.95} distance={4.5} color="#9db7ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.18, 0]} renderOrder={2}>
        <circleGeometry args={[1.15, 48]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.17, 0]} renderOrder={1}>
        <ringGeometry args={[0.55, 1.8, 64]} />
        <meshBasicMaterial color="#6e88ff" transparent opacity={0.065} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GroundSilhouettes() {
  return (
    <group position={[0, -1.05, -2.6]}>
      <mesh position={[-3.6, 0.8, -2.5]} rotation={[0.03, 0.26, 0]}>
        <boxGeometry args={[2.2, 1.9, 1.0]} />
        <meshStandardMaterial color="#1a2334" transparent opacity={0.10} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[3.9, 1.0, -3.0]} rotation={[0.02, -0.22, 0]}>
        <boxGeometry args={[2.9, 2.4, 1.2]} />
        <meshStandardMaterial color="#182031" transparent opacity={0.085} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0.3, 0.45, -1.9]} rotation={[0.08, 0, 0]}>
        <cylinderGeometry args={[3.6, 4.5, 0.7, 24]} />
        <meshStandardMaterial color="#151d2c" transparent opacity={0.12} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[-1.4, 0.55, 0.6]} rotation={[0, 0.45, 0]}>
        <boxGeometry args={[0.5, 1.1, 0.5]} />
        <meshStandardMaterial color="#23304a" transparent opacity={0.12} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[2.0, 0.42, 0.35]} rotation={[0, -0.35, 0]}>
        <boxGeometry args={[0.9, 0.7, 0.9]} />
        <meshStandardMaterial color="#222d44" transparent opacity={0.11} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

function DepthFog() {
  return <fog attach="fog" args={["#08111f", 10, 86]} />;
}

const OBJECTS: ObjectDatum[] = [
  {
    id: "artifact_cube",
    kind: "cube",
    position: new THREE.Vector3(-4.2, 0.95, -5.4),
    scale: 1.25,
  },
  {
    id: "artifact_cone",
    kind: "cone",
    position: new THREE.Vector3(4.7, 1.35, -6.1),
    scale: 1.45,
  },
  {
    id: "artifact_orb",
    kind: "orb",
    position: new THREE.Vector3(0, 4.15, -9.2),
    scale: 1.75,
  },
];

type CameraPose = {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  duration: number;
  arc: "up" | "down" | "forward" | "soft";
};

function getObjectById(id: string | null): ObjectDatum | null {
  return OBJECTS.find((o) => o.id === id) ?? null;
}

function getPoseForMode(
  mode: SceneMode,
  selectedStar: string | null,
  selectedObject: string | null,
): CameraPose {
  if (mode === "home") {
    return {
      position: new THREE.Vector3(0, 2.95, 11.2),
      lookAt: new THREE.Vector3(0, 1.65, -1.6),
      duration: 1.3,
      arc: "soft",
    };
  }

  if (mode === "ground") {
    return {
      position: new THREE.Vector3(0, 2.1, 8.35),
      lookAt: new THREE.Vector3(0, 1.25, -6.4),
      duration: 1.25,
      arc: "down",
    };
  }

  if (mode === "lifemap") {
    return {
      position: new THREE.Vector3(0, 8.9, 8.2),
      lookAt: new THREE.Vector3(0, 7.2, -30),
      duration: 1.45,
      arc: "up",
    };
  }

  if (mode === "focusStar") {
    const star = getStarPosition(selectedStar) ?? new THREE.Vector3(0, 8, -22);
    return {
      position: star.clone().add(new THREE.Vector3(2.1, 0.95, 2.85)),
      lookAt: star.clone().add(new THREE.Vector3(0, 0.15, 0)),
      duration: 0.95,
      arc: "forward",
    };
  }

  if (mode === "replay") {
    const star = getStarPosition(selectedStar) ?? new THREE.Vector3(0, 8, -22);
    return {
      position: star.clone().add(new THREE.Vector3(0, 0.04, 1.85)),
      lookAt: star.clone().add(new THREE.Vector3(0, 0.02, 0)),
      duration: 0.9,
      arc: "soft",
    };
  }

  const object = getObjectById(selectedObject) ?? OBJECTS[0];
  const radius = Math.max(1.25, object.scale * 1.85);
  return {
    position: object.position.clone().add(new THREE.Vector3(radius, 0.95, radius * 1.12)),
    lookAt: object.position.clone().add(new THREE.Vector3(0, 0.25, 0)),
    duration: 0.95,
    arc: "forward",
  };
}

function SceneContent() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const selectedObject = useSceneStore((s) => s.selectedObject);
  const transitionLock = useSceneStore((s) => s.transitionLock);

  const setTransitionLock = useSceneStore((s) => s.setTransitionLock);
  const goGround = useSceneStore((s) => s.goGround);
  const goLifemap = useSceneStore((s) => s.goLifemap);
  const goHome = useSceneStore((s) => s.goHome);
  const selectStar = useSceneStore((s) => s.selectStar);
  const enterReplay = useSceneStore((s) => s.enterReplay);
  const exitReplay = useSceneStore((s) => s.exitReplay);
  const selectObject = useSceneStore((s) => s.selectObject);
  const exitObject = useSceneStore((s) => s.exitObject);

  const { camera, scene, clock } = useThree();

  const lookAtRef = useRef(new THREE.Vector3(0, 1.65, -1.6));
  const transitionRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    fromPos: THREE.Vector3;
    fromLook: THREE.Vector3;
    controlPos: THREE.Vector3;
    controlLook: THREE.Vector3;
    toPos: THREE.Vector3;
    toLook: THREE.Vector3;
  }>({
    active: false,
    startTime: 0,
    duration: 1,
    fromPos: new THREE.Vector3(),
    fromLook: new THREE.Vector3(),
    controlPos: new THREE.Vector3(),
    controlLook: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    toLook: new THREE.Vector3(),
  });

  const lastSignatureRef = useRef<string>("");

  useEffect(() => {
    scene.fog = new THREE.Fog("#071220", 14, 150);
  }, [scene]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (transitionLock) return;

      if (mode === "lifemap" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        goHome();
        return;
      }

      if (mode === "replay" && (e.key === "Escape" || e.key === "Backspace")) {
        exitReplay();
        return;
      }

      if (mode === "objectFocus" && (e.key === "Escape" || e.key === "Backspace")) {
        exitObject();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, transitionLock, goHome, exitReplay, exitObject]);

  useFrame(() => {
    const pose = getPoseForMode(mode, selectedStar, selectedObject);
    const signature = `${mode}|${selectedStar ?? ""}|${selectedObject ?? ""}`;

    if (lastSignatureRef.current !== signature) {
      transitionRef.current.active = true;
      transitionRef.current.startTime = clock.getElapsedTime();
      transitionRef.current.duration = pose.duration;
      transitionRef.current.fromPos = camera.position.clone();
      transitionRef.current.fromLook = lookAtRef.current.clone();
      transitionRef.current.toPos = pose.position.clone();
      transitionRef.current.toLook = pose.lookAt.clone();
      transitionRef.current.controlPos = makeArcControlPoint(
        transitionRef.current.fromPos,
        transitionRef.current.toPos,
        pose.arc,
      );
      transitionRef.current.controlLook = makeArcControlPoint(
        transitionRef.current.fromLook,
        transitionRef.current.toLook,
        "soft",
      );
      setTransitionLock(true);
      lastSignatureRef.current = signature;
    }

    if (transitionRef.current.active) {
      const elapsed = clock.getElapsedTime() - transitionRef.current.startTime;
      const t = clamp01(elapsed / transitionRef.current.duration);
      const e = easeInOutCubic(t);

      const nextPos = bezier3(
        transitionRef.current.fromPos,
        transitionRef.current.controlPos,
        transitionRef.current.toPos,
        e,
      );
      const nextLook = bezier3(
        transitionRef.current.fromLook,
        transitionRef.current.controlLook,
        transitionRef.current.toLook,
        e,
      );

      camera.position.copy(nextPos);
      camera.lookAt(nextLook);
      lookAtRef.current.copy(nextLook);

      if (t >= 1) {
        transitionRef.current.active = false;
        setTransitionLock(false);
      }
    } else {
      const idleBase = getPoseForMode(mode, selectedStar, selectedObject);
      const idleTime = clock.getElapsedTime();

      const pos = idleBase.position.clone();
      const look = idleBase.lookAt.clone();

      if (mode === "home") {
        pos.x += Math.sin(idleTime * 0.28) * 0.12;
        pos.y += Math.sin(idleTime * 0.22) * 0.04;
        look.x += Math.sin(idleTime * 0.24) * 0.06;
      } else if (mode === "ground") {
        pos.x += Math.sin(idleTime * 0.2) * 0.08;
        pos.y += Math.sin(idleTime * 0.17) * 0.03;
      } else if (mode === "lifemap") {
        pos.x += Math.sin(idleTime * 0.14) * 0.18;
        pos.y += Math.sin(idleTime * 0.12) * 0.1;
        look.x += Math.sin(idleTime * 0.16) * 0.12;
      }

      const nextPos = lerpVec3(camera.position, pos, 0.04);
      const nextLook = lerpVec3(lookAtRef.current, look, 0.04);
      camera.position.copy(nextPos);
      camera.lookAt(nextLook);
      lookAtRef.current.copy(nextLook);
    }

    const isLifemap = mode === "lifemap" || mode === "focusStar" || mode === "replay";
    const bg = new THREE.Color(isLifemap ? "#030816" : mode === "ground" || mode === "objectFocus" ? "#244e9c" : "#5f90df");
    scene.background = bg;
    if (scene.fog) {
      (scene.fog as THREE.Fog).color = new THREE.Color(isLifemap ? "#06101e" : "#1d4f98");
      (scene.fog as THREE.Fog).near = isLifemap ? 26 : 18;
      (scene.fog as THREE.Fog).far = isLifemap ? 170 : 95;
    }
  });

  const worldOpacity =
    mode === "lifemap" || mode === "focusStar" || mode === "replay" ? 0.1 : 1;

  const latentObjectOpacity = mode === "home" ? 0.14 : mode === "ground" ? 0.92 : mode === "objectFocus" ? 0.8 : 0.12;

  const portalPulse = 1 + Math.sin(clock.getElapsedTime() * 1.3) * 0.04;

  const selectedStarPos = getStarPosition(selectedStar);
  const selectedObjectData = getObjectById(selectedObject);

  return (
    <>
      <DepthFog />
      <SceneBreath />
      <HomeFocalHierarchy />
      <GroundSilhouettes />
<ambientLight intensity={0.9} />
      <hemisphereLight args={["#bcd4ff", "#10213b", 0.9]} />
      <directionalLight position={[-8, 12, 6]} intensity={1.35} color="#fff8ea" />
      <directionalLight position={[9, 5, 10]} intensity={0.55} color="#88b6ff" />

      <group visible={worldOpacity > 0.02}>
        <mesh position={[0, 18, -22]} scale={[120, 60, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#7aa8f0" transparent opacity={0.32 * worldOpacity} />
        </mesh>

        <mesh position={[0, 7.5, -18]} scale={[120, 22, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#4b76c6" transparent opacity={0.2 * worldOpacity} />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -14]}>
          <circleGeometry args={[82, 96]} />
          <meshStandardMaterial color="#103f92" transparent opacity={0.98 * worldOpacity} />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -14]}>
          <ringGeometry args={[22, 25, 96]} />
          <meshBasicMaterial color="#4879d8" transparent opacity={0.78 * worldOpacity} />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, -14]}>
          <ringGeometry args={[41, 44, 96]} />
          <meshBasicMaterial color="#2b5fbe" transparent opacity={0.46 * worldOpacity} />
        </mesh>

        <mesh position={[0, -24, -18]}>
          <sphereGeometry args={[80, 48, 48]} />
          <meshBasicMaterial color="#0a2b6f" side={THREE.BackSide} transparent opacity={0.55 * worldOpacity} />
        </mesh>
      </group>

      <group visible={mode === "home"}>
        <mesh
          position={[0, 8.1, -16]}
          scale={[2.6 * portalPulse, 2.6 * portalPulse, 2.6 * portalPulse]}
          onClick={(e) => {
            e.stopPropagation();
            if (!transitionLock) goLifemap();
          }}
          onPointerOver={() => {
            if (!transitionLock) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <sphereGeometry args={[1, 20, 20]} />
          <meshStandardMaterial
            color="#d9e8ff"
            emissive="#8fbcff"
            emissiveIntensity={0.55}
            transparent
            opacity={0.72}
          />
        </mesh>

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.04, -8]}
          onClick={(e) => {
            e.stopPropagation();
            if (!transitionLock) goGround();
          }}
        >
          <circleGeometry args={[14, 72]} />
          <meshBasicMaterial color="#0d2f71" transparent opacity={0.01} />
        </mesh>

        <mesh position={[-2.05, 1.18, -1.1]}>
          <sphereGeometry args={[1.28, 32, 32]} />
          <meshStandardMaterial
            color="#dbe6f7"
            emissive="#f5fbff"
            emissiveIntensity={0.16}
            roughness={0.24}
            metalness={0.02}
          />
        </mesh>

        <group position={[2.2, 0.05, -1.1]}>
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[0.66, 0.66, 2.45, 24]} />
            <meshStandardMaterial color="#00184f" roughness={0.44} />
          </mesh>
          <mesh position={[0, 2.85, 0]}>
            <sphereGeometry args={[0.74, 24, 24]} />
            <meshStandardMaterial color="#00103e" roughness={0.46} />
          </mesh>
        </group>
      </group>

      <group visible={mode !== "lifemap" && mode !== "focusStar" && mode !== "replay"}>
        {OBJECTS.map((obj) => {
          const selected = selectedObject === obj.id;
          const isVisible = mode === "ground" || mode === "objectFocus" || mode === "home";
          const opacity = isVisible ? latentObjectOpacity : 0.05;
          const emissiveIntensity =
            mode === "ground"
              ? selected
                ? 0.35
                : 0.18
              : mode === "objectFocus"
                ? selected
                  ? 0.42
                  : 0.12
                : 0.06;

          return (
            <group key={obj.id} position={obj.position}>
              {obj.kind === "cube" ? (
                <mesh
                  scale={obj.scale}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode === "ground" && !transitionLock) selectObject(obj.id);
                    if (mode === "objectFocus" && selected && !transitionLock) exitObject();
                  }}
                  onPointerOver={() => {
                    if (mode === "ground" && !transitionLock) document.body.style.cursor = "pointer";
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = "default";
                  }}
                >
                  <boxGeometry args={[1.45, 1.45, 1.45]} />
                  <meshStandardMaterial
                    color="#95b6f1"
                    emissive="#cfe0ff"
                    emissiveIntensity={emissiveIntensity}
                    transparent
                    opacity={opacity}
                    roughness={0.38}
                  />
                </mesh>
              ) : obj.kind === "cone" ? (
                <mesh
                  scale={obj.scale}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode === "ground" && !transitionLock) selectObject(obj.id);
                    if (mode === "objectFocus" && selected && !transitionLock) exitObject();
                  }}
                  onPointerOver={() => {
                    if (mode === "ground" && !transitionLock) document.body.style.cursor = "pointer";
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = "default";
                  }}
                >
                  <coneGeometry args={[1.1, 2.4, 28]} />
                  <meshStandardMaterial
                    color="#8db8f4"
                    emissive="#d6e8ff"
                    emissiveIntensity={emissiveIntensity}
                    transparent
                    opacity={opacity}
                    roughness={0.34}
                  />
                </mesh>
              ) : (
                <group>
                  <mesh position={[0, 2.15, 0]} scale={[0.06, 2.65, 0.06]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#7da6ef" transparent opacity={opacity * 0.8} />
                  </mesh>
                  <mesh
                    scale={obj.scale}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (mode === "ground" && !transitionLock) selectObject(obj.id);
                      if (mode === "objectFocus" && selected && !transitionLock) exitObject();
                    }}
                    onPointerOver={() => {
                      if (mode === "ground" && !transitionLock) document.body.style.cursor = "pointer";
                    }}
                    onPointerOut={() => {
                      document.body.style.cursor = "default";
                    }}
                  >
                    <sphereGeometry args={[1, 32, 32]} />
                    <meshStandardMaterial
                      color="#e5b176"
                      emissive="#ffe2b8"
                      emissiveIntensity={emissiveIntensity}
                      transparent
                      opacity={opacity}
                      roughness={0.26}
                    />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}
      </group>

      <Starfield
        mode={mode}
        selectedStar={selectedStar}
        onSelectStar={(id) => {
          if (!transitionLock) selectStar(id);
        }}
      />

      {mode === "focusStar" && selectedStarPos && (
        <group position={selectedStarPos}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              if (!transitionLock) enterReplay();
            }}
            onPointerOver={() => {
              if (!transitionLock) document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
          >
            <sphereGeometry args={[0.92, 28, 28]} />
            <meshStandardMaterial
              color="#8bbcff"
              emissive="#dbeaff"
              emissiveIntensity={0.48}
              transparent
              opacity={0.96}
              roughness={0.18}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[1.45, 20, 20]} />
            <meshBasicMaterial color="#7bb1ff" transparent opacity={0.09} />
          </mesh>
        </group>
      )}

      {mode === "replay" && selectedStarPos && (
        <group position={selectedStarPos}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              if (!transitionLock) exitReplay();
            }}
            onPointerOver={() => {
              if (!transitionLock) document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
          >
            <sphereGeometry args={[1.22, 28, 28]} />
            <meshStandardMaterial
              color="#72aef7"
              emissive="#d8ebff"
              emissiveIntensity={0.42}
              transparent
              opacity={0.9}
              roughness={0.12}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[2.05, 24, 24]} />
            <meshBasicMaterial color="#5f9cf7" transparent opacity={0.08} />
          </mesh>
        </group>
      )}

      {mode === "objectFocus" && selectedObjectData && (
        <mesh position={selectedObjectData.position.clone().add(new THREE.Vector3(0, -0.75, 0))}>
          <ringGeometry args={[1.55 * selectedObjectData.scale, 1.82 * selectedObjectData.scale, 48]} />
          <meshBasicMaterial color="#89b7ff" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  );
}

export default function SpatialScene() {
  const mode = useSceneStore((s) => s.mode);
  const transitionLock = useSceneStore((s) => s.transitionLock);
  const goHome = useSceneStore((s) => s.goHome);

  const touchStartY = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const deltaY = endY - touchStartY.current;
    touchStartY.current = null;

    if (transitionLock) return;
    if (mode !== "lifemap") return;

    if (Math.abs(deltaY) > 52) {
      goHome();
    }
  };

  if (!mounted) {
    return <div style={{ width: "100%", height: "100%", background: "#5f90df" }} />;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        background: mode === "lifemap" || mode === "focusStar" || mode === "replay" ? "#030816" : "#5f90df",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.95, 11.2], fov: 44, near: 0.1, far: 250 }}
        onPointerMissed={() => {
          document.body.style.cursor = "default";
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
