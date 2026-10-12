'use client'

import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { makeGalacticSpiralPoints, type GalacticDepthBand, type GalacticQuality } from './galacticSpiralStructure'

// Three independent world-depth fields, not a painted skybox. Camera travel
// produces genuine parallax, and depth testing preserves authored stellar nodes.
function DustBand({ band, tier }: { band: GalacticDepthBand; tier: GalacticQuality }) {
  const { gl, size } = useThree()
  const sample = useMemo(() => makeGalacticSpiralPoints(band, tier), [band, tier])
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(sample.positions, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(sample.colors, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(sample.pointSizes, 1))
    g.computeBoundingSphere()
    return g
  }, [sample])
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uViewport: { value: 1 },
      uOpacity: { value: band === 'foreground' ? 0.24 : band === 'middle' ? 0.32 : 0.26 },
    },
    transparent: true, depthTest: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      varying vec3 vDustColor;
      uniform float uViewport;
      void main() {
        vDustColor = aColor;
        vec4 eye = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * eye;
        gl_PointSize = clamp((aSize * uViewport) / max(1.0, -eye.z), 1.5, 64.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDustColor;
      uniform float uOpacity;
      void main() {
        float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
        if (radius >= 1.0) discard;
        float diffuse = exp(-radius * radius * 4.4);
        float softEdge = 1.0 - smoothstep(0.48, 1.0, radius);
        gl_FragColor = vec4(vDustColor, diffuse * softEdge * uOpacity);
        #include <colorspace_fragment>
      }
    `,
  }), [band])
  useEffect(() => { material.uniforms.uViewport.value = size.height * gl.getPixelRatio() * 3.4 }, [gl, material, size.height])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  return <points name={'life-map-galactic-arm-' + band} geometry={geometry} raycast={() => null}
    userData={{ truthClass: 'environment-only', semanticMemories: false, depthBand: band }}>
    <primitive object={material} attach="material" />
  </points>
}

export default function GalacticSpiralStructure({ tier }: { tier: GalacticQuality }) {
  return <group name="life-map-three-depth-spiral-nebula" userData={{ semanticMemories: false, staticPaintedBackdrop: false }}>
    <DustBand band="far" tier={tier} />
    <DustBand band="middle" tier={tier} />
    <DustBand band="foreground" tier={tier} />
  </group>
}
