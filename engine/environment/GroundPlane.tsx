"use client"

export default function GroundPlane(){
  return(
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-60,0]}>
      <planeGeometry args={[800,800,1,1]}/>
      <meshBasicMaterial
        color="#0a0c14"
        transparent
        opacity={0.85}
      />
    </mesh>
  )
}
