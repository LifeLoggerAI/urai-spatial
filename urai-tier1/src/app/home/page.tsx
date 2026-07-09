import { AssetFactoryRoutePanel } from '@/components/urai/assets/AssetFactoryRoutePanel'
import SpatialRealPlaceWorld from '@/app/SpatialRealPlaceWorld'

export default function HomeRoutePage() {
  return (
    <>
      <SpatialRealPlaceWorld mode="home" />
      <AssetFactoryRoutePanel route="/home" title="Home Launch Asset Pipeline" />
    </>
  )
}
