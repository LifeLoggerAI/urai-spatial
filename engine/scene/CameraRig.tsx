"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useMemoryTarget } from "../state/useMemoryTarget"
import { useRef, useEffect } from "react"
import * as THREE from "three"

export default function CameraRig() {

const { camera } = useThree()

const target = useMemoryTarget((s)=>s.target)
const lockCamera = useMemoryTarget((s)=>s.lockCamera)

const start = useRef(new THREE.Vector3())
const end = useRef(new THREE.Vector3())

const progress = useRef(0)
const locked = useRef(true)

const duration = 0.85

useEffect(()=>{

```
if(!target) return

console.log("CAMERA_TARGET", target)

progress.current = 0
locked.current = false

start.current.copy(camera.position)

end.current.set(
  target[0],
  target[1],
  target[2] + 2.5
)
```

},[target])

useFrame((state,delta)=>{

```
if(!target) return
if(locked.current) return

progress.current += delta / duration

const t = Math.min(progress.current,1)
const ease = t*t*(3-2*t)

camera.position.lerpVectors(start.current,end.current,ease)

camera.lookAt(target[0],target[1],target[2])

if(t >= 1){

  camera.position.copy(end.current)
  camera.lookAt(target[0],target[1],target[2])

  locked.current = true

  console.log("CAMERA_LOCKED")

  lockCamera()

}
```

})

return null
}
