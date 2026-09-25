'use client'

import { Html } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import type { GlobalFieldState } from '@/spatial/lived-world/globalEmotionalField'

const EARTH_POSITION: [number, number, number] = [-3.2, 1.28, -0.9]
const EARTH_RADIUS = 0.42

const landVertex = `
  varying vec2 vUv;
  varying vec3 vNormalView;
  void main() {
    vUv = uv;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const landFragment = `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormalView;

  float ellipseMask(vec2 uv, vec2 center, vec2 radius, float angle) {
    vec2 d = uv - center;
    d.x = mod(d.x + 0.5, 1.0) - 0.5;
    float c = cos(angle);
    float s = sin(angle);
    vec2 p = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
    float q = length(p / radius);
    return 1.0 - smoothstep(0.86, 1.03, q);
  }

  void main() {
    vec2 uv = vUv;
    vec2 warp = vec2(
      sin(uv.y * 31.0 + sin(uv.x * 17.0)) * 0.007,
      sin(uv.x * 29.0 + sin(uv.y * 19.0)) * 0.006
    );
    uv += warp;

    float land = 0.0;
    land = max(land, ellipseMask(uv, vec2(0.22, 0.69), vec2(0.105, 0.115), -0.34));
    land = max(land, ellipseMask(uv, vec2(0.29, 0.58), vec2(0.052, 0.078), -0.12));
    land = max(land, ellipseMask(uv, vec2(0.35, 0.39), vec2(0.071, 0.168), 0.24));
    land = max(land, ellipseMask(uv, vec2(0.36, 0.82), vec2(0.038, 0.055), 0.08));
    land = max(land, ellipseMask(uv, vec2(0.515, 0.675), vec2(0.055, 0.044), -0.08));
    land = max(land, ellipseMask(uv, vec2(0.545, 0.50), vec2(0.078, 0.135), -0.05));
    land = max(land, ellipseMask(uv, vec2(0.655, 0.69), vec2(0.175, 0.088), 0.06));
    land = max(land, ellipseMask(uv, vec2(0.625, 0.55), vec2(0.055, 0.043), -0.16));
    land = max(land, ellipseMask(uv, vec2(0.69, 0.50), vec2(0.040, 0.058), 0.18));
    land = max(land, ellipseMask(uv, vec2(0.765, 0.47), vec2(0.077, 0.043), -0.08));
    land = max(land, ellipseMask(uv, vec2(0.82, 0.315), vec2(0.069, 0.055), -0.12));

    if (land < 0.02) discard;

    vec3 normal = normalize(vNormalView);
    vec3 lightDirection = normalize(vec3(0.55, 0.72, 0.42));
    float light = 0.54 + 0.46 * max(dot(normal, lightDirection), 0.0);
    vec3 dry = vec3(0.34, 0.36, 0.27);
    vec3 green = vec3(0.20, 0.31, 0.24);
    float latitude = abs(vUv.y - 0.5) * 2.0;
    vec3 landColor = mix(green, dry, smoothstep(0.12, 0.82, latitude));
    gl_FragColor = vec4(landColor * light, land * 0.97);
  }
`

function useFirstPersonHomePresence() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const owner = document.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      ?? document.querySelector<HTMLElement>('.urai-asset-home-world')
    if (!owner) return

    const sync = () => setVisible(
      owner.getAttribute('data-home-stable-state') === 'AVATAR_HOME_FIRST_PERSON'
      && owner.getAttribute('data-home-input-locked') !== 'true',
    )
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(owner, { attributes: true, attributeFilter: ['data-home-stable-state', 'data-home-input-locked'] })
    return () => observer.disconnect()
  }, [])

  return visible
}

export function HomeGlobalEmotionalFieldEarth({ state = 'unavailable' }: { state?: GlobalFieldState }) {
  const visible = useFirstPersonHomePresence()
  const landMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: landVertex,
    fragmentShader: landFragment,
    transparent: true,
    depthWrite: false,
    toneMapped: true,
  }), [])

  useEffect(() => () => landMaterial.dispose(), [landMaterial])
  if (!visible) return null

  const summary = state === 'aggregate'
    ? 'Global Emotional Field: a safely published cohort-level aggregate is available with privacy-preserving geographic precision.'
    : state === 'suppressed'
      ? 'Global Emotional Field: aggregate publication is suppressed by privacy or governance requirements.'
      : 'Global Emotional Field: aggregate signal is currently unavailable. No emotional activity is inferred or fabricated.'

  return (
    <group
      name="home-global-emotional-field-earth"
      position={EARTH_POSITION}
      userData={{
        semanticOwner: 'global-emotional-field-earth',
        realm: 'home',
        visibility: 'first-person-only',
        privateMapReuse: false,
        individualDots: false,
        exactLocationExposure: false,
        publicationState: state,
        providerState: 'not-activated',
        visualStatus: 'deterministic-earth-candidate-requires-literal-pixel-acceptance',
      }}
    >
      <mesh name="global-field-earth-ocean" castShadow receiveShadow>
        <sphereGeometry args={[EARTH_RADIUS, 72, 48]} />
        <meshPhysicalMaterial
          color={state === 'suppressed' ? '#263943' : '#163a52'}
          roughness={0.62}
          metalness={0.01}
          clearcoat={0.09}
          clearcoatRoughness={0.72}
          envMapIntensity={0.48}
        />
      </mesh>

      <mesh name="global-field-earth-land" scale={1.004} material={landMaterial}>
        <sphereGeometry args={[EARTH_RADIUS, 72, 48]} />
      </mesh>

      <mesh name="global-field-earth-atmosphere" scale={1.045}>
        <sphereGeometry args={[EARTH_RADIUS, 56, 36]} />
        <meshPhysicalMaterial
          color="#8db8ca"
          transparent
          opacity={state === 'suppressed' ? 0.045 : 0.075}
          roughness={0.22}
          metalness={0}
          transmission={0.16}
          thickness={0.02}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {state === 'aggregate' ? (
        <mesh name="global-field-safe-aggregate-shell" scale={1.065}>
          <sphereGeometry args={[EARTH_RADIUS, 48, 32]} />
          <meshPhysicalMaterial
            color="#9cb8a8"
            transparent
            opacity={0.045}
            roughness={0.42}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      <Html center transform distanceFactor={8} position={[0, -0.64, 0]}>
        <span className="sr-only" role="status" aria-live="polite" data-testid="home-global-emotional-field-earth-status" data-global-field-state={state}>{summary}</span>
      </Html>
    </group>
  )
}
