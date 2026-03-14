"use client"

import { useMemo } from "react"
import * as THREE from "three"

const CONE_COUNT = 140

export default function BrightStarCones(){

  const group = useMemo(()=>{

    const g = new THREE.Group()

    for(let i=0;i<CONE_COUNT;i++){

      const geo = new THREE.ConeGeometry(4,70,12,1,true)

      const mat = new THREE.MeshBasicMaterial({
        color:"#ffffff",
        transparent:true,
        opacity:0.035,
        depthWrite:false,
        blending:THREE.AdditiveBlending,
        side:THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(geo,mat)

      const r = 300 + Math.random()*400
      const theta = Math.random()*Math.PI*2
      const phi = Math.acos(Math.random()*2-1)

      mesh.position.set(
        r*Math.sin(phi)*Math.cos(theta),
        r*Math.sin(phi)*Math.sin(theta),
        r*Math.cos(phi)
      )

      mesh.rotation.x = Math.random()*Math.PI
      mesh.rotation.y = Math.random()*Math.PI

      g.add(mesh)

    }

    return g

  },[])

  return <primitive object={group}/>
}
