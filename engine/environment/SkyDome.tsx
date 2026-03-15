"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function SkyDome(){

  const geometry = useMemo(
    () => new THREE.SphereGeometry(1, 64, 64),
    []
  )

  const material = useMemo(() => {

    return new THREE.ShaderMaterial({

      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,

      uniforms: {
        topColor: { value: new THREE.Color("#05070d") },
        bottomColor: { value: new THREE.Color("#000000") }
      },

      vertexShader: `
        varying vec3 vWorldPosition;

        void main(){

          vec4 worldPosition = modelMatrix * vec4(position,1.0);
          vWorldPosition = worldPosition.xyz;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position,1.0);

        }
      `,

      fragmentShader: `
        varying vec3 vWorldPosition;

        uniform vec3 topColor;
        uniform vec3 bottomColor;

        void main(){

          float h = normalize(vWorldPosition).y * 0.5 + 0.5;

          vec3 color = mix(bottomColor, topColor, h);

          gl_FragColor = vec4(color,1.0);

        }
      `

    })

  }, [])

  return(

    <mesh
      geometry={geometry}
      material={material}
      scale={500}
      frustumCulled={false}
      renderOrder={-20}
    />

  )

}