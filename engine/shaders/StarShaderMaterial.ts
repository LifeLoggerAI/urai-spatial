import * as THREE from "three"

export function createStarMaterial(){

  return new THREE.ShaderMaterial({

    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,

    uniforms:{
      uSize:{value:3.0}
    },

    vertexShader:`
      attribute float size;

      varying vec3 vColor;
      varying float vDist;

      void main(){

        vColor = color;

        vec4 mvPosition =
          modelViewMatrix *
          vec4(position,1.0);

        float depth =
          max(-mvPosition.z, 1.0);

        vDist = depth;

        float scaledSize =
          size *
          (320.0 / depth);

        gl_PointSize =
          clamp(scaledSize,1.2,18.0);

        gl_Position =
          projectionMatrix *
          mvPosition;

      }
    `,

    fragmentShader:`

      varying vec3 vColor;
      varying float vDist;

      void main(){

        vec2 p =
          gl_PointCoord - 0.5;

        float r =
          length(p);

        if(r > 0.5) discard;

        float core =
          smoothstep(0.35,0.0,r);

        float halo =
          smoothstep(0.55,0.0,r) * 0.5;

        float glow =
          clamp(28.0 / vDist,0.25,0.7);

        float intensity =
          (core + halo) * glow;

        vec3 color =
          vColor * intensity;

        gl_FragColor =
          vec4(color,intensity);

      }
    `
  })

}