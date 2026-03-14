"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function Nebula(){

  const mat = useRef<THREE.ShaderMaterial>(null!)

  useFrame(({clock})=>{
    if(mat.current){
      mat.current.uniforms.time.value =
        clock.elapsedTime
    }
  })

  return(

    <mesh
      scale={[1000,1000,1]}
      position={[0,0,-500]}
    >

      <planeGeometry args={[2,2]} />

      <shaderMaterial
        ref={mat}

        transparent
        depthWrite={false}

        /* critical: avoid additive wash */
        blending={THREE.NormalBlending}

        uniforms={{
          time:{value:0}
        }}

        vertexShader={`

          varying vec2 vUv;

          void main(){

            vUv = uv;

            gl_Position =
              projectionMatrix *
              modelViewMatrix *
              vec4(position,1.0);

          }

        `}

        fragmentShader={`

          varying vec2 vUv;
          uniform float time;

          float hash(vec2 p){
            return fract(
              sin(dot(p,vec2(127.1,311.7)))
              *43758.5453123
            );
          }

          float noise(vec2 p){

            vec2 i = floor(p);
            vec2 f = fract(p);

            float a = hash(i);
            float b = hash(i + vec2(1.0,0.0));
            float c = hash(i + vec2(0.0,1.0));
            float d = hash(i + vec2(1.0,1.0));

            vec2 u = f*f*(3.0-2.0*f);

            return mix(a,b,u.x)
              + (c-a)*u.y*(1.0-u.x)
              + (d-b)*u.x*u.y;

          }

          void main(){

            vec2 uv = vUv * 3.0;

            float t = time * 0.02;

            float n =
              noise(uv + t);

            float n2 =
              noise(uv*2.0 - t*0.7);

            float neb =
              smoothstep(0.45,0.85,n+n2*0.5);

            vec3 col =
              vec3(0.015,0.03,0.08) +
              neb * vec3(0.12,0.10,0.25);

            /* lower opacity to prevent wash */

            float alpha =
              neb * 0.12;

            gl_FragColor =
              vec4(col,alpha);

          }

        `}
      />

    </mesh>

  )

}