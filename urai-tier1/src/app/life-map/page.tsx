import { LaunchRoutePanel } from '../LaunchRoutePanel'
import { RootModeExperience } from '../RootModeExperience'

export default function LifeMapPage() {
  return (
    <>
      <RootModeExperience initialMode="life-map" />
      <LaunchRoutePanel variant="life-map" />
    </>
  )
}
