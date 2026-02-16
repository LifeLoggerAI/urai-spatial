import * as THREE from 'three';
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

// A placeholder for the actual data that will come from the Archetype Engine.
const starData = Array.from({ length: 50000 }, (_, i) => ({
  id: i,
  position: new THREE.Vector3(
    (Math.random() - 0.5) * 300,
    (Math.random() - 0.5) * 300,
    (Math.random() - 0.5) * 300
  ),
  // Base color for each star/orb, representing a Seasonal Archetype
  color: new THREE.Color().setHSL(Math.random(), 0.8, 0.7),
}));

// Placeholder for the user's long-term Lifetime Tendency vector
const lifetimeTendency = {
    volatility: 0.8,      // High volatility: frequent shifts
    periodicity: 0.2,     // Low periodicity: less predictable returns
    reinventionCount: 4,  // 4 major reinvention events
};

const vertexShader = `
  attribute vec3 instanceColor;
  varying vec3 vInstanceColor;
  uniform float uTime;
  uniform vec3 uCameraPos;

  void main() {
    vInstanceColor = instanceColor;

    // Depth-based Reveal Logic
    float dist = distance(uCameraPos, instanceMatrix[3].xyz);
    float revealRadius = 150.0;
    float scale = smoothstep(revealRadius, revealRadius - 20.0, dist);

    // Final Position
    vec3 pos = position * scale;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vInstanceColor;
  uniform float uTime;
  uniform float uVolatility;
  uniform float uPeriodicity;
  uniform float uReinventionCount;

  // GLSL noise function
  float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // --- Lifetime Tendency Visualization ---
    float pulseSpeed = 1.0 + uVolatility * 3.0; // Faster pulse for higher volatility
    float pulse = (sin(uTime * pulseSpeed) + 1.0) / 2.0 * 0.4 + 0.6;

    // Base color influenced by periodicity
    vec3 baseColor = vInstanceColor + vec3(uPeriodicity * 0.2);

    // Add subtle, shimmering noise for reinvention events
    float noise = snoise(gl_PointCoord * (10.0 + uReinventionCount * 2.0)) * 0.05;
    vec3 finalColor = baseColor * pulse + noise;

    // --- Shader-based Halo ---
    float dist = distance(gl_PointCoord, vec2(0.5));
    float halo = 1.0 - smoothstep(0.45, 0.5, dist);

    gl_FragColor = vec4(finalColor, halo);
  }
`;

export function LifeMap() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const colorAttribRef = useRef<THREE.InstancedBufferAttribute>(null!);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uCameraPos: { value: new THREE.Vector3() },
    // Initialize Lifetime Tendency uniforms
    uVolatility: { value: lifetimeTendency.volatility },
    uPeriodicity: { value: lifetimeTendency.periodicity },
    uReinventionCount: { value: lifetimeTendency.reinventionCount },
  }), []);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const colors = new Float32Array(starData.length * 3);

    starData.forEach((star, i) => {
      dummy.position.copy(star.position);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      star.color.toArray(colors, i * 3);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    colorAttribRef.current.needsUpdate = true;
  }, []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uCameraPos.value.copy(state.camera.position);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, starData.length]}>
      <sphereGeometry args={[0.2, 16, 16]}>
        <instancedBufferAttribute
          ref={colorAttribRef}
          attach="attributes-instanceColor"
          args={[new Float32Array(starData.length * 3), 3]}
        />
      </sphereGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={true}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
