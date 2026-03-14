import * as THREE from "three"

export const STAR_COUNT = 1500
export const RADIUS = 40

function hash(i:number){
  const x = Math.sin(i * 9999.1337) * 43758.5453
  return x - Math.floor(x)
}

function generateStars(count:number):ReadonlyArray<THREE.Vector3>{

  const positions:THREE.Vector3[] = []

  for(let i=0;i<count;i++){

    const u = hash(i*3)
    const v = hash(i*7)

    const theta = 2 * Math.PI * u
    const phi = Math.acos(2*v - 1)

    const x = RADIUS * Math.sin(phi) * Math.cos(theta)
    const y = RADIUS * Math.sin(phi) * Math.sin(theta)
    const z = RADIUS * Math.cos(phi)

    positions.push(new THREE.Vector3(x,y,z))
  }

  return Object.freeze(positions)
}

export const STAR_POSITIONS = generateStars(STAR_COUNT)