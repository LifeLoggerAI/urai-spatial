"use client";

import * as React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, Color, DoubleSide, Vector3 } from "three";
import { useSceneStore } from "../state/sceneStore";

function HomeCameraRig() {
  const { camera } = useThree();
  const mode = useSceneStore((s) => s.mode);

  const basePos = React.useMemo(() => new Vector3(0.42, 1.08, 8.2), []);
  const lookAt = React.useMemo(() => new Vector3(0.12, 0.74, 0), []);

  useFrame(({ clock }) => {
    if (mode !== "home") return;

    const t = clock.getElapsedTime();
    const driftX = Math.sin(t * 0.14) * 0.03;
    const driftY = Math.cos(t * 0.18) * 0.022;
    const driftZ = Math.sin(t * 0.1) * 0.04;

    camera.position.lerp(
      new Vector3(basePos.x + driftX, basePos.y + driftY, basePos.z + driftZ),
      0.05
    );
    camera.lookAt(lookAt);
  });

  return null;
}

function Orb() {
  const coreRef = React.useRef<any>(null);
  const innerGlowRef = React.useRef<any>(null);
  const outerGlowRef = React.useRef<any>(null);
  const shimmerARef = React.useRef<any>(null);
  const shimmerBRef = React.useRef<any>(null);

  const mode = useSceneStore((s) => s.mode);
  const enterLifemap = useSceneStore((s) => s.enterLifemap);
  const [hovered, setHovered] = React.useState(false);

  useFrame(({ clock }) => {
    if (mode !== "home") return;

    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 1.65) * 0.02;
    const idle = 1 + Math.sin(t * 0.95) * 0.01;
    const hoverScale = hovered ? 1.07 : 1;
    const s = pulse * idle * hoverScale;

    if (coreRef.current) {
      coreRef.current.scale.setScalar(s);
      const target = hovered ? 1.35 : 1.02;
      coreRef.current.material.emissiveIntensity += (target - coreRef.current.material.emissiveIntensity) * 0.1;
    }

    if (innerGlowRef.current?.material) {
      const target = hovered ? 0.2 : 0.135;
      innerGlowRef.current.material.opacity += (target - innerGlowRef.current.material.opacity) * 0.08;
      innerGlowRef.current.scale.setScalar((hovered ? 1.16 : 1.1) * pulse);
    }

    if (outerGlowRef.current?.material) {
      const target = hovered ? 0.08 : 0.05;
      outerGlowRef.current.material.opacity += (target - outerGlowRef.current.material.opacity) * 0.08;
      outerGlowRef.current.scale.setScalar((hovered ? 1.55 : 1.42) * idle);
    }

    if (shimmerARef.current) {
      shimmerARef.current.position.x = -0.18 + Math.sin(t * 1.1) * 0.035;
      shimmerARef.current.position.y = 0.19 + Math.cos(t * 1.4) * 0.025;
      shimmerARef.current.material.opacity = hovered ? 0.72 : 0.58;
    }

    if (shimmerBRef.current) {
      shimmerBRef.current.position.x = 0.24 + Math.sin(t * 0.9) * 0.025;
      shimmerBRef.current.position.y = 0.06 + Math.cos(t * 1.3) * 0.02;
      shimmerBRef.current.material.opacity = hovered ? 0.62 : 0.46;
    }
  });

  return (
    <group position={[0.1, 0.82, 0]}>
      <mesh ref={outerGlowRef} renderOrder={1}>
        <sphereGeometry args={[1.42, 48, 48]} />
        <meshBasicMaterial
          transparent
          opacity={0.05}
          depthWrite={false}
          blending={AdditiveBlending}
          color={new Color("#5b7cff")}
        />
      </mesh>

      <mesh ref={innerGlowRef} renderOrder={2}>
        <sphereGeometry args={[1.08, 48, 48]} />
        <meshBasicMaterial
          transparent
          opacity={0.135}
          depthWrite={false}
          blending={AdditiveBlending}
          color={new Color("#6f92ff")}
        />
      </mesh>

      <mesh
        ref={coreRef}
        castShadow
        receiveShadow
        renderOrder={3}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => enterLifemap?.()}
      >
        <sphereGeometry args={[0.9, 72, 72]} />
        <meshStandardMaterial
          color={new Color("#98b4ff")}
          emissive={new Color("#6b8cff")}
          emissiveIntensity={1.02}
          metalness={0.06}
          roughness={0.3}
        />
      </mesh>

      <mesh ref={shimmerARef} position={[-0.18, 0.19, 0.82]} renderOrder={4}>
        <sphereGeometry args={[0.045, 24, 24]} />
        <meshBasicMaterial
          transparent
          opacity={0.58}
          depthWrite={false}
          blending={AdditiveBlending}
          color={new Color("#f7fbff")}
        />
      </mesh>

      <mesh ref={shimmerBRef} position={[0.24, 0.06, 0.84]} renderOrder={4}>
        <sphereGeometry args={[0.035, 24, 24]} />
        <meshBasicMaterial
          transparent
          opacity={0.46}
          depthWrite={false}
          blending={AdditiveBlending}
          color={new Color("#eef6ff")}
        />
      </mesh>

      <mesh position={[0.03, -0.08, 0.72]} renderOrder={4}>
        <ringGeometry args={[0.42, 0.58, 48]} />
        <meshBasicMaterial
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={AdditiveBlending}
          color={new Color("#dce9ff")}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

