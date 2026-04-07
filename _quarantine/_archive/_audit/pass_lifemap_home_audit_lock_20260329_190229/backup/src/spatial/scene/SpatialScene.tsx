"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Mode =
  | "home"
  | "toGround"
  | "ground"
  | "detail"
  | "toHomeFromGround"
  | "toLifemap"
  | "lifemap"
  | "focus"
  | "replay"
  | "toLifemapFromReplay"
  | "toHomeFromLifemap";

type GroundItem = "anchor" | "guitar" | "car";

type Star = {
  id: string;
  position: [number, number, number];
  size: number;
  color: string;
};

function makeStars(): Star[] {
  const rand = (() => {
    let t = 19830414;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  })();

  const stars: Star[] = [];
  for (let i = 0; i < 150; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = 6 + rand() * 24;
    const z = -8 - rand() * 26;
    const x = Math.cos(a) * r;
    const y = (rand() - 0.5) * 14;
    const size = 0.04 + rand() * 0.08;
    let color = "#dbe8ff";
    const pick = rand();
    if (pick > 0.8) color = "#ffe0b0";
    else if (pick > 0.6) color = "#cfe1ff";
    else if (pick > 0.5) color = "#f0e1ff";
    stars.push({ id: `star-${i}`, position: [x, y, z], size, color });
  }

  stars.push(
    { id: "memory-1", position: [-4.4, 2.2, -12], size: 0.22, color: "#fff2bf" },
    { id: "memory-2", position: [0, 0.5, -14], size: 0.26, color: "#d8e7ff" },
    { id: "memory-3", position: [4.7, -1.2, -12.4], size: 0.22, color: "#ffd8bf" }
  );

  return stars;
}

function dampOpacity(root: THREE.Object3D, target: number, lambda: number, delta: number) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const material = mesh.material;
    if (!material) return;

    const update = (mat: THREE.Material) => {
      const m = mat as THREE.Material & { opacity?: number; transparent?: boolean };
      if (typeof m.opacity === "number") {
        m.transparent = true;
        m.opacity = THREE.MathUtils.damp(m.opacity, target, lambda, delta);
      }
    };

    if (Array.isArray(material)) material.forEach(update);
    else update(material);
  });
}

function Overlay({
  mode,
  selectedItem,
}: {
  mode: Mode;
  selectedItem: GroundItem | null;
}) {
  const label =
    mode === "home" || mode === "toGround" || mode === "toHomeFromGround"
      ? mode === "home"
        ? "HOME"
        : "GROUND"
      : mode === "ground" || mode === "detail"
        ? "GROUND"
        : "LIFEMAP";

  let text = "";
  if (mode === "home") text = "Sky opens LifeMap. Ground opens world layer.";
  if (mode === "ground") text = "Select an object. Esc returns Home.";
  if (mode === "detail") {
    text =
      selectedItem === "anchor"
        ? "Home anchor selected. Esc returns."
        : selectedItem === "guitar"
          ? "Guitar selected. Esc returns."
          : "Car selected. Esc returns.";
  }
  if (mode === "lifemap") text = "Select a memory star. Esc returns Home.";
  if (mode === "replay") text = "Replay active. Esc returns to LifeMap.";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 20,
        color: "rgba(236,242,255,0.95)",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div>
        <div
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 999,
            background: "rgba(8,16,34,0.7)",
            border: "1px solid rgba(167,191,255,0.14)",
            fontSize: 14,
            letterSpacing: "0.18em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 12,
            maxWidth: 420,
            fontSize: 14,
            lineHeight: 1.45,
            color: "rgba(228,235,255,0.84)",
            textShadow: "0 2px 10px rgba(0,0,0,0.45)",
          }}
        >
          {text}
        </div>
      </div>

      <div
        style={{
          alignSelf: "flex-end",
          padding: "11px 15px",
          borderRadius: 18,
          background: "rgba(6,12,24,0.58)",
          border: "1px solid rgba(148,170,255,0.12)",
          fontSize: 13,
          color: "rgba(233,239,255,0.82)",
        }}
      >
        Esc
      </div>
    </div>
  );
}

