"use client"
import * as THREE from "three"

export default function NebulaFog(){

return( <mesh position={[0,0,0]}> <sphereGeometry args={[800,32,32]}/> <meshBasicMaterial
color="#0a0f2a"
transparent
opacity={0.12}
side={THREE.BackSide}
/> </mesh>
)

}
