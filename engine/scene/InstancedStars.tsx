"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const COUNT = 18000
const ARMS = 4
const RADIUS = 420
const INNER_RADIUS = 40

function mulberry32(seed:number){
  let a = seed
  return ()=>{
    let t = (a += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function InstancedStars(){

  const meshRef = useRef<THREE.InstancedMesh>(null!)

  const { mesh, material } = useMemo(()=>{

    const rand = mulberry32(42)

    const geometry = new THREE.PlaneGeometry(1,1)

    const material = new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,
      depthTest:true,
      blending:THREE.AdditiveBlending,
      side:THREE.DoubleSide,

      uniforms:{
        uTime:{ value:0 }
      },

      vertexShader:`

        attribute float temp;

        varying float vTemp;
        varying vec2 vUv;

        void main(){

          vTemp = temp;
          vUv = uv;

          vec4 mvPosition =
            modelViewMatrix *
            instanceMatrix *
            vec4(position,1.0);

          gl_Position =
            projectionMatrix *
            mvPosition;

        }

      `,

      fragmentShader:`

        varying float vTemp;
        varying vec2 vUv;

        void main(){

          vec2 p = vUv - 0.5;

          float d = length(p);

          float glow =
            smoothstep(0.55,0.0,d);

          if(glow <= 0.01) discard;

          vec3 warm = vec3(1.0,0.9,0.7);
          vec3 cool = vec3(0.7,0.85,1.0);

          vec3 color =
            mix(cool,warm,vTemp);

          gl_FragColor =
            vec4(color,glow);

        }

      `
    })

    const mesh =
      new THREE.InstancedMesh(
        geometry,
        material,
        COUNT
      )

    const dummy = new THREE.Object3D()

    const temps =
      new Float32Array(COUNT)

    for(let i=0;i<COUNT;i++){

      const arm = i % ARMS

      const r =
        INNER_RADIUS +
        Math.pow(rand(),0.7) *
        (RADIUS-INNER_RADIUS)

      const armAngle =
        (arm/ARMS)*Math.PI*2

      const spiral =
        r*0.018

      const angle =
        armAngle + spiral

      const x =
        Math.cos(angle)*r +
        (rand()-0.5)*4

      const z =
        Math.sin(angle)*r +
        (rand()-0.5)*4

      const y =
        (rand()-0.5)*18

      dummy.position.set(x,y,z)

      const s =
        1.6 + rand()*2.6

      dummy.scale.set(s,s,s)

      dummy.updateMatrix()

      mesh.setMatrixAt(i,dummy.matrix)

      temps[i]=rand()

    }

    geometry.setAttribute(
      "temp",
      new THREE.InstancedBufferAttribute(
        temps,1
      )
    )

    mesh.instanceMatrix.needsUpdate=true

    return { mesh, material }

  },[])

  useFrame((state)=>{

    if(!meshRef.current) return

    meshRef.current.rotation.y += 0.00018

    material.uniforms.uTime.value =
      state.clock.elapsedTime

  })

  return(
    <primitive
      ref={meshRef}
      object={mesh}
      frustumCulled={false}
      renderOrder={1}
    />
  )
}