"use client"

import {useFrame,useThree} from "@react-three/fiber"
import {useSpatialStore} from "../state/spatialStore"
import * as THREE from "three"
import {useRef} from "react"

export default function CameraDive(){

const {camera} = useThree()

const targetStar = useSpatialStore(s=>s.selectedStarPosition)

const current = useRef(new THREE.Vector3())
const target = useRef(new THREE.Vector3())

useFrame(()=>{

if(!targetStar) return

target.current.copy(targetStar).add(new THREE.Vector3(0,10,25))

current.current.lerp(target.current,0.03)

camera.position.copy(current.current)

camera.lookAt(targetStar)

})

return null

}
