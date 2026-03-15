"use client"

export default function CoreGlow(){
return( <mesh position={[0,0,0]}> <sphereGeometry args={[50,32,32]}/> <meshBasicMaterial color="#ffe8b6" transparent opacity={0.35}/> </mesh>
)
}
