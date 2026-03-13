"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSpatialStore } from "../state/spatialStore";
import { Points, PointMaterial } from "@react-three/drei";

const EMOTION_COLORS = {
  joy: new THREE.Color("#1A1A2A"),
  love: new THREE.Color("#2A1A2A"),
  sadness: new THREE.Color("#1A1A20"),
  anger: new THREE.Color("#2A1A1A"),
  calm: new THREE.Color("#1A2A2A"),
  curiosity: new THREE.Color("#1A2A1A"),
  focus: new THREE.Color("#20202A"),
  default: new THREE.Color("#050510"),
};

export default function Environment() {

  const { scene, camera } = useThree();

  const { selectedStarId, stars } = useSpatialStore((s) => ({
    selectedStarId: s.selectedStarId,
    stars: s.stars,
  }));

  const targetColor = useMemo(() => {
    if (selectedStarId !== null) {
      const star = stars.find((s) => s.id === selectedStarId);
      const emotion = star?.emotion as keyof typeof EMOTION_COLORS;
      return EMOTION_COLORS[emotion] || EMOTION_COLORS.default;
    }
    return EMOTION_COLORS.default;
  }, [selectedStarId, stars]);

  useEffect(() => {
    scene.fog = new THREE.FogExp2(EMOTION_COLORS.default, 0.015);
    scene.background = new THREE.Color("#02030a");
  }, [scene]);

  useFrame((state, delta) => {
    if (scene.fog) {
      (scene.fog as THREE.FogExp2).color.lerp(targetColor, delta * 0.5);
    }
  });

  const [p1, p2, p3] = useMemo(() => {

    const a = new Float32Array(500 * 3);
    const b = new Float32Array(1000 * 3);
    const c = new Float32Array(2000 * 3);

    for (let i = 0; i < a.length; i += 3) {
      a[i] = (Math.random() - 0.5) * 100;
      a[i + 1] = (Math.random() - 0.5) * 100;
      a[i + 2] = (Math.random() - 0.5) * 100;
    }

    for (let i = 0; i < b.length; i += 3) {
      b[i] = (Math.random() - 0.5) * 200;
      b[i + 1] = (Math.random() - 0.5) * 200;
      b[i + 2] = (Math.random() - 0.5) * 200;
    }

    for (let i = 0; i < c.length; i += 3) {
      c[i] = (Math.random() - 0.5) * 400;
      c[i + 1] = (Math.random() - 0.5) * 400;
      c[i + 2] = (Math.random() - 0.5) * 400;
    }

    return [a, b, c];

  }, []);

  const nearLayer = useRef<THREE.Points>(null!);
  const midLayer = useRef<THREE.Points>(null!);
  const farLayer = useRef<THREE.Points>(null!);

  useFrame(() => {

    const velocity = camera.position.length();

    if (nearLayer.current) nearLayer.current.position.z += velocity * 0.002;
    if (midLayer.current) midLayer.current.position.z += velocity * 0.001;
    if (farLayer.current) farLayer.current.position.z += velocity * 0.0004;

  });

  const opacity = selectedStarId !== null ? 0 : 1;

  return (
    <>
      <Points ref={nearLayer} positions={p1} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          opacity={opacity}
          color="#ffffff"
          size={0.08}
          sizeAttenuation
          depthWrite={false}
          depthTest={false}
        />
      </Points>

      <Points ref={midLayer} positions={p2} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          opacity={opacity}
          color="#ffffff"
          size={0.05}
          sizeAttenuation
          depthWrite={false}
          depthTest={false}
        />
      </Points>

      <Points ref={farLayer} positions={p3} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          opacity={opacity}
          color="#ffffff"
          size={0.03}
          sizeAttenuation
          depthWrite={false}
          depthTest={false}
        />
      </Points>
    </>
  );
}