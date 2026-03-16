"use client"

import NebulaLayer from "./NebulaLayer"

export default function NebulaSky(){

  return (

    <group>

      <NebulaLayer
        radius={520}
        speed={0.00010}
        colorA="#01030a"
        colorB="#14206a"
        opacity={0.12}
      />

      <NebulaLayer
        radius={460}
        speed={0.00018}
        colorA="#020617"
        colorB="#2f4bff"
        opacity={0.10}
      />

      <NebulaLayer
        radius={400}
        speed={0.00026}
        colorA="#040a20"
        colorB="#5c84ff"
        opacity={0.08}
      />

    </group>

  )

}