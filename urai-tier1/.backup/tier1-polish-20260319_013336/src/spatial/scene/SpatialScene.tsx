"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Starfield from "./Starfield";
import { useSceneStore, type SceneMode } from "../store/useSceneStore";
import { bezier3, clamp01, easeInOutCubic, lerpVec3, makeArcControlPoint } from "../lib/cinematic";
import { getStarPosition } from "./starData";

type ObjectDatum = {
  id: string;
  kind: "stone" | "spire" | "lantern";
  position: THREE.Vector3;
  scale: number;
};

const OBJECTS: ObjectDatum[] = [
  {
    id: "artifact_stone",
    kind: "stone",
    position: new THREE.Vector3(-4.3, 0.5, -9.2),
    scale: 1.45,
  },
  {
    id: "artifact_spire",
    kind: "spire",
    position: new THREE.Vector3(4.9, 1.15, -10.8),
    scale: 1.28,
  },
  {
    id: "artifact_lantern",
    kind: "lantern",
    position: new THREE.Vector3(0.1, 1.45, -14.4),
    scale: 1.1,
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
      position: new THREE.Vector3(-2.8, 2.6, 11.6),
      lookAt: new THREE.Vector3(1.2, 2.3, -7.8),
      duration: 1.35,
      arc: "soft",
    };
  }

  if (mode === "ground") {
    return {
      position: new THREE.Vector3(-1.6, 1.95, 8.6),
      lookAt: new THREE.Vector3(0.2, 1.25, -11.2),
      duration: 1.25,
      arc: "down",
    };
  }

  if (mode === "lifemap") {
    return {
      position: new THREE.Vector3(0.2, 10.4, 8.5),
      lookAt: new THREE.Vector3(0, 11.6, -46),
      duration: 1.5,
      arc: "up",
    };
  }

  if (mode === "focusStar") {
    const star = getStarPosition(selectedStar) ?? new THREE.Vector3(0, 11, -34);
    return {
      position: star.clone().add(new THREE.Vector3(1.7, 0.65, 2.6)),
      lookAt: star.clone().add(new THREE.Vector3(0.0, 0.05, 0)),
      duration: 0.95,
      arc: "forward",
    };
  }

  if (mode === "replay") {
    const star = getStarPosition(selectedStar) ?? new THREE.Vector3(0, 11, -34);
    return {
      position: star.clone().add(new THREE.Vector3(0, 0.08, 1.65)),
      lookAt: star.clone().add(new THREE.Vector3(0, 0.03, -0.45)),
      duration: 0.9,
      arc: "soft",
    };
  }

  const object = getObjectById(selectedObject) ?? OBJECTS[0];
  const radius = Math.max(2.25, object.scale * 2.45);
  return {
    position: object.position.clone().add(new THREE.Vector3(radius * 0.78, 1.05, radius * 1.22)),
    lookAt: object.position.clone().add(new THREE.Vector3(0, 0.42, 0)),
    duration: 0.95,
    arc: "forward",
  };
}

function GroundPath() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -14]}>
        <circleGeometry args={[90, 96]} />
        <meshStandardMaterial color="#0d1323" roughness={1} metalness={0} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -12]}>
        <planeGeometry args={[8.5, 26]} />
        <meshStandardMaterial color="#2a1e1c" roughness={1} metalness={0} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, -12]}>
        <planeGeometry args={[5.6, 22]} />
        <meshStandardMaterial color="#3a2a24" roughness={1} metalness={0} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, -13]}>
        <ringGeometry args={[10, 15.8, 96, 1, Math.PI * 0.07, Math.PI * 0.86]} />
        <meshBasicMaterial color="#5f442e" transparent opacity={0.14} />
      </mesh>
    </group>
  );
}

