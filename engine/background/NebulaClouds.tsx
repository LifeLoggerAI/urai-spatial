"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function NebulaClouds(){

  const mesh = useRef<THREE.Mesh>(null!)

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,

      uniforms:{
        uTime:{value:0},
        colorA:{value:new THREE.Color("#0b1030")},
        colorB:{value:new THREE.Color("#3a6bff")}
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

        uniform float uTime;
        uniform vec3 colorA;
        uniform vec3 colorB;

        varying vec3 vPos;

        float hash(vec3 p){
          return fract(
            sin(dot(p,vec3(12.9898,78.233,45.164))) *
            43758.5453
          );
        }

        float noise(vec3 p){

          vec3 i = floor(p);
          vec3 f = fract(p);

          f = f*f*(3.0-2.0*f);

          float n = mix(
            mix(hash(i),hash(i+vec3(1,0,0)),f.x),
            mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),
            f.y
          );

          return n;

        }

        void main(){

          vec3 p =
            vPos * 0.0025 +
            vec3(0.0,uTime*0.018,0.0);

          float base =
            noise(p);

          float detail =
            noise(p*2.0)*0.5 +
            noise(p*4.0)*0.25;

          float clouds =
            base + detail;

          float density =
            smoothstep(0.32,0.78,clouds);

          float radial =
            smoothstep(1600.0,200.0,length(vPos));

          density *= radial;

          vec3 col =
            mix(colorA,colorB,clouds);

          gl_FragColor =
            vec4(col,density*0.35);

        }

      `

    })

  },[])

  useFrame((state,delta)=>{

    if(mesh.current){
      mesh.current.rotation.y += delta * 0.006
      mesh.current.rotation.z += delta * 0.0015
    }

    material.uniforms.uTime.value =
      state.clock.elapsedTime

  })

  return(

    <mesh ref={mesh} material={material}>
      <sphereGeometry args={[1900,64,64]} />
    </mesh>

  )

}