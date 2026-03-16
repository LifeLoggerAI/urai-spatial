"use client"

import {useMemo} from "react"
import * as THREE from "three"

const STAR_COUNT = 200000
const RADIUS = 650

export default function GPUStarfield(){

const points = useMemo(()=>{

const positions = new Float32Array(STAR_COUNT*3)
const colors = new Float32Array(STAR_COUNT*3)
const sizes = new Float32Array(STAR_COUNT)

const arms = 4

for(let i=0;i<STAR_COUNT;i++){

const arm = Math.floor(Math.random()*arms)

const radius = Math.pow(Math.random(),0.7)*RADIUS

const spin = radius*0.018

const baseAngle = (arm/arms)*Math.PI*2

const angle =
baseAngle +
spin +
(Math.random()-0.5)*0.5

const dustLane = Math.exp(-Math.abs(Math.sin(angle*arms))*4.0)

const x = Math.cos(angle)*radius
const y = (Math.random()-0.5)*80 * dustLane
const z = Math.sin(angle)*radius

positions[i*3] = x
positions[i*3+1] = y
positions[i*3+2] = z

const temp = Math.random()

let c = new THREE.Color()

if(temp<0.2) c.set("#9bbcff")
else if(temp<0.5) c.set("#cad8ff")
else if(temp<0.8) c.set("#fff4ea")
else c.set("#ffd2a1")

colors[i*3]=c.r
colors[i*3+1]=c.g
colors[i*3+2]=c.b

sizes[i]=Math.random()*2+0.5

}

const g = new THREE.BufferGeometry()

g.setAttribute("position",new THREE.BufferAttribute(positions,3))
g.setAttribute("color",new THREE.BufferAttribute(colors,3))
g.setAttribute("size",new THREE.BufferAttribute(sizes,1))

const m = new THREE.ShaderMaterial({

transparent:true,
depthWrite:false,
vertexColors:true,
blending:THREE.AdditiveBlending,

uniforms:{
time:{value:0}
},

vertexShader:`

attribute float size;
varying vec3 vColor;

void main(){

vColor = color;

vec4 mvPosition = modelViewMatrix * vec4(position,1.0);

gl_PointSize = size * (300.0 / -mvPosition.z);

gl_Position = projectionMatrix * mvPosition;

}

`,

fragmentShader:`

uniform float time;
varying vec3 vColor;

void main(){

float d = length(gl_PointCoord-vec2(0.5));

float glow = smoothstep(0.5,0.0,d);

float spike = max(
smoothstep(0.02,0.0,abs(gl_PointCoord.x-0.5)),
smoothstep(0.02,0.0,abs(gl_PointCoord.y-0.5))
);

float twinkle = 0.9 + 0.1*sin(time*5.0 + gl_FragCoord.x*0.03);

float intensity = glow + spike*0.4;

gl_FragColor = vec4(vColor,intensity*twinkle);

}

`

})

return new THREE.Points(g,m)

},[])

return <primitive object={points}/>

}
