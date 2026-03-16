import * as THREE from "three"

export function createStarGlowMaterial(color = "#9dd6ff") {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,

    uniforms: {
      color: { value: new THREE.Color(color) },
    },

    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;

        gl_Position =
          projectionMatrix *
          modelViewMatrix *
          vec4(position, 1.0);
      }
    `,

    fragmentShader: `
      uniform vec3 color;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv - 0.5;
        float dist = length(uv);

        float core = smoothstep(0.25, 0.0, dist);
        float halo = 0.35 / (dist + 0.08);
        float glow = clamp(core + halo, 0.0, 1.0);

        vec3 finalColor = color * glow * 1.8;

        gl_FragColor = vec4(finalColor, glow);
      }
    `,
  })
}