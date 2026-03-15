import * as THREE from "three"

export function createStarDiffractionMaterial(){

  return new THREE.ShaderMaterial({

    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,

    uniforms:{
      sizeScale:{value:1},
      time:{value:0}
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

        float dist =
          max(-mvPosition.z,0.0001);

        vDist = dist;

        vSeed =
          fract(
            sin(dot(position.xyz,
            vec3(12.9898,78.233,45.164)))
            * 43758.5453
          );

        float depthScale =
          clamp(110.0 / dist,0.35,3.0);

        float pointSize =
          size * depthScale;

        gl_PointSize =
          clamp(pointSize,1.2,10.0);

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

        vec2 uv =
          gl_PointCoord - vec2(0.5);

        float r =
          length(uv);

        if(r > 0.5) discard;

        float core =
          1.0 - smoothstep(0.0,0.20,r);

        float halo =
          1.0 - smoothstep(0.18,0.42,r);

        halo *= 0.45;

        float spikeX =
          exp(-abs(uv.x)*14.0);

        float spikeY =
          exp(-abs(uv.y)*14.0);

        float spikes =
          (spikeX + spikeY) * 0.12;

        float twinkle =
          sin(time*4.0 + vSeed*14.0)
          * 0.04 + 0.98;

        float glow =
          clamp(
            10.0 / vDist,
            0.05,
            0.35
          );

        float intensity =
          (core + halo + spikes)
          * twinkle
          * glow;

        intensity =
          clamp(intensity,0.0,0.35);

        vec3 col =
          vColor * intensity;

        gl_FragColor =
          vec4(col,intensity);

      }

    `

  })

}