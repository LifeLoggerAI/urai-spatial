"use client"

import * as THREE from "three"

export default function NebulaClouds(){

return(

<mesh>

<sphereGeometry args={[1000,32,32]}/>

<meshBasicMaterial
color="#0a0f30"
transparent
opacity={0.12}
side={THREE.BackSide}
/>

</mesh>

)

}
