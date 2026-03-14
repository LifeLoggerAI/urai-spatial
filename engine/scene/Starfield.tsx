"use client"

import { useMemo, useRef } from "react"
import { useFrame, useLoader } from "@react-three/fiber"
import * as THREE from "three"

import { createStarSpriteMaterial } from "../shaders/StarSpriteMaterial"
import { createStarDiffractionMaterial } from "../shaders/StarDiffractionMaterial"
import { useSpatialStore } from "../state/spatialStore"
import { STAR_DATA } from "../data/starData"
import { kelvinToRGB } from "../utils/starTemperature"
import { spiralDensity } from "../shaders/SpiralDensityField"

const STAR_COUNT = 12000

const BULGE_RADIUS = 90
const DISK_RADIUS = 420
const DISK_THICKNESS = 80
const ARM_COUNT = 4

export default function Starfield(){

const groupRef = useRef<THREE.Group>(null!)
const selectStar = useSpatialStore(s => s.selectStar)

const sprite = useLoader(
  THREE.TextureLoader,
  "/star-sprite.png"
)

sprite.colorSpace = THREE.SRGBColorSpace
sprite.magFilter = THREE.LinearFilter
sprite.minFilter = THREE.LinearMipMapLinearFilter
sprite.generateMipmaps = true

const {
normalGeo,
brightGeo,
dustGeo,
normalMat,
brightMat,
dustMat
} = useMemo(()=>{

const normalPositions:number[] = []
const brightPositions:number[] = []
const dustPositions:number[] = []

const normalColors:number[] = []
const brightColors:number[] = []

const normalSizes:number[] = []
const brightSizes:number[] = []

for(let i=0;i<STAR_COUNT;i++){

  const r =
    Math.pow(Math.random(),0.55) *
    DISK_RADIUS

  const arm = i % ARM_COUNT
  const armAngle = (arm/ARM_COUNT) * Math.PI*2
  const spiral = r * 0.11

  const theta =
    armAngle +
    spiral +
    (Math.random()-0.5)*0.25

  const x = Math.cos(theta)*r
  const z = Math.sin(theta)*r

  const density =
    spiralDensity(x,z,ARM_COUNT)

  const bulge =
    Math.exp(-(r*r)/(BULGE_RADIUS*BULGE_RADIUS))

  const verticalSpread =
    (DISK_THICKNESS*(1-bulge) +
     BULGE_RADIUS*bulge)

  const y =
    (Math.random()-0.5) *
    verticalSpread

  const brightness =
    Math.random() * density

  const distanceScale =
    1 - (r / DISK_RADIUS)

  const temp =
    2600 + Math.random()*9000

  const [cr,cg,cb] =
    kelvinToRGB(temp)

  if(brightness < 0.985){

    normalPositions.push(x,y,z)

    normalSizes.push(
      (Math.random()*0.5 + 0.25) *
      (0.35 + distanceScale*0.65)
    )

    normalColors.push(
      cr * 0.7,
      cg * 0.7,
      cb * 0.7
    )

  } else {

    brightPositions.push(x,y,z)

    brightSizes.push(
      0.9 + Math.random()*0.45
    )

    brightColors.push(
      cr,
      cg,
      cb
    )

  }

  if(Math.random() < 0.07){

    dustPositions.push(
      x + (Math.random()-0.5)*25,
      y + (Math.random()-0.5)*16,
      z + (Math.random()-0.5)*25
    )

  }

}

const normalGeo = new THREE.BufferGeometry()
const brightGeo = new THREE.BufferGeometry()
const dustGeo = new THREE.BufferGeometry()

normalGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(normalPositions,3)
)

normalGeo.setAttribute(
  "color",
  new THREE.Float32BufferAttribute(normalColors,3)
)

normalGeo.setAttribute(
  "size",
  new THREE.Float32BufferAttribute(normalSizes,1)
)

brightGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(brightPositions,3)
)

brightGeo.setAttribute(
  "color",
  new THREE.Float32BufferAttribute(brightColors,3)
)

brightGeo.setAttribute(
  "size",
  new THREE.Float32BufferAttribute(brightSizes,1)
)

dustGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(dustPositions,3)
)

const normalMat = createStarSpriteMaterial()
const brightMat = createStarDiffractionMaterial()

normalMat.uniforms.sprite = { value: sprite }
brightMat.uniforms.sprite = { value: sprite }

const dustMat = new THREE.PointsMaterial({

  size:0.45,
  map:sprite,
  transparent:true,
  opacity:0.012,
  alphaTest:0.1,
  depthWrite:false,
  blending:THREE.AdditiveBlending,
  color:"#8899aa"

})

return {
  normalGeo,
  brightGeo,
  dustGeo,
  normalMat,
  brightMat,
  dustMat
}

},[sprite])

useFrame((state,delta)=>{

if(groupRef.current){
  groupRef.current.rotation.y += delta * 0.018
}

if(normalMat.uniforms?.time){
  normalMat.uniforms.time.value =
    state.clock.elapsedTime
}

if(brightMat.uniforms?.time){
  brightMat.uniforms.time.value =
    state.clock.elapsedTime
}

})

const handleClick = (event:any)=>{

event.stopPropagation()

if(event.index == null) return

const index = event.index

const posArray =
  event.object.geometry.attributes.position.array

const x = posArray[index*3]
const y = posArray[index*3+1]
const z = posArray[index*3+2]

const starPos = new THREE.Vector3(x,y,z)

selectStar(index, starPos)

}

return(

<group ref={groupRef} rotation={[0.15,0,0.02]}>

  <points
    geometry={dustGeo}
    material={dustMat}
    frustumCulled={false}
  />

  <points
    geometry={normalGeo}
    material={normalMat}
    onClick={handleClick}
    frustumCulled={false}
  />

  <points
    geometry={brightGeo}
    material={brightMat}
    onClick={handleClick}
    frustumCulled={false}
  />

</group>

)

}