import { LaunchRoutePanel } from '../LaunchRoutePanel'
import { RootModeExperience } from '../RootModeExperience'

export default function LifeMapPage() {
  return (
    <>
      <LaunchRoutePanel variant="life-map" />
      <RootModeExperience initialMode="life-map" />
    </>
  )
}
