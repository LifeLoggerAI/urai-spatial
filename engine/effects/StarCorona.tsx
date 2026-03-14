"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const CORONA_COUNT = 900

export default function StarCorona(){

  const matRef = useRef<THREE.ShaderMaterial>(null!)

  useFrame((state)=>{
    if(matRef.current){
      matRef.current.uniforms.time.value =
        state.clock.elapsedTime
    }
  })

  const {geo,mat} = useMemo(()=>{

    const positions:number[]=[]
    const sizes:number[]=[]
    const colors:number[]=[]

    const color = new THREE.Color()

    for(let i=0;i<CORONA_COUNT;i++){

      /* weighted radial distribution */

      const r = 120 + Math.pow(Math.random(),0.7) * 380

      const theta = Math.random()*Math.PI*2
      const phi = Math.acos(Math.random()*2-1)

      const x = r*Math.sin(phi)*Math.cos(theta)
      const y = r*Math.sin(phi)*Math.sin(theta)
      const z = r*Math.cos(phi)

      positions.push(x,y,z)

      sizes.push(28 + Math.random()*55)

      color.setRGB(
        1,
        0.88 + Math.random()*0.12,
        0.72 + Math.random()*0.28
      )

      colors.push(color.r,color.g,color.b)

    }

    const geo = new THREE.BufferGeometry()

    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions,3)
    )

    geo.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(sizes,1)
    )

    geo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors,3)
    )

    const mat = new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,
      depthTest:true,
      blending:THREE.AdditiveBlending,
      vertexColors:true,

      uniforms:{
        time:{value:0}
      },

      vertexShader:`

        attribute float size;

        varying vec3 vColor;
        varying float vDist;

        void main(){

          vColor = color;

          vec4 mvPosition =
            modelViewMatrix *
            vec4(position,1.0);

          float dist = -mvPosition.z;

          vDist = dist;

          float scale =
            clamp(320.0 / dist, 0.7, 6.0);

          gl_PointSize =
            size * scale;

          gl_Position =
            projectionMatrix *
            mvPosition;

        }

      `,

      fragmentShader:`

        uniform float time;

        varying vec3 vColor;
        varying float vDist;

        float hash(vec2 p){
          return fract(
            sin(dot(p,vec2(127.1,311.7)))*
            43758.5453123
          );
        }

        float smoothNoise(vec2 p){

          vec2 i = floor(p);
          vec2 f = fract(p);

          float a = hash(i);
          float b = hash(i + vec2(1.0,0.0));
          float c = hash(i + vec2(0.0,1.0));
          float d = hash(i + vec2(1.0,1.0));

          vec2 u = f*f*(3.0-2.0*f);

          return mix(a,b,u.x) +
                 (c-a)*u.y*(1.0-u.x) +
                 (d-b)*u.x*u.y;

        }

        void main(){

          vec2 uv =
            gl_PointCoord - 0.5;

          float r = length(uv);

          if(r > 0.5) discard;

          float radial =
            smoothstep(0.5,0.0,r);

          float flicker =
            sin(time*2.4 + r*22.0) * 0.08 + 0.92;

          float turbulence =
            smoothNoise(uv*6.0 + time*0.3);

          float corona =
            radial * flicker *
            (0.75 + turbulence*0.55);

          vec3 col =
            vColor * corona * 1.35;

          gl_FragColor =
            vec4(col, corona*0.55);

        }

      `
    })

    return {geo,mat}

  },[])

  return (
    <points
      geometry={geo}
      frustumCulled={false}
    >
      <primitive
        object={mat}
        ref={matRef}
        attach="material"
      />
    </points>
  )
}