import * as THREE from 'three';

export const LightConeShader = {
  uniforms: {
    u_time: { value: 0.0 },
    u_color: { value: new THREE.Color(0xffffff) },
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform float u_time;
    uniform vec3 u_color;
    varying vec2 vUv;

    void main() {
      float opacity = 1.0 - vUv.y;
      gl_FragColor = vec4(u_color, opacity * 0.5);
    }
  `,
};