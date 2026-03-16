"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

type Props = {
  size?: number
  distance?: number
  color?: string
}

export default function LensGlow({
  size = 18,
  distance = -140,
  color = "#6fa8ff"
}: Props) {

  const mesh = useRef<THREE.Mesh>(null!)
  const { camera } = useThree()

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(size, size)
  }, [size])

  const material = useMemo(() => {

    return new THREE.ShaderMaterial({

      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,

      uniforms:{
        color:{ value:new THREE.Color(color) }
      },

      vertexShader:`

        varying vec2 vUv;

        void main(){

          vUv = uv;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position,1.0);

        }

      `,

      fragmentShader:`

        varying vec2 vUv;
        uniform vec3 color;

        void main(){

          float d = distance(vUv,vec2(0.5));

          float glow = 1.0 - smoothstep(0.0,0.75,d);
          glow = pow(glow,2.2);

          float alpha = glow * 0.18;

          gl_FragColor = vec4(color * glow, alpha);

        }

      `

    })

  }, [color])

  useFrame(() => {
    if(mesh.current){
      mesh.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <mesh
      ref={mesh}
      position={[0,0,distance]}
      geometry={geometry}
      material={material}
    />
  )
}