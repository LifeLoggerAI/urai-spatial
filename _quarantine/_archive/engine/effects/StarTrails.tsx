"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

const COUNT = 2000
const FIELD_RADIUS = 800

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function StarTrails() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  const prevCameraPos = useRef(new THREE.Vector3())
  const initialized = useRef(false)

  const { camera, size, viewport } = useThree()

  const points = useMemo(() => {
    const rng = mulberry32(1337)

    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)

    const color = new THREE.Color()

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3

      positions[i3] = (rng() - 0.5) * FIELD_RADIUS
      positions[i3 + 1] = (rng() - 0.5) * FIELD_RADIUS
      positions[i3 + 2] = (rng() - 0.5) * FIELD_RADIUS

      const brightness = 0.72 + rng() * 0.28
      color.setRGB(brightness, brightness, brightness)

      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,

      uniforms: {
        uVelocity: { value: 0 },
        uDirection: { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uViewportHeight: { value: size.height },
      },

      vertexShader: `
        uniform float uVelocity;
        uniform float uPixelRatio;
        uniform float uViewportHeight;

        varying vec3 vColor;
        varying float vTrailStrength;

        void main() {
          vColor = color;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = max(-mvPosition.z, 0.001);

          float perspective = uViewportHeight / dist;
          float stretch = 1.0 + uVelocity * 2.5;

          gl_PointSize = clamp(1.2 * perspective * stretch * uPixelRatio * 0.08, 1.0, 22.0);
          vTrailStrength = clamp(uVelocity / 5.0, 0.0, 1.0);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,

      fragmentShader: `
        uniform vec2 uDirection;

        varying vec3 vColor;
        varying float vTrailStrength;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);

          vec2 dir = uDirection;
          float dirLen = length(dir);
          if (dirLen > 0.0001) {
            dir /= dirLen;
          } else {
            dir = vec2(0.0, 1.0);
          }

          float along = dot(uv, dir);
          float across = dot(uv, vec2(-dir.y, dir.x));

          float tailAmount = mix(1.0, 2.4, vTrailStrength);
          float tail = smoothstep(0.55, 0.0, length(vec2(across * 1.35, along * tailAmount)));

          float head = smoothstep(0.5, 0.0, length(uv));
          float alpha = max(head, tail * 0.9);

          alpha *= smoothstep(-0.55, 0.15, along);
          alpha *= 0.78;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    })

    return { geometry, material }
  }, [size.height])

  useEffect(() => {
    prevCameraPos.current.copy(camera.position)
    initialized.current = true
  }, [camera])

  useEffect(() => {
    const mat = materialRef.current
    if (!mat) return

    mat.uniforms.uViewportHeight.value = size.height
    mat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2)
  }, [size.height, viewport])

  useFrame((_, delta) => {
    if (!initialized.current || !materialRef.current) return

    const frameDelta = Math.max(delta, 1 / 240)
    const movement = camera.position.distanceTo(prevCameraPos.current)
    const speed = movement / frameDelta

    const velocityNorm = THREE.MathUtils.clamp(speed * 0.02, 0, 5)

    const dx = camera.position.x - prevCameraPos.current.x
    const dy = camera.position.y - prevCameraPos.current.y

    const dir = new THREE.Vector2(-dx, -dy)
    if (dir.lengthSq() > 0.000001) dir.normalize()

    materialRef.current.uniforms.uVelocity.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uVelocity.value,
      velocityNorm,
      0.12
    )

    materialRef.current.uniforms.uDirection.value.lerp(dir, 0.18)

    prevCameraPos.current.copy(camera.position)
  })

  useEffect(() => {
    return () => {
      points.geometry.dispose()
      points.material.dispose()
    }
  }, [points])

  return (
    <points geometry={points.geometry} frustumCulled={false}>
      <primitive
        object={points.material}
        ref={materialRef}
        attach="material"
      />
    </points>
  )
}