import * as THREE from 'three';

export const VolumetricNebulaShader = {
  uniforms: {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2() },
    u_noise_scale: { value: 0.5 },
    u_noise_speed: { value: 0.1 },
    u_color1: { value: new THREE.Color(0x4a148c) },
    u_color2: { value: new THREE.Color(0x0d47a1) },
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
    uniform float u_noise_scale;
    uniform float u_noise_speed;
    uniform vec3 u_color1;
    uniform vec3 u_color2;

    varying vec2 vUv;

    // 2D Noise function
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 newUv = vUv * u_noise_scale;
      float nebula = fbm(newUv + u_time * u_noise_speed);
      vec3 color = mix(u_color1, u_color2, nebula);
      gl_FragColor = vec4(color, nebula * 0.2);
    }
  `,
};