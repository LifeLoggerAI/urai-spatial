import { AssetFactoryRoutePanel } from '@/components/urai/assets/AssetFactoryRoutePanel'
import SpatialRealPlaceWorld from '../SpatialRealPlaceWorld'

export default function LifeMapPage() {
  return (
    <>
      <SpatialRealPlaceWorld mode="life-map" />
      <AssetFactoryRoutePanel route="/life-map" title="Life Map Launch Asset Pipeline" />
    </>
  )
}
