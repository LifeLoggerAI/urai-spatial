"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function CurlNebula(){

  const mesh = useRef<THREE.Mesh>(null!)
  const mat = useRef<THREE.ShaderMaterial>(null!)

  useFrame((state,delta)=>{

    if(mesh.current){
      mesh.current.rotation.y += delta * 0.00025
    }

    if(mat.current){
      mat.current.uniforms.uTime.value =
        state.clock.elapsedTime
    }

  })

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,

      /* critical fix */
      blending:THREE.NormalBlending,

      side:THREE.BackSide,

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
            sin(dot(p,vec3(127.1,311.7,74.7)))
            *43758.5453
          );
        }

        float noise(vec3 p){

          vec3 i = floor(p);
          vec3 f = fract(p);

          float n = mix(
            mix(hash(i),hash(i+vec3(1,0,0)),f.x),
            mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),
            f.y
          );

          return n;

        }

        vec3 curl(vec3 p){

          float e = 0.1;

          float dx =
            noise(p+vec3(e,0,0)) -
            noise(p-vec3(e,0,0));

          float dy =
            noise(p+vec3(0,e,0)) -
            noise(p-vec3(0,e,0));

          float dz =
            noise(p+vec3(0,0,e)) -
            noise(p-vec3(0,0,e));

          return normalize(
            vec3(dy-dz,dz-dx,dx-dy)
          );

        }

        void main(){

          vec3 p =
            vPos * 0.02;

          p +=
            curl(p + uTime*0.1);

          float n =
            noise(p*2.0);

          float d =
            length(vPos)/700.0;

          float fog =
            smoothstep(0.85,0.25,d) *
            n;

          vec3 color =
            mix(
              vec3(0.04,0.06,0.2),
              vec3(0.35,0.5,0.9),
              n
            );

          /* reduce opacity drastically */

          float alpha =
            fog * 0.12;

          gl_FragColor =
            vec4(color,alpha);

        }

      `
    })

  },[])

  return(
    <mesh ref={mesh}>
      <sphereGeometry args={[700,64,64]} />
      <primitive object={material} ref={mat}/>
    </mesh>
  )

}