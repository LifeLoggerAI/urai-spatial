"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function VolumetricNebulaNoise(){

  const mesh = useRef<THREE.Mesh>(null!)
  const mat = useRef<THREE.ShaderMaterial>(null!)

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.BackSide,

      uniforms:{
        uTime:{ value:0 }
      },

      vertexShader:`

        varying vec3 vPos;

        void main(){

          vPos = position;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position,1.0);

        }

      `,

      fragmentShader:`

        precision highp float;

        varying vec3 vPos;
        uniform float uTime;

        float noise(vec3 p){
          return fract(
            sin(dot(p,vec3(12.9898,78.233,54.53)))
            *43758.5453
          );
        }

        void main(){

          vec3 p = vPos * 0.02;

          float n =
            noise(p + vec3(0.0,uTime*0.02,0.0)) +
            noise(p*2.0 + vec3(0.0,uTime*0.01,0.0));

          n *= 0.5;

          float d = length(vPos) / 700.0;

          float fog =
            smoothstep(0.85,0.25,d) * n;

          vec3 color =
            mix(
              vec3(0.05,0.08,0.25),
              vec3(0.35,0.5,0.9),
              n
            );

          float alpha = fog * 0.12;

          gl_FragColor =
            vec4(color,alpha);

        }

      `

    })

  },[])

  useFrame((state,delta)=>{

    if(mesh.current){
      mesh.current.rotation.y += delta * 0.00025
      mesh.current.rotation.x += delta * 0.00008
    }

    if(mat.current){
      mat.current.uniforms.uTime.value =
        state.clock.elapsedTime
    }

  })

  return(
    <mesh ref={mesh} material={material}>
      <sphereGeometry args={[700,64,64]} />
    </mesh>
  )

}