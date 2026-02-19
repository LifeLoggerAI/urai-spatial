import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

const NebulaMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#02040f'), uNoiseScale: 4.0 },
  // vertex shader
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  // fragment shader
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uNoiseScale;
    varying vec2 vUv;

    // 2D Random
    float random (vec2 st) {
        return fract(sin(dot(st.xy,
                             vec2(12.9898,78.233)))*
            43758.5453123);
    }

    // 2D Value Noise
    float noise (vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);

        // Four corners in 2D of a tile
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix(a, b, u.x) +
                (c - a) * u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
    }

    void main() {
      // Animate UVs for a slow drifting effect
      vec2 uv = vUv + vec2(uTime * 0.01, uTime * 0.005);
      
      // Combine multiple layers of noise (fractal noise)
      float n = noise(uv * uNoiseScale);
      n += 0.5 * noise(uv * uNoiseScale * 2.0);
      n += 0.25 * noise(uv * uNoiseScale * 4.0);
      n = n / (1.0 + 0.5 + 0.25);

      // Create a soft vignette effect
      float dist = distance(vUv, vec2(0.5));
      float vignette = smoothstep(0.7, 0.2, dist);

      vec3 finalColor = uColor * (0.3 + n * 0.7) * vignette;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

extend({ NebulaMaterial })

export default function ProceduralNebula() {
  const ref = useRef<THREE.ShaderMaterial>(null!)
  useFrame(({ clock }) => {
    if(ref.current) {
      ref.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })
  return (
    <mesh position={[0, 0, -10]}>
      <planeGeometry args={[60, 60]} />
      {/* @ts-ignore */}
      <nebulaMaterial ref={ref} key={NebulaMaterial.key} />
    </mesh>
  )
}
