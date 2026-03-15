import * as THREE from 'three';

export const StarCoronaShader = {
  uniforms: {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2() },
    u_color: { value: new THREE.Color(0xffffe0) },
    u_noise_scale: { value: 2.0 },
    u_noise_speed: { value: 0.2 },
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
    uniform vec2 u_resolution;
    uniform vec3 u_color;
    uniform float u_noise_scale;
    uniform float u_noise_speed;

    varying vec2 vUv;

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 st = vUv - 0.5;
      float dist = length(st);

      float noise_val = noise(vUv * u_noise_scale + u_time * u_noise_speed);
      float corona = 1.0 - smoothstep(0.4, 0.5, dist);
      
      float final_corona = corona * noise_val;

      gl_FragColor = vec4(u_color, final_corona);
    }
  `,
};