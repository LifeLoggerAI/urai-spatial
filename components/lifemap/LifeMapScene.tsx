import Starfield from "./Starfield"
import Orb from "./Orb"
import CosmicFog from "./CosmicFog"
import Constellations from "./Constellations"
import TraumaCloud from "./TraumaCloud"
import RecoveryBloom from "./RecoveryBloom"
import { useState } from "react"
import BloomOverlay from "./BloomOverlay"
import { useCameraController } from "./useCameraController"

export default function LifeMapScene() {
  const [selectedStar, setSelectedStar] = useState(null)
  const { zoomTo, resetCamera } = useCameraController()

  const handleStarClick = (star: any) => {
    setSelectedStar(star)
    zoomTo(star.position)
  }

  const handleClose = () => {
    setSelectedStar(null)
    resetCamera()
  }

  return (
    <>
      <Starfield onStarClick={handleStarClick} />
      <Orb />
      <CosmicFog />
      <Constellations />
      <TraumaCloud />
      <RecoveryBloom />
      <BloomOverlay visible={!!selectedStar} />
    </>
  )
}
