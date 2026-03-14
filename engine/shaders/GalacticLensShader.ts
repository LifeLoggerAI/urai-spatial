export const GalacticLensShader = {

  uniforms:{
    time:{ value:0 }
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

    precision highp float;

    uniform float time;

    varying vec3 vPos;

    void main(){

      float r =
        length(vPos.xy);

      if(r > 1.2) discard;

      float core =
        smoothstep(0.35,0.0,r);

      float halo =
        smoothstep(1.2,0.25,r) * 0.45;

      float shimmer =
        0.97 +
        sin(time*0.6 + r*4.0) * 0.03;

      float glow =
        (core + halo) * shimmer;

      vec3 color =
        vec3(0.7,0.9,1.0) * glow;

      gl_FragColor =
        vec4(color, glow);

    }

  `
}