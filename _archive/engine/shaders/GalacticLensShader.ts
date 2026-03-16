import * as THREE from "three";

export const GalacticLensShader = {

  uniforms: {
    time: { value: 0.0 },
    color: { value: new THREE.Color(0x9fd6ff) },
    intensity: { value: 1.2 }
  },

  vertexShader: `

    varying vec3 vPos;

    void main(){

      vPos = position;

      gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(position,1.0);

    }

  `,

  fragmentShader: `

    precision highp float;

    uniform float time;
    uniform vec3 color;
    uniform float intensity;

    varying vec3 vPos;

    void main(){

      float r = length(vPos.xy);

      /* fade instead of hard discard */
      float outer = smoothstep(1.25,1.05,r);

      /* core lens glow */
      float core =
        smoothstep(0.35,0.0,r);

      /* halo ring */
      float halo =
        smoothstep(1.1,0.25,r) * 0.45;

      /* shimmer oscillation */
      float shimmer =
        0.95 +
        sin(time*0.6 + r*4.0) * 0.05;

      float glow =
        (core + halo) *
        shimmer *
        intensity;

      glow *= (1.0 - outer);

      vec3 finalColor =
        color * glow;

      gl_FragColor =
        vec4(finalColor, glow);

    }

  `
};