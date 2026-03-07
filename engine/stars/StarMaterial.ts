import * as THREE from "three"

export function createStarMaterial() {

  return new THREE.ShaderMaterial({

    transparent:true,

    uniforms:{
      color:{ value:new THREE.Color("#ffffff") },
      glow:{ value:1.0 }
    },

    vertexShader:`
      varying vec3 vPos;

      void main(){

        vPos = position;

        gl_Position = projectionMatrix *
                      modelViewMatrix *
                      vec4(position,1.0);

      }
    `,

    fragmentShader:`

      uniform vec3 color;
      uniform float glow;

      varying vec3 vPos;

      void main(){

        float d = length(vPos.xy);

        float intensity = glow / (d * 12.0 + 0.2);

        vec3 col = color * intensity;

        gl_FragColor = vec4(col, intensity);

      }

    `
  })

}
