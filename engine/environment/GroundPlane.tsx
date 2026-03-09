"use client"

export default function GroundPlane(){
  return(
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-3,0]}>
      <planeGeometry args={[500,500]}/>
      <meshStandardMaterial
        color="#020406"
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
}
