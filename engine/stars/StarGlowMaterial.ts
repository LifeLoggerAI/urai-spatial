import * as THREE from "three"

export function createStarGlowMaterial(color="#9dd6ff"){

  return new THREE.ShaderMaterial({

    transparent:true,
    depthWrite:false,
    blending:THREE.AdditiveBlending,

    uniforms:{
      color:{ value:new THREE.Color(color) }
    },

    vertexShader:`

      varying vec3 vPos;

      void main(){

        vPos = position;

        gl_Position =
          projectionMatrix *
          modelViewMatrix *
          vec4(position,1.0);

      }

    `,

    fragmentShader:`

      uniform vec3 color;
      varying vec3 vPos;

      void main(){

        float dist = length(vPos.xy);

        float core = smoothstep(0.25,0.0,dist);

        float halo = 1.8/(dist*2.0+0.03);

        float glow = core + halo;

        vec3 finalColor = color * glow * 3.2;

        gl_FragColor = vec4(finalColor, glow);

      }

    `
  })
}
