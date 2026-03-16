import * as THREE from "three"

export function createStarMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,

    uniforms: {
      color: { value: new THREE.Color("#ffffff") },
      glow: { value: 1.0 }
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
      uniform float glow;

      varying vec2 vUv;

      void main() {
        vec2 centered = vUv - 0.5;
        float d = length(centered);

        if (d > 0.5) discard;

        float falloff = 1.0 - smoothstep(0.0, 0.5, d);
        float intensity = falloff * glow;

        vec3 col = color * intensity;

        gl_FragColor = vec4(col, intensity);
      }
    `
  })
}