import GroundSpatialWorldClean from '@/app/GroundSpatialWorldClean'
import { AssetFactoryRoutePanel } from '@/components/urai/assets/AssetFactoryRoutePanel'

export const metadata = {
  title: 'URAI Ground',
  description: 'The URAI Ground route opens a clean explorable street-level city spatial world.',
}

export default function GroundPage() {
  return (
    <>
      <GroundSpatialWorldClean />
      <AssetFactoryRoutePanel route="/ground" title="Ground Launch Asset Pipeline" />
    </>
  )
}
