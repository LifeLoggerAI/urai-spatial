import * as THREE from "three"

export function createGalaxy(count:number){
  const positions = new Float32Array(count*3)

  for(let i=0;i<count;i++){
    const r = Math.random()*500
    const angle = Math.random()*Math.PI*2
    const height = (Math.random()-0.5)*40

    positions[i*3]   = Math.cos(angle)*r
    positions[i*3+1] = height
    positions[i*3+2] = Math.sin(angle)*r
  }

  return positions
}
