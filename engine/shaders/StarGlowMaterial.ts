import * as THREE from "three"

export function createStarGlowMaterial(){

  return new THREE.ShaderMaterial({

    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,

    uniforms:{
      uTime:{ value:0 }
    },

    vertexShader:`

      precision highp float;

      uniform float uTime;

      attribute float size;
      attribute float temp;

      varying float vTemp;
      varying float vDist;

      void main(){

        vTemp = clamp(temp,0.0,1.0);

        vec4 mvPosition =
          modelViewMatrix *
          vec4(position,1.0);

        float dist =
          max(-mvPosition.z,1.0);

        vDist = dist;

        float twinkle =
          0.94 +
          sin(
            uTime * 2.2 +
            position.x * 4.0 +
            position.y * 3.0
          ) * 0.06;

        float scaledSize =
          size *
          twinkle *
          (320.0 / dist);

        gl_PointSize =
          clamp(scaledSize,1.2,18.0);

        gl_Position =
          projectionMatrix *
          mvPosition;

      }

    `,

    fragmentShader:`

      precision highp float;

      varying float vTemp;
      varying float vDist;

      vec3 spectral(float t){

        vec3 blue   = vec3(0.6,0.8,1.0);
        vec3 white  = vec3(1.0,1.0,1.0);
        vec3 yellow = vec3(1.0,0.95,0.7);
        vec3 red    = vec3(1.0,0.6,0.5);

        if(t < 0.33){
          return mix(blue,white,t*3.0);
        }
        else if(t < 0.66){
          return mix(white,yellow,(t-0.33)*3.0);
        }
        else{
          return mix(yellow,red,(t-0.66)*3.0);
        }

      }

      void main(){

        vec2 uv =
          gl_PointCoord - vec2(0.5);

        float d =
          length(uv);

        if(d > 0.5) discard;

        float core =
          smoothstep(0.32,0.0,d);

        float halo =
          smoothstep(0.55,0.0,d) * 0.5;

        float glow =
          (core + halo) *
          clamp(28.0 / vDist,0.25,0.8);

        glow =
          pow(glow,2.0);

        vec3 color =
          spectral(vTemp);

        gl_FragColor =
          vec4(color * glow, glow);

      }

    `
  })

}