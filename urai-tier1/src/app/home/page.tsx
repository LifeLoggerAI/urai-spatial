import SpatialWorldCanvas from '@/spatial/components/world/SpatialWorldCanvas'

export const metadata = {
  title: 'URAI Home World',
  description: 'The canonical URAI home route opens into the live 3D spatial world.',
}

export default function HomePage() {
  return <SpatialWorldCanvas mode="spatial" />
}
