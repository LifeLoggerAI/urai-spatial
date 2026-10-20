'use client'

import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import StellarCorona from './StellarCorona'
import {
  STELLAR_MEMORY_REVEAL,
  STELLAR_MEMORY_UNIFORMS,
  useStellarMemoryTexture,
  type StellarMemoryState,
} from './stellarMemoryReveal'

export const FOCUS_STAR_POSITION: [number, number, number] = [0, 0.35, -1.55]
export const FOCUS_STAR_RADIUS = 1.15

export type StellarPhotosphereProps = {
  accent: string
  light: string
  reducedMotion: boolean
  memoryImageUrl: string | null
  quality?: 'low' | 'medium' | 'high'
  onMemoryState?: (state: StellarMemoryState) => void
}

const sphereSegments = {
  low: [56, 40],
  medium: [80, 64],
  high: [96, 80],
} as const

const photosphereVertex = `
  uniform float uTime;
  varying vec3 vObjectPosition;
  varying vec3 vNormalView;
  varying vec3 vViewDirection;

  void main() {
    vec3 p = normalize(position);
    float convection = sin(p.x * 19.0 + p.y * 13.0 + uTime * .055)
      * sin(p.z * 23.0 - p.x * 11.0 - uTime * .038);
    float grain = sin((p.x - p.z) * 47.0 + p.y * 31.0 + uTime * .071);
    // Surface activity is minute; broad deformation would read as a solid body.
    vec3 displaced = position + normal * (convection * .0026 + grain * .0011);
    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
    vObjectPosition = displaced;
    vNormalView = normalize(normalMatrix * normal);
    vViewDirection = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`

const photosphereFragment = `
  uniform float uTime;
  uniform float uFineDetail;
  uniform vec3 uAccent;
  uniform vec3 uLight;
  ${STELLAR_MEMORY_UNIFORMS}
  varying vec3 vObjectPosition;
  varying vec3 vNormalView;
  varying vec3 vViewDirection;

  float stellarHash(vec3 p) {
    p = fract(p * .3183099 + .113);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float stellarNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(stellarHash(i), stellarHash(i + vec3(1,0,0)), f.x),
          mix(stellarHash(i + vec3(0,1,0)), stellarHash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(stellarHash(i + vec3(0,0,1)), stellarHash(i + vec3(1,0,1)), f.x),
          mix(stellarHash(i + vec3(0,1,1)), stellarHash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  ${STELLAR_MEMORY_REVEAL}

  void main() {
    vec3 p = normalize(vObjectPosition);
    float t = uTime * .045;
    // Retain the existing photospheric scales. The large signal is granular,
    // with no low-frequency continents or external directional illumination.
    float coarse = stellarNoise(p * 17.0 + vec3(t * .34, -t * .21, t * .15));
    float medium = stellarNoise(p * 41.0 - vec3(t * .19, t * .14, -t * .11)
      + (coarse - .5) * .62);
    float fine = stellarNoise(p * 93.0 + vec3(-t * .11, t * .16, t * .07)
      + (medium - .5) * .83);
    float micro = .5;
    if (uFineDetail > .5) {
      micro = stellarNoise(p * 151.0 - vec3(t * .05, -t * .08, t * .04));
    }

    // Fine luminous cells own the face; large dark islands suggest albedo/rock.
    float cells = smoothstep(.31, .71, coarse * .08 + medium * .25 + fine * .50 + micro * .17);
    float intergranular = smoothstep(.36, .63, fine * .70 + micro * .30);
    float faculae = smoothstep(.76, .92, fine * .62 + micro * .38);
    float pores = smoothstep(.90, .99, micro);
    float heat = clamp(cells * .70 + medium * .20 + fine * .10, 0.0, 1.0);
    float viewFacing = clamp(dot(normalize(vNormalView), normalize(vViewDirection)), 0.0, 1.0);
    float limb = pow(viewFacing, .55);

    vec3 solarAmber = vec3(1.0, .30, .022);
    vec3 solarGold = vec3(1.0, .64, .09);
    vec3 hotCream = vec3(1.0, .90, .50);
    vec3 surface = mix(solarAmber, solarGold, .28 + heat * .65);
    surface = mix(surface, hotCream, pow(heat, 8.0) * .25 + faculae * .08);
    // Memory color is an accent in stellar light, rather than the body's owner.
    surface = mix(surface, uAccent, .04);
    surface = mix(surface, uLight, .012);
    float radiance = (.78 + cells * .38 + micro * .045 + faculae * .18)
      * (.64 + limb * .36);
    // Related granules share gentle convective heat, never broad dark terrain.
    radiance *= .94 + coarse * .10;
    radiance *= .89 + intergranular * .11;
    radiance *= 1.0 - pores * .055;
    vec3 emitted = surface * radiance
      + solarGold * .10 + hotCream * (.006 + faculae * .018);
    // A soft shoulder preserves cell contrast instead of clipping hot cells white.
    emitted = emitted / (vec3(1.0) + emitted * .38);
    emitted = revealStellarMemory(emitted, vNormalView, cells, uTime);
    gl_FragColor = vec4(emitted, 1.0);
    #include <colorspace_fragment>
  }
`

