"use client"

import { useFrame } from "@react-three/fiber"
import { useRef, useMemo } from "react"
import * as THREE from "three"

export default function CoreSwirl(){

  const mesh = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  useFrame((state)=>{

    if(mesh.current){
      mesh.current.rotation.z += 0.0006
    }

    if(matRef.current){
      matRef.current.uniforms.uTime.value =
        state.clock.elapsedTime
    }

  })

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,

      /* softer core energy */
      blending:THREE.AdditiveBlending,

      uniforms:{
        uTime:{ value:0 }
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

        uniform float uTime;

        varying vec2 vUv;

        void main(){

          vec2 uv = vUv - 0.5;

          float r = length(uv);
          float a = atan(uv.y,uv.x);

          float swirl =
            sin(a*6.0 + r*12.0 - uTime*0.8);

          swirl = swirl * 0.5 + 0.5;

          float glow =
            smoothstep(0.55,0.05,r) *
            swirl;

          vec3 color =
            vec3(1.0,0.88,0.65) *
            glow;

          gl_FragColor =
            vec4(color, glow*0.35);

        }

      `
    })

  },[])

  return(
    <mesh ref={mesh} scale={90}>
      <planeGeometry args={[1,1]} />
      <primitive
        object={material}
        ref={matRef}
        attach="material"
      />
    </mesh>
  )

}