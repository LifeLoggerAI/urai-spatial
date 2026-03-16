import * as THREE from 'three'

export const LightConeShader = {

  uniforms: {
    u_time: { value: 0.0 },
    u_color: { value: new THREE.Color(0xffffff) }
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

    uniform float u_time;
    uniform vec3 u_color;

    varying vec2 vUv;

    void main() {

      /* vertical cone fade */
      float vertical =
        1.0 - vUv.y;

      /* radial edge fade */
      float radial =
        1.0 - smoothstep(0.35, 0.5, abs(vUv.x - 0.5));

      /* combine */
      float opacity =
        vertical * radial;

      opacity *= 0.6;

      vec3 color =
        u_color * opacity;

      gl_FragColor =
        vec4(color, opacity);

    }

  `
}