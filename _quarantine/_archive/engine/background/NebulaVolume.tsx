"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function NebulaVolume(){

  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  useFrame((state,delta)=>{

    const mesh = meshRef.current
    const mat = matRef.current

    if(mesh){
      mesh.rotation.y += delta * 0.0006
    }

    if(mat){
      mat.uniforms.uTime.value = state.clock.elapsedTime
    }

  })

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      side:THREE.BackSide,
      transparent:true,
      depthWrite:false,
      blending:THREE.NormalBlending,

      uniforms:{
        uTime:{value:0},
        c1:{value:new THREE.Color("#040814")},
        c2:{value:new THREE.Color("#2f4cff")}
      },

      vertexShader:`

        precision highp float;

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

        uniform vec3 c1;
        uniform vec3 c2;
        uniform float uTime;

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
            mix(hash(i),hash(i+vec3(1.0,0.0,0.0)),f.x),
            mix(hash(i+vec3(0.0,1.0,0.0)),hash(i+vec3(1.0,1.0,0.0)),f.x),
            f.y
          );

          return n;

        }

        void main(){

          vec3 p =
            vPos * 0.003 +
            vec3(0.0,uTime*0.01,0.0);

          float n =
            noise(p) +
            noise(p*2.0)*0.5;

          vec3 color =
            mix(c1,c2,n);

          float alpha =
            smoothstep(0.35,0.75,n) * 0.15;

          gl_FragColor =
            vec4(color,alpha);

        }

      `
    })

  },[])

  return(

    <mesh ref={meshRef} frustumCulled={false}>

      <sphereGeometry args={[1200,64,64]} />

      <shaderMaterial
        ref={matRef}
        args={[material]}
        attach="material"
      />

    </mesh>

  )

}