function HorizonStack({ worldFade }: { worldFade: number }) {
  return (
    <group>
      <mesh position={[0, 22, -72]} scale={[180, 80, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#0b1223" transparent opacity={0.98} depthWrite={false} />
      </mesh>

      <mesh position={[0, 9, -68]} scale={[180, 18, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#3f2a37" transparent opacity={0.52 * worldFade} depthWrite={false} />
      </mesh>

      <mesh position={[0, 5.1, -66]} scale={[180, 7, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffb37b" transparent opacity={0.42 * worldFade} depthWrite={false} />
      </mesh>

      <mesh position={[0, 4.2, -66]} scale={[180, 2.6, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffe3b4" transparent opacity={0.3 * worldFade} depthWrite={false} />
      </mesh>

      <mesh position={[-22, 6.2, -55]} scale={[24, 9, 8]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#141825" transparent opacity={0.95 * worldFade} />
      </mesh>

      <mesh position={[22, 6.7, -56]} scale={[28, 11, 8]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#141926" transparent opacity={0.95 * worldFade} />
      </mesh>

      <mesh position={[0, 6.1, -60]} scale={[38, 7, 6]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#171b2a" transparent opacity={0.72 * worldFade} />
      </mesh>
    </group>
  );
}

function Atmosphere({ worldFade, lifemapFade }: { worldFade: number; lifemapFade: number }) {
  return (
    <>
      <mesh position={[0, 18, -54]} scale={[190, 90, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#091120" transparent opacity={0.78 + lifemapFade * 0.18} depthWrite={false} />
      </mesh>

      <mesh position={[0, 10, -48]} scale={[190, 22, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#1f2840" transparent opacity={(0.18 * worldFade) + (0.1 * lifemapFade)} depthWrite={false} />
      </mesh>

      <mesh position={[0, 2.1, -30]} scale={[160, 18, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#0a0d14" transparent opacity={0.42 * worldFade} depthWrite={false} />
      </mesh>
    </>
  );
}

function HomeFigure() {
  return (
    <group position={[-4.8, 0.05, -5.8]}>
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.54, 2.7, 14]} />
        <meshStandardMaterial color="#090b11" roughness={0.98} />
      </mesh>
      <mesh position={[0, 3.35, 0]}>
        <sphereGeometry args={[0.5, 20, 20]} />
        <meshStandardMaterial color="#07090f" roughness={0.98} />
      </mesh>
      <mesh position={[0.34, 1.8, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.18, 1.15, 0.18]} />
        <meshStandardMaterial color="#080a10" roughness={1} />
      </mesh>
      <mesh position={[-0.34, 1.8, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.18, 1.15, 0.18]} />
        <meshStandardMaterial color="#080a10" roughness={1} />
      </mesh>
      <mesh position={[0.18, 0.45, 0]}>
        <boxGeometry args={[0.2, 1.1, 0.2]} />
        <meshStandardMaterial color="#080a10" roughness={1} />
      </mesh>
      <mesh position={[-0.16, 0.45, 0]}>
        <boxGeometry args={[0.2, 1.1, 0.2]} />
        <meshStandardMaterial color="#080a10" roughness={1} />
      </mesh>
    </group>
  );
}

function ObjectMesh({
  obj,
  mode,
  selected,
  transitionLock,
  onSelect,
  onExit,
}: {
  obj: ObjectDatum;
  mode: SceneMode;
  selected: boolean;
  transitionLock: boolean;
  onSelect: (id: string) => void;
  onExit: () => void;
}) {
  const opacity = mode === "home" ? 0.18 : mode === "ground" ? 1 : mode === "objectFocus" ? 0.95 : 0.08;
  const emissive = selected ? 0.28 : mode === "ground" ? 0.12 : 0.05;
  const canInteract = mode === "ground" || (mode === "objectFocus" && selected);

  return (
    <group position={obj.position}>
      {obj.kind === "stone" && (
        <group
          onClick={(e) => {
            if (!canInteract || transitionLock) return;
            e.stopPropagation();
            if (mode === "ground") onSelect(obj.id);
            else onExit();
          }}
          onPointerOver={() => {
            if (mode === "ground" && !transitionLock) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <mesh scale={[1.8 * obj.scale, 1.0 * obj.scale, 1.35 * obj.scale]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color="#4d4b52"
              emissive="#c7a275"
              emissiveIntensity={emissive}
              transparent
              opacity={opacity}
              roughness={0.96}
            />
          </mesh>
          <mesh position={[0, -0.62 * obj.scale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2 * obj.scale, 1.6 * obj.scale, 48]} />
            <meshBasicMaterial color="#f0bc79" transparent opacity={0.11 * opacity} />
          </mesh>
        </group>
      )}

      {obj.kind === "spire" && (
        <group
          onClick={(e) => {
            if (!canInteract || transitionLock) return;
            e.stopPropagation();
            if (mode === "ground") onSelect(obj.id);
            else onExit();
          }}
          onPointerOver={() => {
            if (mode === "ground" && !transitionLock) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <mesh scale={[1.0 * obj.scale, 2.4 * obj.scale, 1.0 * obj.scale]}>
            <coneGeometry args={[0.82, 1.8, 10]} />
            <meshStandardMaterial
              color="#67606b"
              emissive="#dfb08b"
              emissiveIntensity={emissive}
              transparent
              opacity={opacity}
              roughness={0.88}
            />
          </mesh>
          <mesh position={[0, 0.68 * obj.scale, 0]} scale={[0.4, 0.4, 0.4]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color="#ffcc93" transparent opacity={0.12 * opacity} />
          </mesh>
        </group>
      )}

      {obj.kind === "lantern" && (
        <group
          onClick={(e) => {
            if (!canInteract || transitionLock) return;
            e.stopPropagation();
            if (mode === "ground") onSelect(obj.id);
            else onExit();
          }}
          onPointerOver={() => {
            if (mode === "ground" && !transitionLock) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        >
          <mesh position={[0, 0.8 * obj.scale, 0]}>
            <boxGeometry args={[0.55, 0.78, 0.55]} />
            <meshStandardMaterial
              color="#3b312d"
              emissive="#ffcc89"
              emissiveIntensity={selected ? 0.8 : 0.45}
              transparent
              opacity={opacity}
              roughness={0.52}
            />
          </mesh>
          <mesh position={[0, 0.8 * obj.scale, 0]} scale={[1.7, 1.7, 1.7]}>
            <sphereGeometry args={[0.42, 16, 16]} />
            <meshBasicMaterial color="#ffbe6d" transparent opacity={0.11 * opacity} />
          </mesh>
        </group>
      )}
    </group>
  );
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

  const lookAtRef = useRef(new THREE.Vector3(1.2, 2.3, -7.8));
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
    scene.fog = new THREE.Fog("#08101d", 18, 160);
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
        pos.x += Math.sin(idleTime * 0.18) * 0.08;
        pos.y += Math.sin(idleTime * 0.16) * 0.03;
        look.x += Math.sin(idleTime * 0.14) * 0.04;
      } else if (mode === "ground") {
        pos.x += Math.sin(idleTime * 0.12) * 0.05;
        pos.y += Math.sin(idleTime * 0.1) * 0.02;
      } else if (mode === "lifemap") {
        pos.x += Math.sin(idleTime * 0.1) * 0.16;
        pos.y += Math.sin(idleTime * 0.08) * 0.08;
        look.x += Math.sin(idleTime * 0.12) * 0.09;
      }

      const nextPos = lerpVec3(camera.position, pos, 0.04);
      const nextLook = lerpVec3(lookAtRef.current, look, 0.04);
      camera.position.copy(nextPos);
      camera.lookAt(nextLook);
      lookAtRef.current.copy(nextLook);
    }

    const isLifemap = mode === "lifemap" || mode === "focusStar" || mode === "replay";
    scene.background = new THREE.Color(isLifemap ? "#050913" : "#0d1320");
    if (scene.fog) {
      (scene.fog as THREE.Fog).color = new THREE.Color(isLifemap ? "#07101c" : "#0f1622");
      (scene.fog as THREE.Fog).near = isLifemap ? 24 : 18;
      (scene.fog as THREE.Fog).far = isLifemap ? 180 : 105;
    }
  });

  const worldFade = mode === "lifemap" || mode === "focusStar" || mode === "replay" ? 0.12 : 1;
  const lifemapFade = mode === "lifemap" || mode === "focusStar" || mode === "replay" ? 1 : 0.08;

  const selectedStarPos = getStarPosition(selectedStar);
  const selectedObjectData = getObjectById(selectedObject);

  return (
    <>
      <ambientLight intensity={0.2} />
      <hemisphereLight args={["#243553", "#0a0910", 0.34]} />
      <directionalLight position={[0, 7, -50]} intensity={2.0} color="#ffddb0" />
      <directionalLight position={[-18, 16, 12]} intensity={0.42} color="#8099c8" />
      <pointLight position={[1.2, 4.8, -24]} intensity={1.25 * worldFade} distance={58} color="#ffb779" />
      <pointLight position={[0, 12, -34]} intensity={0.2 + (lifemapFade * 0.35)} distance={160} color="#88aafc" />

      <Atmosphere worldFade={worldFade} lifemapFade={lifemapFade} />
      <HorizonStack worldFade={worldFade} />

      <group visible={worldFade > 0.02}>
        <GroundPath />

        <mesh position={[0, 0.65, -13.2]} scale={[30, 0.8, 18]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#11161c" transparent opacity={0.34 * worldFade} roughness={1} />
        </mesh>

        <mesh position={[0, 1.6, -20]} scale={[44, 5.5, 18]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#161b27" transparent opacity={0.18 * worldFade} />
        </mesh>

        <mesh position={[-12, 4.2, -22]} scale={[8, 12, 4]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#10141d" transparent opacity={0.42 * worldFade} />
        </mesh>

        <mesh position={[12, 4.5, -23]} scale={[9, 12, 4]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#10141d" transparent opacity={0.42 * worldFade} />
        </mesh>

        <mesh position={[-7.5, 0.4, -8.2]}>
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshBasicMaterial color="#ffbe74" transparent opacity={0.72 * worldFade} />
        </mesh>
        <mesh position={[7.8, 0.42, -9.5]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <meshBasicMaterial color="#ffbe74" transparent opacity={0.62 * worldFade} />
        </mesh>
        <mesh position={[0.2, 0.42, -13.7]}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshBasicMaterial color="#ffbe74" transparent opacity={0.45 * worldFade} />
        </mesh>
      </group>

      <group visible={mode === "home"}>
        <HomeFigure />

        <mesh
          position={[1.35, 2.65, -8.2]}
          scale={[1, 1, 1]}
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
          <sphereGeometry args={[1.7, 36, 36]} />
          <meshStandardMaterial
            color="#fff5eb"
            emissive="#ffd3aa"
            emissiveIntensity={1.15}
            roughness={0.1}
            metalness={0.02}
          />
        </mesh>

        <mesh position={[1.35, 2.65, -8.2]} scale={[2.9, 2.9, 2.9]}>
          <sphereGeometry args={[1, 26, 26]} />
          <meshBasicMaterial color="#ffd7b0" transparent opacity={0.16} depthWrite={false} />
        </mesh>

        <mesh position={[1.35, 2.65, -8.2]} scale={[4.8, 4.8, 4.8]}>
          <sphereGeometry args={[1, 22, 22]} />
          <meshBasicMaterial color="#ffca97" transparent opacity={0.04} depthWrite={false} />
        </mesh>

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.04, -12]}
          onClick={(e) => {
            e.stopPropagation();
            if (!transitionLock) goGround();
          }}
        >
          <circleGeometry args={[12.5, 72]} />
          <meshBasicMaterial color="#0d2f71" transparent opacity={0.01} />
        </mesh>
      </group>

      <group visible={mode !== "lifemap" && mode !== "focusStar" && mode !== "replay"}>
        {OBJECTS.map((obj) => (
          <ObjectMesh
            key={obj.id}
            obj={obj}
            mode={mode}
            selected={selectedObject === obj.id}
            transitionLock={transitionLock}
            onSelect={selectObject}
            onExit={exitObject}
          />
        ))}
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
            <sphereGeometry args={[0.82, 28, 28]} />
            <meshStandardMaterial
              color="#fff6e1"
              emissive="#ffd69a"
              emissiveIntensity={0.92}
              transparent
              opacity={0.98}
              roughness={0.08}
            />
          </mesh>
          <mesh scale={[2.3, 2.3, 2.3]}>
            <sphereGeometry args={[1, 20, 20]} />
            <meshBasicMaterial color="#ffce91" transparent opacity={0.11} depthWrite={false} />
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
            <sphereGeometry args={[1.3, 34, 34]} />
            <meshStandardMaterial
              color="#dce9ff"
              emissive="#9fc6ff"
              emissiveIntensity={0.7}
              transparent
              opacity={0.18}
              roughness={0.02}
              metalness={0.12}
            />
          </mesh>
          <mesh scale={[2.4, 2.4, 2.4]}>
            <sphereGeometry args={[1, 26, 26]} />
            <meshBasicMaterial color="#8eb9ff" transparent opacity={0.1} depthWrite={false} />
          </mesh>
          <mesh scale={[3.4, 3.4, 3.4]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial color="#7caaf6" transparent opacity={0.035} depthWrite={false} />
          </mesh>
          <mesh position={[0, -1.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.15, 1.5, 48]} />
            <meshBasicMaterial color="#bfd8ff" transparent opacity={0.18} />
          </mesh>
        </group>
      )}

      {mode === "objectFocus" && selectedObjectData && (
        <mesh
          position={selectedObjectData.position.clone().add(new THREE.Vector3(0, -0.72, 0))}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[1.5 * selectedObjectData.scale, 1.86 * selectedObjectData.scale, 48]} />
          <meshBasicMaterial color="#ffca8e" transparent opacity={0.16} />
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
    return <div style={{ width: "100%", height: "100%", background: "#0d1320" }} />;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        background: mode === "lifemap" || mode === "focusStar" || mode === "replay" ? "#050913" : "#0d1320",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [-2.8, 2.6, 11.6], fov: 44, near: 0.1, far: 260 }}
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
