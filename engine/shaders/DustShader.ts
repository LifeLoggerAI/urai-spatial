export const DustTurbulenceShader = {

  uniforms:{
    time:{ value:0 }
  },

  vertexShader:`

    uniform float time;

    varying vec3 vPos;

    void main(){

      vec3 p = position;

      float waveA =
        sin(time*0.5 + p.y*0.04);

      float waveB =
        cos(time*0.6 + p.x*0.03);

      p.x += waveA * 1.8;
      p.z += waveB * 1.8;

      vPos = p;

      gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(p,1.0);

    }

  `,

  fragmentShader:`

    precision highp float;

    varying vec3 vPos;

    void main(){

      float d =
        length(vPos.xy);

      float density =
        1.0 - smoothstep(0.0,2.5,d);

      vec3 color =
        vec3(0.8,0.9,1.0) * density;

      float alpha =
        density * 0.35;

      gl_FragColor =
        vec4(color,alpha);

    }

  `
}