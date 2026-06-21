import { ProductionLifeMap } from '../../../life-map/ProductionLifeMap'

export const metadata = {
  title: 'URAI Life Map',
  description: 'The unified three dimensional URAI Life Map experience.',
}

export default function SpatialLifeMapPage() {
  return <ProductionLifeMap surface="spatial" />
}