/** One emissive stellar surface also carries the selected memory. */
export default function StellarPhotosphere({
  accent,
  light,
  reducedMotion,
  memoryImageUrl,
  quality = 'medium',
  onMemoryState,
}: StellarPhotosphereProps) {
  const { texture, aspect, state } = useStellarMemoryTexture(memoryImageUrl, onMemoryState)
  const emptyMemory = useMemo(() => {
    const placeholder = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat)
    placeholder.needsUpdate = true
    return placeholder
  }, [])
  const photosphere = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFineDetail: { value: 1 },
      uAccent: { value: new THREE.Color() },
      uLight: { value: new THREE.Color() },
      uMemoryTexture: { value: emptyMemory },
      uMemoryAspect: { value: 1 },
      uMemoryReady: { value: 0 },
      uReveal: { value: 0 },
    },
    vertexShader: photosphereVertex,
    fragmentShader: photosphereFragment,
    transparent: false,
    toneMapped: false,
  }), [emptyMemory])

  useEffect(() => () => {
    photosphere.dispose()
    emptyMemory.dispose()
  }, [emptyMemory, photosphere])

  useEffect(() => {
    photosphere.uniforms.uAccent.value.set(accent)
    photosphere.uniforms.uLight.value.set(light)
    photosphere.uniforms.uFineDetail.value = quality === 'low' ? 0 : 1
  }, [accent, light, photosphere, quality])

  useEffect(() => { photosphere.uniforms.uReveal.value = 0 }, [memoryImageUrl, photosphere])

  useFrame(({ gl }, delta) => {
    // Apply the hook's key-qualified selection before every draw. A newly
    // selected URL cannot render a texture left over from the previous memory.
    photosphere.uniforms.uMemoryTexture.value = texture ?? emptyMemory
    photosphere.uniforms.uMemoryAspect.value = aspect
    const targetReveal = state === 'ready' && texture ? 1 : 0
    photosphere.uniforms.uMemoryReady.value = targetReveal
    const frameDelta = Math.min(delta, .05)
    // Accumulated phase avoids a surge after backgrounding or toggling calmer motion.
    if (!reducedMotion) photosphere.uniforms.uTime.value += frameDelta
    photosphere.uniforms.uReveal.value = reducedMotion
      ? targetReveal
      : THREE.MathUtils.damp(photosphere.uniforms.uReveal.value, targetReveal, 3.2, Math.min(delta, .25))
    gl.domElement.dataset.focusMemoryReveal = photosphere.uniforms.uReveal.value.toFixed(3)
  })

  const [widthSegments, heightSegments] = sphereSegments[quality]
  return (
    <group
      name="focus-stellar-photosphere-corona"
      position={FOCUS_STAR_POSITION}
      userData={{
        canon: 'memory-star-stellar-photosphere-corona',
        surface: 'multiscale-emissive-granulation-limb-darkening',
        memoryReveal: 'memory-reveal-within-photosphere',
        surfaceWrap: true,
        memoryState: state,
      }}
    >
      <mesh name="focus-stellar-photosphere" raycast={() => null}>
        <sphereGeometry args={[FOCUS_STAR_RADIUS, widthSegments, heightSegments]} />
        <primitive object={photosphere} attach="material" />
      </mesh>
      <StellarCorona radius={FOCUS_STAR_RADIUS} color={accent} reducedMotion={reducedMotion} intensity={1.15} quality={quality} />
      <pointLight color={light} intensity={4} distance={12} decay={2} />
    </group>
  )
}
