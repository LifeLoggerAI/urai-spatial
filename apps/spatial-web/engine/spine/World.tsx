'use client'

import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useMemo } from 'react'
import Orb from './Orb'
import { useEmotionStore } from '../state/emotion-store'

export default function World() {
const { scene, camera } = useThree()
const starMaterialRef = useRef<THREE.ShaderMaterial>(null!)
const { state, intensity } = useEmotionStore()

useEffect(() => {
scene.background = new THREE.Color('#030712')
scene.fog = new THREE.FogExp2('#0a1326', 0.012)
camera.lookAt(0, 1.5, 0)
}, [scene, camera])

useFrame(() => {
if (!starMaterialRef.current) return

```
let brightness = 1
switch (state) {
  case 'grief': brightness = 0.6; break
  case 'trauma': brightness = 0.55; break
  case 'anxiety': brightness = 0.8; break
  case 'clarity': brightness = 1.2; break
  case 'growth': brightness = 1.15; break
  case 'breakthrough': brightness = 1.35; break
  case 'recovery': brightness = 1.05; break
  default: brightness = 1
}

const target = brightness * (0.9 + intensity * 0.4)
starMaterialRef.current.uniforms.uEmotionBrightness.value +=
  (target - starMaterialRef.current.uniforms.uEmotionBrightness.value) * 0.05
```

})

const starGeometry = useMemo(() => {
const positions = new Float32Array(10000 * 3)

```
for (let i = 0; i < 10000; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 300
  positions[i * 3 + 1] = Math.random() * 160
  positions[i * 3 + 2] = (Math.random() - 0.5) * 300
}

const geometry = new THREE.BufferGeometry()
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
return geometry
```

}, [])

return (
<>
<group position={[0, 1.4, 0]}> <Orb /> </group>

```
  <mesh receiveShadow position={[0, -110, 0]}>
    <sphereGeometry args={[120, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]} />
    <shaderMaterial
      vertexShader={`
        varying float vY;
        void main() {
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        varying float vY;
        void main() {
          float g = smoothstep(-120.0, 10.0, vY);
          vec3 deep = vec3(0.01, 0.03, 0.07);
          vec3 mid = vec3(0.04, 0.08, 0.15);
          vec3 light = vec3(0.07, 0.13, 0.22);
          vec3 col = mix(deep, mid, g);
          col = mix(col, light, g * 0.6);
          gl_FragColor = vec4(col, 1.0);
        }
      `}
    />
  </mesh>

  <points geometry={starGeometry}>
    <shaderMaterial
      ref={starMaterialRef}
      transparent
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      uniforms={{ uEmotionBrightness: { value: 1.0 } }}
      vertexShader={`
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 2.5;
        }
      `}
      fragmentShader={`
        uniform float uEmotionBrightness;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float a = smoothstep(0.5, 0.15, d);
          gl_FragColor = vec4(vec3(uEmotionBrightness), a);
        }
      `}
    />
  </points>

  <ambientLight intensity={0.32} />

  <directionalLight
    position={[10, 30, 15]}
    intensity={1.1}
    castShadow
    shadow-mapSize-width={2048}
    shadow-mapSize-height={2048}
    shadow-bias={-0.00005}
  />
</>
```

)
}
