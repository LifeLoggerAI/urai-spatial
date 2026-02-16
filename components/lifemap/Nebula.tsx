import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import nebulaVertex from "@/lib/lifemap/shaders/nebulaVertex.glsl";
import nebulaFragment from "@/lib/lifemap/shaders/nebulaFragment.glsl";

export default function Nebula() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.elapsedTime;
    }
  });

  return (
    <mesh position={[0, 0, -20]}>
      <planeGeometry args={[100, 100]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={nebulaVertex}
        fragmentShader={nebulaFragment}
        uniforms={{
          time: { value: 0 },
        }}
        transparent
      />
    </mesh>
  );
}
