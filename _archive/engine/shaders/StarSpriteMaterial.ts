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
          clamp(220.0 / dist,0.35,4.0);

        float finalSize =
          size * depthScale;

        gl_PointSize =
          clamp(finalSize,1.2,6.0);

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
          smoothstep(0.20,0.0,r);

        float innerHalo =
          smoothstep(0.42,0.20,r) * 0.7;

        float outerHalo =
          smoothstep(0.50,0.32,r) * 0.25;

        float twinkle =
          sin(time*3.0 + vSeed*10.0)
          * 0.08 + 1.0;

        float depthGlow =
          clamp(
            12.0 / vDist,
            0.12,
            0.6
          );

        float intensity =
          (core + innerHalo + outerHalo)
          * twinkle
          * depthGlow;

        intensity =
          clamp(intensity,0.0,1.0);

        vec3 color =
          vColor * intensity;

        gl_FragColor =
          vec4(color,intensity);

      }

    `

  })

}