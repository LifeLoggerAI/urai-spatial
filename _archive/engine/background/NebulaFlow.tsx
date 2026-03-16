"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function NebulaFlow(){

  const mesh = useRef<THREE.Mesh>(null!)
  const mat = useRef<THREE.ShaderMaterial>(null!)

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,

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

        float hash(vec3 p){
          return fract(
            sin(dot(p,vec3(127.1,311.7,74.7))) *
            43758.5453
          );
        }

        float noise(vec3 p){

          vec3 i = floor(p);
          vec3 f = fract(p);

          f = f*f*(3.0-2.0*f);

          float n =
            mix(
              mix(
                mix(hash(i+vec3(0,0,0)),
                    hash(i+vec3(1,0,0)),f.x),
                mix(hash(i+vec3(0,1,0)),
                    hash(i+vec3(1,1,0)),f.x),
                f.y),
              mix(
                mix(hash(i+vec3(0,0,1)),
                    hash(i+vec3(1,0,1)),f.x),
                mix(hash(i+vec3(0,1,1)),
                    hash(i+vec3(1,1,1)),f.x),
                f.y),
              f.z
            );

          return n;

        }

        void main(){

          vec3 p = vPos * 0.004;

          float n =
            noise(p + vec3(0.0, uTime * 0.02, 0.0));

          vec3 col =
            mix(
              vec3(0.02,0.04,0.08),
              vec3(0.16,0.24,0.55),
              n
            );

          float alpha =
            smoothstep(0.35,0.75,n) * 0.20;

          gl_FragColor =
            vec4(col,alpha);

        }

      `

    })

  },[])

  useFrame((state)=>{

    if(mat.current){
      mat.current.uniforms.uTime.value =
        state.clock.elapsedTime
    }

    if(mesh.current){
      mesh.current.rotation.y += 0.00008
    }

  })

  return(
    <mesh ref={mesh} material={material}>
      <sphereGeometry args={[1200,64,64]} />
    </mesh>
  )
}