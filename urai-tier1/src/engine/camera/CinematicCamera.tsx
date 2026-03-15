"use client"
import {useFrame,useThree} from "@react-three/fiber"
import * as THREE from "three"
import {useRef} from "react"

export default function CinematicCamera(){

const {camera} = useThree()
const t = useRef(0)

useFrame((_,delta)=>{
t.current += delta*0.04
camera.position.x = Math.sin(t.current)*80
camera.position.z = 280 + Math.cos(t.current)*40
camera.position.y = 120 + Math.sin(t.current*0.5)*25
camera.lookAt(new THREE.Vector3(0,0,0))
})

return null
}
