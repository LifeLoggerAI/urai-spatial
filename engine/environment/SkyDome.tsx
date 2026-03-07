"use client"

export default function SkyDome(){
  return(
    <mesh scale={500}>
      <sphereGeometry args={[1,32,32]}/>
      <meshBasicMaterial
        color="#05070d"
        side={1}
      />
    </mesh>
  )
}
