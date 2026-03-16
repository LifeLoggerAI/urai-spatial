"use client"

import * as THREE from "three"
import {useFrame} from "@react-three/fiber"
import {useRef} from "react"

export default function PerlinNebula(){

const mesh = useRef<THREE.Mesh>(null!)

useFrame(({clock})=>{
if(mesh.current){
(mesh.current.material as any).uniforms.time.value = clock.elapsedTime
}
})

return(

<mesh ref={mesh}>

<sphereGeometry args={[1200,32,32]}/>

<shaderMaterial
side={THREE.BackSide}
transparent
depthWrite={false}

uniforms={{
time:{value:0}
}}

vertexShader={`

varying vec3 vPos;

void main(){

vPos = position;

gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);

}

`}

fragmentShader={`

uniform float time;
varying vec3 vPos;

float hash(vec3 p){
return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);
}

float noise(vec3 p){

vec3 i = floor(p);
vec3 f = fract(p);

float n = mix(
mix(hash(i),hash(i+vec3(1,0,0)),f.x),
mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),
f.y
);

return n;

}

void main(){

float n = noise(vPos*0.01 + time*0.02);

vec3 col = vec3(0.08,0.12,0.35)*n;

gl_FragColor = vec4(col,0.18*n);

}

`}

/>

</mesh>

)

}
