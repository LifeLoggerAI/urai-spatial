"use client"
import * as THREE from "three"

export default function GalacticCore(){

return( <mesh position={[0,0,0]}> <sphereGeometry args={[40,32,32]}/> <meshBasicMaterial
color="#ffe7b0"
transparent
opacity={0.25}
/> </mesh>
)

}
