'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

// Shader for a smooth sky gradient with a soft horizon.
const SkyShaderMaterial = shaderMaterial(
  { uTime: 0 },
  // Vertex Shader: standard projection
  `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader: creates the gradient
  `
    varying vec3 vWorldPosition;

    // Remap value from one range to another
    float remap(float value, float from1, float to1, float from2, float to2) {
        return from2 + (value - from1) * (to2 - from2) / (to1 - from1);
    }

    void main() {
      // Normalized height of the fragment
      float y = normalize(vWorldPosition).y;

      // Define gradient colors: top, middle, bottom
      vec3 colorTop = vec3(0.027, 0.071, 0.122); // #07121f
      // Final lock: Mid-band brightness reduced to create a seamless, atmospheric blend.
      vec3 colorMid = vec3(0.028, 0.072, 0.118);
      vec3 colorBot = vec3(0.035, 0.090, 0.133); // #091722

      // Create a smoother, taller gradient falloff
      float mix1 = smoothstep(-0.2, 0.1, y);
      vec3 finalColor = mix(colorBot, colorMid, mix1);

      float mix2 = smoothstep(0.0, 0.4, y);
      finalColor = mix(finalColor, colorTop, mix2);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

extend({ SkyShaderMaterial })

// Component to render the sky dome
export default function SkyDome() {
  const ref = useRef()
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2}>
      <sphereGeometry args={[500, 64, 32]} />
      {/* @ts-ignore */}
      <skyShaderMaterial side={THREE.BackSide} />
    </mesh>
  )
}
