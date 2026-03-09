"use client"

export default function MemoryImage({ position }) {

if(!position) return null

return (

```
<mesh position={[position[0],position[1],position[2]-0.01]}>

  <planeGeometry args={[1.8,1.8]} />

  <meshBasicMaterial color="white" />

</mesh>
```

)
}
