import * as THREE from 'three';

export const DustShader = {
  uniforms: {
    u_time: { value: 0.0 },
    u_size: { value: 0.1 },
    u_color: { value: new THREE.Color(0xaaaaaa) },
  },

  vertexShader: `
    uniform float u_time;
    uniform float u_size;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = u_size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    uniform vec3 u_color;

    void main() {
      gl_FragColor = vec4(u_color, 0.1);
    }
  `,
};