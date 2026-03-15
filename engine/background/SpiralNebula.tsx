"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function SpiralNebula(){

  const mat = useRef<THREE.ShaderMaterial>(null!)

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,

      uniforms:{
        time:{ value:0 },
        radius:{ value:480 },
        arms:{ value:4 }
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

        uniform float time;
        uniform float radius;
        uniform float arms;

        varying vec3 vPos;

        float hash(vec2 p){
          return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
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

        vec2 curl(vec2 p){

          float eps = 0.1;

          float n1 = noise(p + vec2(0,eps));
          float n2 = noise(p - vec2(0,eps));
          float a = (n1-n2)/(2.0*eps);

          n1 = noise(p + vec2(eps,0));
          n2 = noise(p - vec2(eps,0));
          float b = (n1-n2)/(2.0*eps);

          return vec2(a,-b);
        }

        void main(){

          vec2 p = vPos.xz;

          float r = length(p)/radius;

          if(r > 1.0) discard;

          float angle = atan(p.y,p.x);

          vec2 turb =
            curl(p*0.02 + time*0.02);

          p += turb*20.0;

          float spiral =
            sin(angle*arms + r*9.0 - time*0.12);

          float armMask =
            smoothstep(0.35,0.0,abs(spiral));

          float cloud =
            noise(p*0.015 + time*0.04);

          float density =
            armMask * cloud * (1.0-r);

          float hotspot =
            pow(noise(p*0.06 + time*0.2),8.0);

          density += hotspot*0.8;

          density = clamp(density,0.0,1.0);

          vec3 colorA = vec3(0.10,0.16,0.55);
          vec3 colorB = vec3(0.35,0.22,0.75);
          vec3 colorC = vec3(0.8,0.4,0.2);

          vec3 base =
            mix(colorA,colorB,density);

          base =
            mix(base,colorC,hotspot);

          float fog =
            smoothstep(1.0,0.2,r);

          gl_FragColor =
            vec4(base,density*0.12*fog);

        }

      `

    })

  },[])

  useFrame((_,dt)=>{
    if(mat.current){
      mat.current.uniforms.time.value += dt
    }
  })

  return(

    <mesh
      material={material}
      rotation={[Math.PI/2,0,0]}
      frustumCulled={false}
    >
      <circleGeometry args={[520,160]} />
    </mesh>

  )

}