"use client"

import {useMemo} from "react"
import * as THREE from "three"

const COUNT=6000

export default function StarSprites(){

const stars = useMemo(()=>{

const arr=[]

for(let i=0;i<COUNT;i++){

arr.push({
x:(Math.random()-0.5)*1200,
y:(Math.random()-0.5)*300,
z:(Math.random()-0.5)*1200
})

}

return arr

},[])

return(
<>
{stars.map((s,i)=>( <sprite key={i} position={[s.x,s.y,s.z]}> <spriteMaterial
color="#ffffff"
transparent
opacity={0.9}
/> </sprite>
))}
</>
)

}
