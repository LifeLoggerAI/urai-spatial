"use client"

import { useMemo, useRef, useEffect } from "react"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

const STAR_COUNT = 25000
const RADIUS = 520
const HEIGHT = 90

type Star = {
id:number
position:[number,number,number]
scale:number
}

function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export default function Starfield(){

const mesh = useRef<THREE.InstancedMesh>(null!)
const selectStar = useSpatialStore(s=>s.selectStar)

const stars:Star[] = useMemo(()=>{
const seed = 19;
const random = mulberry32(seed);

const data:Star[] = []

const arms = 4
const armSpread = 0.5

for(let i=0;i<STAR_COUNT;i++){

const arm = Math.floor(random()*arms)

const radius = Math.pow(random(),0.5) * RADIUS

const spin = radius * 0.02

const baseAngle = (arm/arms)*Math.PI*2

const angle =
baseAngle +
spin +
(random()-0.5)*armSpread

const height = (random()-0.5)*HEIGHT

const x = Math.cos(angle)*radius
const y = height
const z = Math.sin(angle)*radius

const scale = random()*0.7 + 0.2

data.push({
id:i,
position:[x,y,z],
scale
})

}

return data

},[])

useEffect(()=>{

if(!mesh.current) return

const dummy = new THREE.Object3D()

stars.forEach((star,i)=>{

dummy.position.set(
star.position[0],
star.position[1],
star.position[2]
)

dummy.scale.set(star.scale,star.scale,star.scale)

dummy.updateMatrix()

mesh.current!.setMatrixAt(i,dummy.matrix)

})

mesh.current.instanceMatrix.needsUpdate = true

},[stars])

const click=(e:any)=>{

const id = e.instanceId
if(id==null) return

const star = stars[id]

selectStar(
star.id,
new THREE.Vector3(...star.position)
)

}

return(

<instancedMesh
ref={mesh}
args={[undefined,undefined,STAR_COUNT]}
onClick={click}

>

<sphereGeometry args={[0.7,8,8]} />

<meshBasicMaterial color="#ffffff"/>

</instancedMesh>

)

}
