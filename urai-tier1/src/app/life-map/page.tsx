import { AssetFactoryRoutePanel } from '@/components/urai/assets/AssetFactoryRoutePanel'
import RealLifeMapGalaxy from '@/components/lifemap/RealLifeMapGalaxy'

export default function LifeMapPage() {
  return (
    <>
      <RealLifeMapGalaxy />
      <AssetFactoryRoutePanel route="/life-map" title="Life Map Launch Asset Pipeline" />
    </>
  )
}
