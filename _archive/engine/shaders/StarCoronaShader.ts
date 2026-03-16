import * as THREE from "three";

export const StarCoronaShader = {

  uniforms: {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(1, 1) },
    u_color: { value: new THREE.Color(0xffffe0) },

    /* corona controls */
    u_noise_scale: { value: 2.0 },
    u_noise_speed: { value: 0.25 },

    /* glow controls */
    u_inner_radius: { value: 0.25 },
    u_outer_radius: { value: 0.5 },
    u_intensity: { value: 1.4 }
  },

  vertexShader: `

    varying vec2 vUv;

    void main(){

      vUv = uv;

      gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(position,1.0);

    }

  `,

  fragmentShader: `

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec3 u_color;

    uniform float u_noise_scale;
    uniform float u_noise_speed;

    uniform float u_inner_radius;
    uniform float u_outer_radius;
    uniform float u_intensity;

    varying vec2 vUv;

    /* hash noise */

    float hash(vec2 p){
      return fract(
        sin(dot(p,vec2(127.1,311.7))) *
        43758.5453123
      );
    }

    /* smooth noise */

    float noise(vec2 p){

      vec2 i = floor(p);
      vec2 f = fract(p);

      float a = hash(i);
      float b = hash(i + vec2(1.0,0.0));
      float c = hash(i + vec2(0.0,1.0));
      float d = hash(i + vec2(1.0,1.0));

      vec2 u = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(a,b,u.x),
        mix(c,d,u.x),
        u.y
      );

    }

    void main(){

      /* center coordinates */

      vec2 st = vUv - 0.5;

      float dist = length(st);

      /* animated noise */

      vec2 npos =
        vUv * u_noise_scale +
        vec2(u_time * u_noise_speed);

      float n = noise(npos);

      /* radial falloff */

      float corona =
        1.0 -
        smoothstep(
          u_inner_radius,
          u_outer_radius,
          dist
        );

      /* turbulence */

      float turbulence =
        mix(0.7,1.3,n);

      float glow =
        corona * turbulence;

      /* sharpen center */

      float core =
        smoothstep(
          0.2,
          0.0,
          dist
        );

      glow += core * 0.6;

      glow *= u_intensity;

      /* clamp */

      glow = clamp(glow,0.0,1.5);

      gl_FragColor =
        vec4(
          u_color * glow,
          glow
        );

    }

  `
};