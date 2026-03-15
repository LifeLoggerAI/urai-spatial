"use client"

import GPUStarfield from "../space/GPUStarfield"
import CinematicCamera from "../camera/CinematicCamera"
import CameraDive from "../camera/CameraDive"

import NebulaVolume from "../visual/NebulaVolume"
import NebulaClouds from "../visual/NebulaClouds"

import CoreGlow from "../visual/CoreGlow"
import CoreBloom from "../visual/CoreBloom"

export default function SceneController(){

return(
<>

<CinematicCamera/>

<CameraDive/>

<NebulaVolume/>

<NebulaClouds/>

<CoreGlow/>

<CoreBloom/>

<GPUStarfield/>

</>
)

}
