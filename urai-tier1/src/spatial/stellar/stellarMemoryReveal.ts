'use client'

import { useEffect, useState } from 'react'
import * as THREE from 'three'

export type StellarMemoryState = 'absent' | 'loading' | 'ready' | 'unavailable'

export type StellarMemoryTexture = {
  texture: THREE.Texture | null
  aspect: number
  state: StellarMemoryState
}

const emptyTexture = (state: StellarMemoryState): StellarMemoryTexture => ({ texture: null, aspect: 1, state })

/** One request owns one texture. No shared loader cache retains private images. */
export function loadStellarMemoryTexture(
  url: string | null | undefined,
  onChange: (result: StellarMemoryTexture) => void,
): () => void {
  if (!url) {
    onChange(emptyTexture('absent'))
    return () => {}
  }

  onChange(emptyTexture('loading'))
  let active = true
  let settled = false
  let texture: THREE.Texture | null = null
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.referrerPolicy = 'no-referrer'

  const unavailable = () => {
    if (!active || settled) return
    settled = true
    onChange(emptyTexture('unavailable'))
  }

  image.onload = () => {
    if (!active || settled) return
    const width = image.naturalWidth
    const height = image.naturalHeight
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      unavailable()
      return
    }
    settled = true
    texture = new THREE.Texture(image)
    // WebGL decodes the sRGB image before the photosphere blends linear radiance.
    // The photosphere's colorspace_fragment performs the only output encoding.
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true
    onChange({ texture, aspect: width / height, state: 'ready' })
  }
  image.onerror = unavailable
  image.src = url

  return () => {
    if (!active) return
    active = false
    image.onload = null
    image.onerror = null
    // Cancel this image request and drop its decoded source alongside the GPU texture.
    image.removeAttribute('src')
    texture?.dispose()
    texture = null
  }
}

export function useStellarMemoryTexture(
  url: string | null | undefined,
  onState?: (state: StellarMemoryState) => void,
): StellarMemoryTexture {
  const source = url || null
  const [loaded, setLoaded] = useState<StellarMemoryTexture & { source: string | null }>({
    source: null,
    ...emptyTexture('absent'),
  })

  useEffect(() => loadStellarMemoryTexture(source, result => {
    setLoaded({ source, ...result })
  }), [source])

  // A new selection cannot show the previous image while passive cleanup is pending.
  const visible = loaded.source === source
    ? { texture: loaded.texture, aspect: loaded.aspect, state: loaded.state }
    : emptyTexture(source ? 'loading' : 'absent')

  // Notify from the current, key-qualified result, never a stale image completion.
  useEffect(() => { onState?.(visible.state) }, [source, visible.state, onState])
  return visible
}

export const STELLAR_MEMORY_UNIFORMS = `
  uniform sampler2D uMemoryTexture;
  uniform float uMemoryAspect;
  uniform float uMemoryReady;
  uniform float uReveal;
`

/** Camera-facing projection belongs to the photosphere's existing fragment shader.
 * Only the blend boundary moves; image coordinates stay undistorted and aspect-fit. */
export const STELLAR_MEMORY_REVEAL = `
  float stellarMemoryHash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  float stellarMemoryNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(stellarMemoryHash(i), stellarMemoryHash(i + vec2(1.0, 0.0)), f.x),
      mix(stellarMemoryHash(i + vec2(0.0, 1.0)), stellarMemoryHash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  vec3 revealStellarMemory(vec3 emitted, vec3 normalView, float granulation, float time) {
    if (uMemoryReady < .5 || uReveal <= .001) return emitted;
    vec3 facing = normalize(normalView);
    if (facing.z <= 0.0) return emitted;

    // The complete source rectangle fits inside the stellar face. Its diagonal
    // stays below the limb, for portrait, landscape and square images alike.
    float aspect = max(uMemoryAspect, .0001);
    vec2 halfExtent = .92 * vec2(aspect, 1.0) / sqrt(aspect * aspect + 1.0);
    vec2 projected = facing.xy / halfExtent;
    float sourceEdge = max(abs(projected.x), abs(projected.y));
    if (sourceEdge >= 1.0) return emitted;
    vec2 memoryUv = projected * .5 + .5;

    // Let the source appear through flowing stellar light, rather than follow
    // its rectangular boundary. This rounded distance affects the veil only;
    // the complete image coordinates above are neither cropped nor distorted.
    vec2 edgePosition = abs(projected);
    float roundedEdge = pow(
      edgePosition.x * edgePosition.x * edgePosition.x
        + edgePosition.y * edgePosition.y * edgePosition.y,
      1.0 / 3.0
    );
    float drift = time * .018;
    float irregular = stellarMemoryNoise(projected * 3.1 + vec2(drift, -drift * .7));
    float fineEdge = stellarMemoryNoise(projected * 10.7 - vec2(drift * .4, drift * .6));
    float flowingEdge = roundedEdge + (irregular - .5) * .16 + (fineEdge - .5) * .06;
    float veil = 1.0 - smoothstep(.58, .985, flowingEdge);
    // Dissolve the perimeter into photospheric pockets. Granules stay weak in
    // the essential center, so faces and source detail remain legible there.
    float perimeter = smoothstep(.58, .94, roundedEdge);
    float solarPockets = smoothstep(.62, .90, granulation) * (.45 + fineEdge * .55);
    veil *= 1.0 - perimeter * solarPockets * .74;
    veil *= 1.0 - smoothstep(.94, 1.0, sourceEdge);
    veil *= smoothstep(.18, .46, facing.z);

    vec4 memorySample = texture2D(uMemoryTexture, memoryUv);
    vec3 image = memorySample.rgb;
    float lane = smoothstep(.60, .90, granulation);
    // A weak luminous weave remains in the image; high contrast source detail
    // survives because the mix happens in linear space, without a tinted wash.
    vec3 wovenMemory = image + emitted * (.012 + lane * .010);
    float readability = .90 - lane * .022;
    // Transparent source pixels retain the existing photosphere's radiance.
    float reveal = clamp(uReveal, 0.0, 1.0) * veil * readability * memorySample.a;
    return mix(emitted, wovenMemory, reveal);
  }
`
