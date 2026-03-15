"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function NebulaSky(){

  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const geometry = useMemo(()=>{
    return new THREE.SphereGeometry(600,64,64)
  },[])

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      side:THREE.BackSide,
      depthWrite:false,

      uniforms:{
        time:{ value:0 }
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

        varying vec3 vPos;
        uniform float time;

        float hash(vec3 p){
          p = fract(p * 0.3183099 + .1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
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
              f.z);

          return n;
        }

        void main(){

          vec3 p = normalize(vPos);

          vec3 warp =
            vec3(
              noise(p*4.0 + time*0.03),
              noise(p*4.0 + time*0.02),
              noise(p*4.0 + time*0.04)
            );

          p += warp*0.2;

          float n =
            noise(p*6.0) +
            noise(p*12.0)*0.5 +
            noise(p*24.0)*0.25;

          vec3 colA = vec3(0.03,0.02,0.08);
          vec3 colB = vec3(0.2,0.05,0.4);
          vec3 colC = vec3(0.05,0.2,0.35);

          vec3 nebula = mix(colA,colB,n);
          nebula = mix(nebula,colC,n*0.5);

          float stars = step(0.995,noise(p*200.0));

          vec3 color =
            nebula +
            stars*vec3(1.0);

          gl_FragColor =
            vec4(color,1.0);

        }

      `
    })

  },[])

  useFrame((state)=>{
    if(materialRef.current){
      materialRef.current.uniforms.time.value =
        state.clock.elapsedTime
    }
  })

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={materialRef} args={[material]} />
    </mesh>
  )

}