import * as THREE from "three"

export function createStarMaterial(){

  return new THREE.ShaderMaterial({

    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    toneMapped:false,

    uniforms:{
      color:{ value:new THREE.Color("#ffffff") },
      glow:{ value:1.0 }
    },

    vertexShader:`

      varying vec2 vUv;

      void main(){

        vUv = position.xy;

        gl_Position =
          projectionMatrix *
          modelViewMatrix *
          vec4(position,1.0);

      }

    `,

    fragmentShader:`

      uniform vec3 color;
      uniform float glow;

      varying vec2 vUv;

      void main(){

        float d = length(vUv);

        float intensity =
          glow / max(d * 12.0 + 0.2, 0.2);

        vec3 col = color * intensity;

        gl_FragColor = vec4(col, intensity);

      }

    `

  })

}