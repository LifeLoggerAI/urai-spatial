import { ProductionLifeMap } from '../../life-map/ProductionLifeMap'

export const metadata = {
  title: 'URAI Life Map',
  description: 'A cinematic three dimensional emotional memory constellation.',
}

export default function LifeMapPage() {
  return <ProductionLifeMap surface="canonical" />
}
