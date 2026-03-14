export const VolumetricLightShader = {

  vertexShader: `

    varying vec3 vPos;

    void main() {

      vPos = position;

      gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(position, 1.0);

    }

  `,

  fragmentShader: `

    varying vec3 vPos;

    void main() {

      float d = length(vPos.xy);

      /* smooth volumetric fade */
      float falloff =
        smoothstep(1.0, 0.0, d);

      /* secondary inner glow */
      float core =
        smoothstep(0.35, 0.0, d) * 0.6;

      float intensity =
        falloff * 0.12 +
        core * 0.08;

      vec3 color =
        vec3(0.65, 0.72, 0.85);

      gl_FragColor =
        vec4(color * intensity, intensity);

    }

  `

}