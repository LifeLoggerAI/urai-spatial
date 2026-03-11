"use client"

export default function ClusterGlow({position}:{position:[number,number,number]}){

  return(

    <mesh position={position} scale={[6,6,1]}>
      <sphereGeometry args={[1,32,32]} />
      <meshBasicMaterial
        color="#7aa6ff"
        transparent
        opacity={0.05}
      />
    </mesh>

  )

}
