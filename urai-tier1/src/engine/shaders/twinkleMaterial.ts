import * as THREE from "three"

export function createTwinkleMaterial(){

return new THREE.ShaderMaterial({

transparent:true,
depthWrite:false,
vertexColors:true,
blending:THREE.AdditiveBlending,

uniforms:{
time:{value:0}
},

vertexShader:`

attribute vec3 color;
varying vec3 vColor;

void main(){

vColor = color;

vec4 mvPosition = modelViewMatrix * vec4(position,1.0);

gl_PointSize = 2.5 * (300.0 / -mvPosition.z);

gl_Position = projectionMatrix * mvPosition;

}
`,

fragmentShader:`

uniform float time;
varying vec3 vColor;

void main(){

float dist = length(gl_PointCoord - vec2(0.5));

float glow = smoothstep(0.5,0.0,dist);

float twinkle = 0.9 + 0.1*sin(time*4.0 + gl_FragCoord.x*0.02);

gl_FragColor = vec4(vColor,glow*twinkle);

}
`

})

}