function GroundContact() {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0.16, 0.018, 0.52]}>
      <mesh receiveShadow renderOrder={0}>
        <circleGeometry args={[0.72, 64]} />
        <meshBasicMaterial
          transparent
          opacity={0.34}
          color={new Color("#02040d")}
          side={DoubleSide}
        />
      </mesh>

      <mesh receiveShadow position={[0, 0.001, 0]} renderOrder={0}>
        <ringGeometry args={[0.72, 1.7, 96]} />
        <meshBasicMaterial
          transparent
          opacity={0.18}
          color={new Color("#061033")}
          side={DoubleSide}
        />
      </mesh>

      <mesh position={[0.02, 0.002, 0.1]} renderOrder={1}>
        <circleGeometry args={[1.08, 96]} />
        <meshBasicMaterial
          transparent
          opacity={0.1}
          depthWrite={false}
          color={new Color("#3558ff")}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

function GroundPlane() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[44, 24, 1, 1]} />
        <meshStandardMaterial
          color={new Color("#061047")}
          roughness={0.98}
          metalness={0.01}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.6, 0, 1.1]}>
        <circleGeometry args={[8.4, 96]} />
        <meshBasicMaterial
          transparent
          opacity={0.07}
          color={new Color("#1a36bc")}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
}

function HorizonShape() {
  return (
    <>
      <mesh position={[0, 0.52, -9.6]} renderOrder={-1}>
        <planeGeometry args={[44, 2.8, 1, 1]} />
        <meshBasicMaterial color={new Color("#0b1dc6")} />
      </mesh>

      <mesh position={[0, 1.3, -10.6]} renderOrder={-2}>
        <planeGeometry args={[44, 4.5, 1, 1]} />
        <meshBasicMaterial transparent opacity={0.45} color={new Color("#1735db")} />
      </mesh>
    </>
  );
}

function AtmospherePanels() {
  return (
    <>
      <mesh position={[0, 6.1, -13]}>
        <planeGeometry args={[46, 18, 1, 1]} />
        <meshBasicMaterial color={new Color("#030926")} />
      </mesh>

      <mesh position={[0, 2.7, -12.1]}>
        <planeGeometry args={[46, 8.2, 1, 1]} />
        <meshBasicMaterial color={new Color("#08126b")} />
      </mesh>

      <mesh position={[0, -0.1, -11.3]}>
        <planeGeometry args={[46, 6.2, 1, 1]} />
        <meshBasicMaterial color={new Color("#0d20c8")} />
      </mesh>

      <mesh position={[0, -3.8, -10.5]}>
        <planeGeometry args={[46, 8.4, 1, 1]} />
        <meshBasicMaterial color={new Color("#06126d")} />
      </mesh>
    </>
  );
}

function Monoliths() {
  const data: Array<[number, number, number, number, number, number]> = [
    [-5.7, 1.65, -3.6, 0.56, 3.95, 0.42],
    [-3.55, 2.3, -4.55, 0.74, 5.4, 0.46],
    [2.45, 1.42, -6.25, 0.66, 3.25, 0.46],
  ];

  return (
    <>
      {data.map((m, i) => (
        <mesh key={i} position={[m[0], m[1], m[2]]} castShadow receiveShadow>
          <boxGeometry args={[m[3], m[4], m[5]]} />
          <meshStandardMaterial
            color={new Color("#07104a")}
            emissive={new Color("#0b1458")}
            emissiveIntensity={0.08}
            roughness={0.94}
            metalness={0.02}
          />
        </mesh>
      ))}
    </>
  );
}

export default function HomeWorld() {
  const mode = useSceneStore((s) => s.mode);
  if (mode !== "home") return null;

  return (
    <group>
      <color attach="background" args={["#040a34"]} />
      {/* @ts-expect-error three jsx intrinsic */}
      <fogExp2 attach="fog" args={["#050b3f", 0.068]} />

      <HomeCameraRig />

      <ambientLight intensity={0.2} color="#4b62d4" />
      <hemisphereLight intensity={0.28} color="#5f7fff" groundColor="#040711" />
      <directionalLight
        position={[4.6, 6.2, 5.8]}
        intensity={1.45}
        color="#9db7ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-5.2, 2.0, -5.6]}
        intensity={0.38}
        color="#2d48d9"
      />
      <pointLight position={[0.12, 1.0, 1.45]} intensity={1.1} color="#7a96ff" distance={8} />

      <AtmospherePanels />
      <HorizonShape />
      <GroundPlane />
      <GroundContact />
      <Monoliths />
      <Orb />
    </group>
  );
}
