"use client"
import * as THREE from "three"

export default function NebulaVolume(){
return( <mesh position={[0,0,0]}> <sphereGeometry args={[900,32,32]}/> <meshBasicMaterial color="#0b1030" transparent opacity={0.15} side={THREE.BackSide}/> </mesh>
)
}
