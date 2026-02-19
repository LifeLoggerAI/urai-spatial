import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function StarLayer({ depth, count }: { depth: number; count: number }) {
  const ref = useRef<THREE.Points>(null!);

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = -depth;

    const brightness = 0.6 + Math.random() * 0.4;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;
  }

  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.getElapsedTime() * 0.01 * depth;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02 * depth}
        sizeAttenuation
        vertexColors
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function Stars() {
  return (
    <>
      <StarLayer depth={1} count={400} />
      <StarLayer depth={2} count={300} />
      <StarLayer depth={3} count={200} />
    </>
  );
}
