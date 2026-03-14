import * as THREE from "three"

export function createStarSpriteMaterial(){

  return new THREE.ShaderMaterial({

    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,

    uniforms:{
      time:{ value:0 }
    },

    vertexShader:`

      attribute float size;

      varying vec3 vColor;
      varying float vDist;
      varying float vSeed;

      void main(){

        vColor = color;

        vec4 mvPosition =
          modelViewMatrix *
          vec4(position,1.0);

        float dist = max(-mvPosition.z,1.0);
        vDist = dist;

        vSeed =
          fract(
            sin(dot(position.xyz,
            vec3(12.9898,78.233,45.164)))
            * 43758.5453
          );

        float depthScale =
          clamp(120.0 / dist,0.18,2.4);

        float finalSize =
          size * depthScale;

        gl_PointSize =
          clamp(finalSize,0.35,2.4);

        gl_Position =
          projectionMatrix *
          mvPosition;

      }

    `,

    fragmentShader:`

      uniform float time;

      varying vec3 vColor;
      varying float vDist;
      varying float vSeed;

      void main(){

        vec2 p =
          gl_PointCoord - 0.5;

        float r =
          length(p);

        if(r > 0.5) discard;

        float core =
          smoothstep(0.18,0.0,r);

        float innerHalo =
          smoothstep(0.36,0.18,r) * 0.6;

        float outerHalo =
          smoothstep(0.48,0.30,r) * 0.15;

        float twinkle =
          sin(time*4.0 + vSeed*12.0)
          * 0.04 + 0.98;

        float depthGlow =
          clamp(
            5.0 / vDist,
            0.05,
            0.25
          );

        float intensity =
          (core + innerHalo + outerHalo)
          * twinkle
          * depthGlow;

        intensity =
          clamp(intensity,0.0,0.32);

        vec3 color =
          vColor * intensity;

        gl_FragColor =
          vec4(color,intensity);

      }

    `

  })

}