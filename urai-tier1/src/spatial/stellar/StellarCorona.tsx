"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Turbulent plasma attached to the projected stellar limb, occluded by the surface. */
export default function StellarCorona({ radius, color, reducedMotion, intensity = 1, quality = "medium" }: {
  radius: number;
  color: string;
  reducedMotion: boolean;
  intensity?: number;
  quality?: "low" | "medium" | "high";
}) {
  const elapsed = useRef(0);
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    defines: { CORONA_QUALITY: quality === "low" ? 0 : quality === "high" ? 2 : 1 },
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: radius },
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      uniform float uRadius;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 centerView = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 worldScale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
        vec3 towardEye = vec3(0.0, 0.0, 1.0);
        float limbScale = 1.0;
        if (projectionMatrix[3][3] == 0.0) {
          float distanceToEye = max(length(centerView.xyz), 0.0001);
          float worldRadius = uRadius * max(worldScale.x, worldScale.y);
          float radiusRatio = min(worldRadius / distanceToEye, 0.95);
          towardEye = -centerView.xyz / distanceToEye;
          // The tangent circle is nearer than the sphere's center. A center-depth
          // billboard leaves a dark gap at the limb when the camera approaches.
          centerView.xyz += towardEye * (worldRadius * radiusRatio);
          limbScale = sqrt(1.0 - radiusRatio * radiusRatio);
        }
        vec3 referenceUp = abs(towardEye.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
        vec3 right = normalize(cross(referenceUp, towardEye));
        vec3 up = cross(towardEye, right);
        centerView.xyz += (right * position.x * worldScale.x + up * position.y * worldScale.y) * limbScale;
        gl_Position = projectionMatrix * centerView;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;

      float hash(vec2 p) {
        vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        q += dot(q, q.yzx + 33.33);
        return fract((q.x + q.y) * q.z);
      }

      float noise(vec2 p) {
        vec2 cell = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(cell), hash(cell + vec2(1.0, 0.0)), f.x),
          mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float turbulence(vec2 p) {
        #if CORONA_QUALITY == 0
          return noise(p);
        #else
        mat2 turn = mat2(0.80, -0.60, 0.60, 0.80);
        float value = noise(p) * 0.67;
        p = turn * p * 2.07 + vec2(13.1, 7.7);
        value += noise(p) * 0.33;
        #if CORONA_QUALITY == 2
          p = turn * p * 2.13 + vec2(-9.2, 17.4);
          value = value * 0.85 + noise(p) * 0.15;
        #endif
        return value;
        #endif
      }

      void main() {
        // The photosphere is r=1. Cartesian sampling avoids an angular seam and
        // periodic spoke spacing; the same hot regions feed the attached wisps.
        vec2 p = (vUv - 0.5) * 4.0;
        float surfaceRadius = length(p);
        if (surfaceRadius < 0.93 || surfaceRadius > 1.65) discard;
        vec2 direction = p / max(surfaceRadius, 0.001);
        vec2 tangent = vec2(-direction.y, direction.x);
        float time = uTime * 0.024;
        vec2 drift = vec2(time * 0.18, -time * 0.12);
        float outside = max(0.0, surfaceRadius - 1.0);

        // Advect the source heat and its reach together, so an outward plume
        // follows a curved path instead of filling a straight radial envelope.
        // Low retains this bend: all three samples together cost twelve hashes.
        float bend = noise(direction * 2.4 + drift * 0.7 + vec2(15.8, 6.7)) - 0.48;
        float curve = bend * (outside * 1.6 + outside * outside * 3.0);
        vec2 sourceDirection = normalize(direction + tangent * curve);
        float activity = turbulence(sourceDirection * 3.6 + drift + vec2(8.3, -2.6));
        float plume = smoothstep(0.27, 0.78, activity);
        float reach = 0.09 + pow(plume, 1.40) * 0.35;

        // Filled density feathers along the curved flow. Its radial variation
        // breaks up the tips into soft airy threads, never closed ridge lines.
        vec2 flow = sourceDirection * (10.5 + outside * 5.2);
        flow += tangent * bend * outside * outside * 2.0;
        #if CORONA_QUALITY == 2
          vec2 warp = vec2(
            turbulence(flow * 0.31 + drift + vec2(19.2, 3.1)),
            turbulence(flow * 0.31 - drift + vec2(-7.8, 14.5))
          ) - 0.5;
          flow += warp * (0.13 + outside * 0.65);
        #endif
        float density = noise(flow + drift);
        #if CORONA_QUALITY == 2
          density = density * 0.84 + noise(flow * 2.6 - drift + vec2(5.4, 9.2)) * 0.16;
        #endif
        float threads = smoothstep(0.22, 0.80, density);
        float wisps = mix(0.50 + threads * 0.50, threads * threads, smoothstep(0.035, 0.21, outside));
        float envelope = exp(-outside / reach * 2.4);
        float attached = exp(-outside * 27.0) * (0.26 + plume * 0.18);
        float alpha = attached + envelope * (0.24 + plume * 0.27) * wisps;
        alpha *= smoothstep(0.94, 1.005, surfaceRadius);
        alpha *= 1.0 - smoothstep(1.40, 1.65, surfaceRadius);
        if (alpha < 0.003) discard;
        float heat = exp(-outside * 7.0) * (0.68 + wisps * 0.22);
        vec3 warm = mix(vec3(0.88, 0.17, 0.008), vec3(0.98, 0.52, 0.095), heat);
        warm = mix(warm, uColor, 0.06);
        vec3 emitted = clamp(warm * uIntensity, 0.0, 0.96);
        gl_FragColor = vec4(emitted, min(alpha, 0.58));
        #include <colorspace_fragment>
      }
    `,
  }), [color, intensity, quality, radius]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, delta) => {
    // Freeze the current plasma when motion is reduced; resuming a hidden tab
    // must not jump the turbulence to a different wall-clock phase.
    if (!reducedMotion) elapsed.current += Math.min(delta, 0.05);
    material.uniforms.uTime.value = elapsed.current;
  });
  return (
    <mesh name="stellar-irregular-corona-plumes" raycast={() => null}>
      <planeGeometry args={[radius * 4, radius * 4]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
