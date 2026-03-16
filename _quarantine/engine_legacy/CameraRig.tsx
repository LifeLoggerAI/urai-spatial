"use client"

import {useFrame,useThree} from "@react-three/fiber"
import {useRef} from "react"
import * as THREE from "three"

export default function CameraRig(){

const {camera}=useThree()

const target=new THREE.Vector3(0,0,0)
const pos=new THREE.Vector3(0,120,240)

const initialized=useRef(false)

useFrame(()=>{

if(!initialized.current){
camera.position.copy(pos)
camera.lookAt(target)
initialized.current=true
}

})

return null
}
