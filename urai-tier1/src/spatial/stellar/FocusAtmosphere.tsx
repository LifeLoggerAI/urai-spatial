'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { SpatialQualityProfile } from '@/spatial/performance/useAdaptiveSpatialQuality'

type FocusAtmosphereProps = {
  profile: SpatialQualityProfile
  sky: string
  accent: string
  light: string
}

const BUDGET = {
  low: { stars: 92, dust: 0 },
  medium: { stars: 144, dust: 8 },
  high: { stars: 216, dust: 14 },
} as const

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function particleGeometry(count: number, dust: boolean) {
  const random = seededRandom(dust ? 45117 : 72031)
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const opacities = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    if (dust) {
      // Keep the sparse, closer particles outside the photosphere's immediate
      // neighborhood. They establish parallax without orbiting the memory.
      positions[index * 3] = (index % 2 ? 1 : -1) * (2.8 + random() * 5.5)
      positions[index * 3 + 1] = -3.5 + random() * 8
      positions[index * 3 + 2] = -5 - random() * 12
      sizes[index] = 0.18 + random() * 0.12
      opacities[index] = 0.07 + random() * 0.06
    } else {
      const vertical = random() * 2 - 1
      const azimuth = random() * Math.PI * 2
      const ring = Math.sqrt(1 - vertical * vertical)
      // Interleaved depth bands retain the same first stars at every quality tier.
      const radius = index % 3 === 0 ? 34 + random() * 14 : 64 + random() * 22
      positions[index * 3] = ring * Math.cos(azimuth) * radius
      positions[index * 3 + 1] = vertical * radius
      positions[index * 3 + 2] = ring * Math.sin(azimuth) * radius
      sizes[index] = 0.65 + random() * 0.85
      opacities[index] = 0.22 + random() * 0.32
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1))
  geometry.computeBoundingSphere()
  return geometry
}

function particleMaterial(tint: THREE.Color, sky: string, dust: boolean, pixelRatio: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTint: { value: tint },
      uSky: { value: new THREE.Color(sky) },
      uPixelRatio: { value: pixelRatio },
      uTime: { value: 0 },
      uDrift: { value: dust ? 1 : 0 },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aOpacity;
      uniform float uPixelRatio;
      uniform float uTime;
      uniform float uDrift;
      varying float vOpacity;
      varying float vDepth;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * .025 + position.y) * .045 * uDrift;
        p.y += sin(uTime * .019 + position.z) * .035 * uDrift;
        vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
        vDepth = max(1.0, -viewPosition.z);
        vOpacity = aOpacity;
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = clamp(aSize * 50.0 / vDepth, .55, 2.15) * uPixelRatio;
      }
    `,
    fragmentShader: `
      uniform vec3 uTint;
      uniform vec3 uSky;
      varying float vOpacity;
      varying float vDepth;
      void main() {
        float radius = length(gl_PointCoord - vec2(.5));
        float disc = 1.0 - smoothstep(.18, .5, radius);
        float haze = smoothstep(28.0, 110.0, vDepth);
        float alpha = disc * vOpacity * (1.0 - haze * .62);
        if (alpha < .004) discard;
        gl_FragColor = vec4(mix(uTint, uSky, haze * .30), alpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
  })
}

/** Scene geometry only; the selected star and its memory remain the visual owner. */
export default function FocusAtmosphere({ profile, sky, accent, light }: FocusAtmosphereProps) {
  const gl = useThree(state => state.gl)
  const budget = BUDGET[profile.tier]
  const starsGeometry = useMemo(() => particleGeometry(budget.stars, false), [budget.stars])
  const dustGeometry = useMemo(() => particleGeometry(budget.dust, true), [budget.dust])
  const starsMaterial = useMemo(() => particleMaterial(
    new THREE.Color(light).lerp(new THREE.Color('#a4b2c1'), 0.88),
    sky,
    false,
    gl.getPixelRatio(),
  ), [gl, light, sky])
  const dustMaterial = useMemo(() => particleMaterial(
    new THREE.Color(accent).lerp(new THREE.Color('#86919d'), 0.88),
    sky,
    true,
    gl.getPixelRatio(),
  ), [accent, gl, sky])

  useEffect(() => () => starsGeometry.dispose(), [starsGeometry])
  useEffect(() => () => dustGeometry.dispose(), [dustGeometry])
  useEffect(() => () => starsMaterial.dispose(), [starsMaterial])
  useEffect(() => () => dustMaterial.dispose(), [dustMaterial])

  useFrame(({ clock }) => {
    if (!profile.documentVisible) return
    const pixelRatio = gl.getPixelRatio()
    starsMaterial.uniforms.uPixelRatio.value = pixelRatio
    dustMaterial.uniforms.uPixelRatio.value = pixelRatio
    dustMaterial.uniforms.uTime.value = profile.reducedMotion ? 0 : clock.elapsedTime
  })

  return <>
    <color attach="background" args={[sky]} />
    <fog attach="fog" args={[sky, 28, 110]} />
    <group name="focus-depth-atmosphere" position={[0, 0.35, -1.55]} userData={{ qualityTier: profile.tier, stars: budget.stars, dust: budget.dust, reducedMotion: profile.reducedMotion }}>
      <points name="focus-distant-stars" raycast={() => null} dispose={null}>
        <primitive object={starsGeometry} attach="geometry" />
        <primitive object={starsMaterial} attach="material" />
      </points>
      {budget.dust > 0 ? <points name="focus-sparse-depth-dust" raycast={() => null} dispose={null}>
        <primitive object={dustGeometry} attach="geometry" />
        <primitive object={dustMaterial} attach="material" />
      </points> : null}
    </group>
  </>
}
