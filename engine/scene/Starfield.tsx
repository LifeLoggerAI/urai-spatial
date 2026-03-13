'use client'

import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSpatialStore } from "../state/spatialStore";
import { Line } from "@react-three/drei";
import { demoData as rawDemoData, demoLinks as rawDemoLinks } from "../data/demoData";

const demoData = rawDemoData ?? [];
const demoLinks = rawDemoLinks ?? [];

const DUMMY = new THREE.Object3D();

const COLORS = {
  SELECTED: new THREE.Color('#FFFFFF'),
  HOVERED: new THREE.Color('#DDDDFF'),
  DEFAULT: new THREE.Color('#AAAAAA'),
  DIMMED: new THREE.Color('#333333'),
};

const attractor = new THREE.Vector3(0, 0, -10);

export default function Starfield() {

  const {
    selectedStarId,
    setSelectedStarId,
    interactionLock,
    setInteractionLock,
  } = useSpatialStore();

  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
  const { camera } = useThree();

  const colorArray = useMemo(() =>
    Float32Array.from(
      new Array(demoData.length)
        .fill(0)
        .flatMap(() => COLORS.DEFAULT.toArray())
    ),
    []
  );

  const initialPositions = useMemo(
    () => demoData.map((s: any) => new THREE.Vector3(...s.position)),
    []
  );

  useEffect(() => {
    if (!meshRef.current) return;

    demoData.forEach((star: any, i: number) => {
      DUMMY.position.set(...star.position as [number, number, number]);
      DUMMY.updateMatrix();
      meshRef.current.setMatrixAt(i, DUMMY.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {

    if (!meshRef.current) return;

    const tempColor = new THREE.Color();
    let needsColorUpdate = false;

    for (let i = 0; i < demoData.length; i++) {

      const id = demoData[i].id;
      let targetColor = COLORS.DEFAULT;

      if (selectedStarId !== null) {
        targetColor =
          id === selectedStarId
            ? COLORS.SELECTED
            : COLORS.DIMMED;
      }

      tempColor.fromArray(colorArray, i * 3);

      if (!tempColor.equals(targetColor)) {
        tempColor.lerp(targetColor, 0.1);
        tempColor.toArray(colorArray, i * 3);
        needsColorUpdate = true;
      }

      const pos = initialPositions[i].clone();
      const dir = new THREE.Vector3()
        .subVectors(attractor, pos)
        .normalize();

      pos.addScaledVector(dir, 0.0006);

      DUMMY.position.copy(pos);
      DUMMY.updateMatrix();

      meshRef.current.setMatrixAt(i, DUMMY.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    if (needsColorUpdate && meshRef.current.geometry) {
      const colorAttribute =
        meshRef.current.geometry.getAttribute(
          "color"
        ) as THREE.InstancedBufferAttribute;

      if (colorAttribute) {
        colorAttribute.needsUpdate = true;
      }
    }

    if (materialRef.current) {

      if (selectedStarId !== null) {
        const shimmer =
          1.6 +
          Math.sin(clock.elapsedTime * 2.2) * 0.2;

        materialRef.current.emissiveIntensity = shimmer;
      } else {
        materialRef.current.emissiveIntensity = 0.25;
      }
    }

    if (selectedStarId !== null && interactionLock) {

      const star = demoData.find(
        (s: any) => s.id === selectedStarId
      );

      if (star) {

        const targetPosition = new THREE.Vector3(
          ...star.position as [number, number, number]
        );

        const distance =
          camera.position.distanceTo(targetPosition);

        if (distance < 4.0) {
          setInteractionLock(false);
        }
      }
    }
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, demoData.length]}
        onPointerDown={(e) => {

          e.stopPropagation();

          if (interactionLock || selectedStarId !== null) return;

          if (e.instanceId !== undefined) {

            const star = demoData[e.instanceId];

            if (star) {
              setSelectedStarId(star.id);
            }
          }
        }}
      >

        <sphereGeometry args={[0.1, 16, 16]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[colorArray, 3]}
          />
        </sphereGeometry>

        <meshStandardMaterial
          ref={materialRef}
          vertexColors
          emissive="#ffffff"
          emissiveIntensity={0.25}
        />

      </instancedMesh>

      {selectedStarId === null &&
        demoLinks.map(([a, b]: any, i: number) => {

          const p1 =
            demoData.find((s: any) => s.id === a)?.position;

          const p2 =
            demoData.find((s: any) => s.id === b)?.position;

          if (!p1 || !p2) return null;

          return (
            <Line
              key={i}
              points={[
                p1 as [number, number, number],
                p2 as [number, number, number]
              ]}
              color="#ffffff"
              lineWidth={0.5}
              transparent
              opacity={0.2}
            />
          );
        })}
    </>
  );
}