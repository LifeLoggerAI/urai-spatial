"use client"

import { useMemo } from "react"
import { Line } from "@react-three/drei"
import { lifeDataset } from "../lifemap/lifeDataset"
import { generateClusters } from "../lifemap/clusterStars"

function dist(a,b){
  const dx=a[0]-b[0]
  const dy=a[1]-b[1]
  const dz=a[2]-b[2]
  return Math.sqrt(dx*dx+dy*dy+dz*dz)
}

export default function ConstellationLines(){

  const clusters = useMemo(()=>generateClusters(25),[])

  const lines = useMemo(()=>{

    const out=[]

    clusters.forEach(cluster=>{

      const stars = cluster.stars.map(id=>lifeDataset[id])

      const maxLinks = Math.min(12, stars.length)

      for(let i=0;i<maxLinks;i++){

        const a = stars[i]

        let nearest=null
        let best=Infinity

        stars.forEach(b=>{
          if(a===b) return
          const d = dist(a.position,b.position)
          if(d<best){
            best=d
            nearest=b
          }
        })

        if(nearest){
          out.push([a.position,nearest.position])
        }

      }

    })

    return out

  },[clusters])

  return(

    <group>

      {lines.map((pair,i)=>(
        <Line
          key={i}
          points={pair}
          color="#7fa8ff"
          lineWidth={1}
          transparent
          opacity={0.25}
        />
      ))}

    </group>

  )

}
