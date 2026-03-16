import * as THREE from "three";

export const VolumetricNebulaShader = {

  uniforms: {
    u_time: { value: 0 },
    u_noise_scale: { value: 0.6 },
    u_noise_speed: { value: 0.04 },
    u_color1: { value: new THREE.Color(0x4a148c) },
    u_color2: { value: new THREE.Color(0x0d47a1) }
  },

  vertexShader: `
    varying vec2 vUv;

    void main() {

      vUv = uv;

      gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(position,1.0);

    }
  `,

  fragmentShader: `

    uniform float u_time;
    uniform float u_noise_scale;
    uniform float u_noise_speed;
    uniform vec3 u_color1;
    uniform vec3 u_color2;

    varying vec2 vUv;

    float hash(vec2 p){
      return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453123);
    }

    float noise(vec2 p){

      vec2 i = floor(p);
      vec2 f = fract(p);

      vec2 u = f*f*(3.0-2.0*f);

      return mix(
        mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
        mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x),
        u.y
      );

    }

    float fbm(vec2 p){

      float value = 0.0;
      float amplitude = 0.5;

      for(int i=0;i<5;i++){

        value += amplitude * noise(p);

        p *= 2.0;
        amplitude *= 0.5;

      }

      return value;

    }

    void main(){

      vec2 uv = vUv * u_noise_scale;

      float n = fbm(uv + u_time * u_noise_speed);

      float n2 = fbm(uv * 2.0 - u_time * 0.02);

      float nebula = n * 0.7 + n2 * 0.3;

      vec3 col = mix(u_color1, u_color2, nebula);

      float alpha = smoothstep(0.2,0.8,nebula) * 0.35;

      gl_FragColor = vec4(col,alpha);

    }

  `
};