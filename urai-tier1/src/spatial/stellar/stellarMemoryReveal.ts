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
    // Source authority and account/selection cancellation remain upstream.
    if (uMemoryReady < .5 || uReveal <= .001) return emitted;
    vec3 facing = normalize(normalView);
    if (facing.z <= 0.0) return emitted;

    // Project the selected image *through the stellar surface* instead of
    // fitting a small rectangular picture inside a bright circular frame.
    // This display-only sphere crop never edits the underlying source image.
    float aspect = clamp(uMemoryAspect, .12, 9.0);
    vec2 coverScale = vec2(min(1.0, 1.0 / aspect), min(1.0, aspect));
    vec2 surfaceUv = .5 + facing.xy * .51 * coverScale;
    float drift = time * .018;
    float convection = stellarMemoryNoise(facing.xy * 8.4 + vec2(drift, -drift * .7));
    float granuleFlow = stellarMemoryNoise(facing.xy * 21.3 - vec2(drift * .3, drift * .6));
    // Subpixel-scale organic advection avoids a printed image and keeps
    // center detail legible. Reduced motion fixes uTime upstream.
    vec2 flow = vec2(convection - .5, granuleFlow - .5) * .009;
    vec2 sourceUv = clamp(surfaceUv + flow, vec2(.001), vec2(.999));
    vec4 source = texture2D(uMemoryTexture, sourceUv);

    // The reveal starts in the central photosphere and runs across the
    // curved surface toward its real limb. It has no rectangular mask.
    float front = clamp(facing.z, 0.0, 1.0);
    float phase = uReveal - (1.0 - front) * .43 + (convection - .5) * .11;
    float opening = smoothstep(.06, .93, phase);
    float photosphericEdge = smoothstep(.035, .33, front + (granuleFlow - .5) * .055);
    float solarPockets = smoothstep(.57, .90, granulation) * .105;
    float exposure = clamp(opening * photosphericEdge * (.94 - solarPockets) * source.a, 0.0, 1.0);

    // Residual luminous granulation binds the photo to the stellar body,
    // while intact sampled RGB stays the readable, truthful source.
    vec3 integrated = source.rgb + emitted * (.018 + (1.0 - front) * .025);
    return mix(emitted, integrated, exposure);
  }
`
