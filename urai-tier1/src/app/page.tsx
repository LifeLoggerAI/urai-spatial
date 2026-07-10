import SpatialWorldCanvas from '@/spatial/components/world/SpatialWorldCanvas'

export const metadata = {
  title: 'URAI Spatial',
  description: 'URAI opens directly into the live 3D spatial world canvas.',
}

export default function RootPage() {
  return <SpatialWorldCanvas mode="spatial" />
}
