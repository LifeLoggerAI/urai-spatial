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
colors[i*3*]()

mkdir -p src/engine/shaders
mkdir -p src/engine/visual
mkdir -p src/engine/space

############################################

# PERLIN NOISE NEBULA SHADER

############################################

cat > src/engine/visual/PerlinNebula.tsx <<'EOF'
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
