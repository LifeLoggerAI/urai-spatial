"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

type Props = {
  radius?: number
  speed?: number
  colorA?: string
  colorB?: string
  opacity?: number
  starDensity?: number
}

export default function NebulaLayer({
  radius = 1500,
  speed = 0.00012,
  colorA = "#050714",
  colorB = "#2c4cff",
  opacity = 0.18,
  starDensity = 1.0
}: Props) {

  const mesh = useRef<THREE.Mesh>(null!)

  const material = useMemo(() => {

    return new THREE.ShaderMaterial({

      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,

      uniforms: {
        uTime: { value: 0 },
        starDensity: { value: starDensity },
        c1: { value: new THREE.Color(colorA) },
        c2: { value: new THREE.Color(colorB) },
        uOpacity: { value: opacity },
        uRadius: { value: radius }
      },

      vertexShader: `

        varying vec3 vPos;

        void main() {

          vPos = position;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position,1.0);

        }

      `,

      fragmentShader: `

        varying vec3 vPos;

        uniform float uTime;
        uniform float starDensity;
        uniform float uOpacity;
        uniform float uRadius;

        uniform vec3 c1;
        uniform vec3 c2;

        float hash(vec3 p){
          p = fract(p * 0.3183099 + vec3(.1,.2,.3));
          p *= 17.0;
          return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
        }

        float noise(vec3 x){

          vec3 i = floor(x);
          vec3 f = fract(x);

          f = f*f*(3.0-2.0*f);

          float n = mix(
            mix(
              mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
              mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),
              f.y),
            mix(
              mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
              mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),
              f.y),
            f.z
          );

          return n;

        }

        vec3 curl(vec3 p){

          float e = 0.08;

          float nx = noise(p + vec3(0,e,0)) - noise(p - vec3(0,e,0));
          float ny = noise(p + vec3(0,0,e)) - noise(p - vec3(0,0,e));
          float nz = noise(p + vec3(e,0,0)) - noise(p - vec3(e,0,0));

          return vec3(nx,ny,nz);

        }

        void main(){

          vec3 p =
            vPos * 0.002 +
            vec3(0.0, uTime * 0.02, 0.0);

          vec3 flow =
            curl(p) * 2.0;

          float base =
            noise(p + flow);

          float detail =
            noise(p*2.0 + flow*0.5) * 0.5;

          float nebula =
            smoothstep(0.32,0.75, base + detail);

          float radial =
            smoothstep(uRadius, uRadius * 0.2, length(vPos));

          float density =
            nebula * radial * starDensity;

          vec3 col =
            mix(c1,c2,nebula);

          gl_FragColor =
            vec4(col, density * uOpacity);

        }

      `

    })

  }, [colorA, colorB, opacity, starDensity, radius])

  useFrame((state) => {

    material.uniforms.uTime.value = state.clock.elapsedTime

    if (mesh.current) {
      mesh.current.rotation.y += speed
    }

  })

  return (

    <mesh ref={mesh} material={material}>
      <sphereGeometry args={[radius, 64, 64]} />
    </mesh>

  )

}