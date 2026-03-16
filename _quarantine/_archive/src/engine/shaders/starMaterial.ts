import * as THREE from "three"

export function createStarMaterial(){

return new THREE.ShaderMaterial({

transparent,
depthWrite,
blending.AdditiveBlending,

uniforms:{},

vertexShader:`

varying float vScale;

void main(){

vScale = position.z;

vec4 mvPosition = modelViewMatrix * vec4(position,1.0);

gl_PointSize = 4.0 * (300.0 / -mvPosition.z);

gl_Position = projectionMatrix * mvPosition;

}
`,

fragmentShader:`

void main(){

float dist = length(gl_PointCoord - vec2(0.5));

float glow = smoothstep(0.5,0.0,dist);

vec3 color = vec3(1.0);

gl_FragColor = vec4(color,glow);

}

`

})

}