function SceneRuntime({
  mode,
  setMode,
  selectedItem,
  setSelectedItem,
}: {
  mode: Mode;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  selectedItem: GroundItem | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<GroundItem | null>>;
}) {
  const { camera, scene } = useThree();

  const stars = useMemo(() => makeStars(), []);
  const homeActorsRef = useRef<THREE.Group>(null);
  const groundWorldRef = useRef<THREE.Group>(null);
  const starfieldRef = useRef<THREE.Group>(null);

  const [hoveredItem, setHoveredItem] = useState<GroundItem | null>(null);
  const [hoveredStar, setHoveredStar] = useState<string | null>(null);
  const [selectedStar, setSelectedStar] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | null = null;

    if (mode === "toGround") timer = window.setTimeout(() => setMode("ground"), 1000);
    if (mode === "toHomeFromGround") timer = window.setTimeout(() => setMode("home"), 1000);
    if (mode === "toLifemap") timer = window.setTimeout(() => setMode("lifemap"), 1400);
    if (mode === "focus") timer = window.setTimeout(() => setMode("replay"), 900);
    if (mode === "toLifemapFromReplay") timer = window.setTimeout(() => setMode("lifemap"), 850);
    if (mode === "toHomeFromLifemap") timer = window.setTimeout(() => setMode("home"), 1200);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [mode, setMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (mode === "detail") {
        setSelectedItem(null);
        setMode("ground");
        return;
      }

      if (mode === "ground") {
        setSelectedItem(null);
        setMode("toHomeFromGround");
        return;
      }

      if (mode === "lifemap") {
        setSelectedStar(null);
        setMode("toHomeFromLifemap");
        return;
      }

      if (mode === "replay") {
        setMode("toLifemapFromReplay");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode, setSelectedItem]);

  useFrame((state, delta) => {
    const lifemapFamily =
      mode === "toLifemap" ||
      mode === "lifemap" ||
      mode === "focus" ||
      mode === "replay" ||
      mode === "toLifemapFromReplay" ||
      mode === "toHomeFromLifemap";

    const bg = lifemapFamily ? new THREE.Color("#020611") : new THREE.Color("#07152f");
    const fogColor = lifemapFamily ? new THREE.Color("#071120") : new THREE.Color("#0f1d36");

    if (!(scene.background instanceof THREE.Color)) {
      scene.background = bg.clone();
    }
    (scene.background as THREE.Color).lerp(bg, 1 - Math.exp(-delta * 2.5));
    scene.fog = new THREE.FogExp2(fogColor, lifemapFamily ? 0.03 : 0.055);

    const homeAlpha =
      mode === "home" || mode === "toHomeFromGround" ? 1 : 0;

    const groundAlpha =
      mode === "home" ||
      mode === "toGround" ||
      mode === "ground" ||
      mode === "detail" ||
      mode === "toHomeFromGround"
        ? 1
        : 0;

    const starAlpha = lifemapFamily ? 1 : 0;

    if (homeActorsRef.current) {
      homeActorsRef.current.visible = homeAlpha > 0.01;
      dampOpacity(homeActorsRef.current, homeAlpha, 5, delta);
      homeActorsRef.current.position.y = THREE.MathUtils.damp(
        homeActorsRef.current.position.y,
        mode === "toGround" ? -0.7 : mode === "toLifemap" ? -1.5 : 0,
        4,
        delta
      );
      homeActorsRef.current.position.z = THREE.MathUtils.damp(
        homeActorsRef.current.position.z,
        mode === "toLifemap" ? 2.4 : 0,
        4,
        delta
      );
    }

    if (groundWorldRef.current) {
      groundWorldRef.current.visible = groundAlpha > 0.01;
      dampOpacity(groundWorldRef.current, groundAlpha, 5, delta);
      groundWorldRef.current.position.y = THREE.MathUtils.damp(
        groundWorldRef.current.position.y,
        mode === "toLifemap" ? -2.2 : 0,
        4,
        delta
      );
      groundWorldRef.current.position.z = THREE.MathUtils.damp(
        groundWorldRef.current.position.z,
        mode === "toLifemap" ? 3 : 0,
        4,
        delta
      );
    }

    if (starfieldRef.current) {
      starfieldRef.current.visible = starAlpha > 0.01;
      dampOpacity(starfieldRef.current, starAlpha, 5, delta);
    }

    let targetPos = new THREE.Vector3(0, 2.4, 10.8);
    let targetLook = new THREE.Vector3(0, 1.2, 0);

    if (mode === "toGround") {
      targetPos = new THREE.Vector3(0, 1.7, 8.1);
      targetLook = new THREE.Vector3(0, 0.9, -0.2);
    } else if (mode === "ground") {
      targetPos = new THREE.Vector3(0, 1.2, 6.2);
      targetLook = new THREE.Vector3(0, 0.85, -0.2);
    } else if (mode === "detail") {
      if (selectedItem === "anchor") {
        targetPos = new THREE.Vector3(-3.0, 1.2, 3.4);
        targetLook = new THREE.Vector3(-3.0, 0.95, -0.2);
      } else if (selectedItem === "guitar") {
        targetPos = new THREE.Vector3(0, 1.35, 3.15);
        targetLook = new THREE.Vector3(0, 1.05, -0.15);
      } else {
        targetPos = new THREE.Vector3(3.05, 1.1, 3.3);
        targetLook = new THREE.Vector3(3.05, 0.9, -0.2);
      }
    } else if (mode === "toHomeFromGround") {
      targetPos = new THREE.Vector3(0, 2.1, 9.3);
      targetLook = new THREE.Vector3(0, 1.1, 0);
    } else if (mode === "toLifemap") {
      targetPos = new THREE.Vector3(0, 6.7, 3.2);
      targetLook = new THREE.Vector3(0, 1.4, -10);
    } else if (mode === "lifemap") {
      targetPos = new THREE.Vector3(0, 0.2, 9.2);
      targetLook = new THREE.Vector3(0, 0, -14);
    } else if (mode === "focus" || mode === "replay") {
      const picked = stars.find((s) => s.id === selectedStar) ?? stars[stars.length - 1];
      const base = new THREE.Vector3(...picked.position);
      const orbit =
        mode === "replay"
          ? new THREE.Vector3(
              Math.sin(state.clock.elapsedTime * 0.5) * 0.8,
              Math.cos(state.clock.elapsedTime * 0.3) * 0.35,
              2.55
            )
          : new THREE.Vector3(0, 0.15, 2.9);

      targetPos = base.clone().add(orbit);
      targetLook = base.clone();
    } else if (mode === "toLifemapFromReplay") {
      targetPos = new THREE.Vector3(0, 0.35, 9.0);
      targetLook = new THREE.Vector3(0, 0, -14);
    } else if (mode === "toHomeFromLifemap") {
      targetPos = new THREE.Vector3(0, 3.4, 6.2);
      targetLook = new THREE.Vector3(0, 1.0, -1.2);
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.x, 3.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.y, 3.2, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.z, 3.2, delta);
    camera.lookAt(targetLook);

    if (groundWorldRef.current) {
      groundWorldRef.current.rotation.y = THREE.MathUtils.damp(
        groundWorldRef.current.rotation.y,
        mode === "ground" || mode === "detail" || mode === "toGround" ? 0.02 : 0,
        2,
        delta
      );
    }
  });

  const canEnterGround = mode === "home";
  const canEnterLifemap = mode === "home";
  const canSelectGround = mode === "ground";
  const canSelectStar = mode === "lifemap";

  const anchorPos =
    mode === "home" || mode === "toHomeFromGround"
      ? [-3.25, 0.95, 0.12]
      : [-3.55, 0.88, -0.2];

  const guitarPos =
    mode === "home" || mode === "toHomeFromGround"
      ? [0.15, 1.0, 0.35]
      : [0, 0.95, -0.2];

  const carPos =
    mode === "home" || mode === "toHomeFromGround"
      ? [3.0, 0.8, 0.28]
      : [3.55, 0.82, -0.18];

  return (
    <>
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#b8d6ff", "#233658", 0.95]} />
      <directionalLight position={[4, 7, 6]} intensity={1.6} color="#f3f7ff" />
      <directionalLight position={[-7, 3, -8]} intensity={0.55} color="#9fc3ff" />

      <group ref={groundWorldRef}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.05, 0]}
          onClick={() => {
            if (canEnterGround) setMode("toGround");
          }}
        >
          <circleGeometry args={[18, 64]} />
          <meshStandardMaterial
            color="#345b96"
            emissive="#2a4d84"
            emissiveIntensity={0.1}
            transparent
            opacity={1}
          />
        </mesh>

        <mesh
          position={[0, 6.1, -10]}
          visible={mode !== "lifemap" && mode !== "focus" && mode !== "replay" && mode !== "toLifemapFromReplay"}
          onClick={() => {
            if (canEnterLifemap) setMode("toLifemap");
          }}
        >
          <sphereGeometry args={[23, 40, 40, 0, Math.PI * 2, 0, Math.PI / 2.15]} />
          <meshStandardMaterial
            color="#0b1842"
            emissive="#0c2a68"
            emissiveIntensity={0.22}
            transparent
            opacity={0.22}
            side={THREE.BackSide}
          />
        </mesh>

        <mesh
          position={anchorPos as [number, number, number]}
          rotation={[0.02, -0.16, 0]}
          scale={hoveredItem === "anchor" && canSelectGround ? 1.05 : 1}
          onPointerEnter={() => canSelectGround && setHoveredItem("anchor")}
          onPointerLeave={() => setHoveredItem(null)}
          onClick={() => {
            if (canSelectGround) {
              setSelectedItem("anchor");
              setMode("detail");
            }
          }}
        >
          <boxGeometry args={[1.95, 1.95, 1.95]} />
          <meshStandardMaterial
            color="#cfc3a4"
            emissive={hoveredItem === "anchor" ? "#b9995b" : "#000000"}
            emissiveIntensity={hoveredItem === "anchor" ? 0.2 : 0}
            transparent
            opacity={1}
            roughness={0.86}
          />
        </mesh>

        <group
          position={guitarPos as [number, number, number]}
          scale={hoveredItem === "guitar" && canSelectGround ? 1.04 : 1}
          onPointerEnter={() => canSelectGround && setHoveredItem("guitar")}
          onPointerLeave={() => setHoveredItem(null)}
          onClick={() => {
            if (canSelectGround) {
              setSelectedItem("guitar");
              setMode("detail");
            }
          }}
        >
          <mesh position={[0, 1.65, -0.2]}>
            <boxGeometry args={[0.18, 2.8, 0.18]} />
            <meshStandardMaterial
              color="#f1ddd9"
              emissive={hoveredItem === "guitar" ? "#ffd7bd" : "#000000"}
              emissiveIntensity={hoveredItem === "guitar" ? 0.18 : 0}
              transparent
              opacity={1}
              roughness={0.54}
            />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.55, 24, 24]} />
            <meshStandardMaterial
              color="#c98333"
              emissive={hoveredItem === "guitar" ? "#ffd4a0" : "#000000"}
              emissiveIntensity={hoveredItem === "guitar" ? 0.18 : 0}
              transparent
              opacity={1}
              roughness={0.36}
            />
          </mesh>
        </group>

        <mesh
          position={carPos as [number, number, number]}
          rotation={[0, 0.18, 0]}
          scale={hoveredItem === "car" && canSelectGround ? 1.05 : 1}
          onPointerEnter={() => canSelectGround && setHoveredItem("car")}
          onPointerLeave={() => setHoveredItem(null)}
          onClick={() => {
            if (canSelectGround) {
              setSelectedItem("car");
              setMode("detail");
            }
          }}
        >
          <cylinderGeometry args={[1.2, 1.35, 1.9, 28]} />
          <meshStandardMaterial
            color="#79a6f6"
            emissive={hoveredItem === "car" ? "#9dc1ff" : "#275cbd"}
            emissiveIntensity={hoveredItem === "car" ? 0.3 : 0.14}
            transparent
            opacity={1}
            roughness={0.26}
          />
        </mesh>
      </group>

      <group ref={homeActorsRef}>
        <mesh position={[0, 1.35, 0.18]}>
          <sphereGeometry args={[0.78, 32, 32]} />
          <meshStandardMaterial
            color="#dbe9ff"
            emissive="#b9d6ff"
            emissiveIntensity={0.95}
            transparent
            opacity={1}
            roughness={0.2}
            metalness={0.05}
          />
        </mesh>

        <mesh position={[0.65, 3.15, -1.0]}>
          <capsuleGeometry args={[0.55, 2.2, 10, 20]} />
          <meshStandardMaterial
            color="#b8c3ec"
            emissive="#7d8ed0"
            emissiveIntensity={0.12}
            transparent
            opacity={1}
            roughness={0.42}
          />
        </mesh>
      </group>

      <group ref={starfieldRef} visible={false}>
        {stars.map((star) => {
          const selected = selectedStar === star.id;
          const hovered = hoveredStar === star.id;
          return (
            <mesh
              key={star.id}
              position={star.position}
              scale={selected ? 1.8 : hovered ? 1.4 : 1}
              onPointerEnter={(e) => {
                e.stopPropagation();
                if (canSelectStar) setHoveredStar(star.id);
              }}
              onPointerLeave={() => setHoveredStar(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (canSelectStar) {
                  setSelectedStar(star.id);
                  setMode("focus");
                }
              }}
            >
              <sphereGeometry args={[star.size, 18, 18]} />
              <meshStandardMaterial
                color={star.color}
                emissive={hovered || selected ? "#ffffff" : star.color}
                emissiveIntensity={selected ? 2.3 : hovered ? 1.5 : 0.75}
                transparent
                opacity={1}
                roughness={0.18}
                metalness={0.05}
              />
            </mesh>
          );
        })}
      </group>
    </>
  );
}

export default function SpatialScene() {
  const [mode, setMode] = useState<Mode>("home");
  const [selectedItem, setSelectedItem] = useState<GroundItem | null>(null);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#07152f",
      }}
    >
      <Canvas
        camera={{ position: [0, 2.4, 10.8], fov: 42, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <SceneRuntime
          mode={mode}
          setMode={setMode}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
      </Canvas>

      <Overlay mode={mode} selectedItem={selectedItem} />
    </div>
  );
}
