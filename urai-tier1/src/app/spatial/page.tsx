import SpatialWorldCanvas from '@/spatial/components/world/SpatialWorldCanvas'

export const metadata = {
  title: 'URAI Spatial',
  description:
    'URAI Spatial opens into the live 3D world canvas with connected Ground, Life Map, Focus, Replay, Passport, and Status paths.',
}

export default function SpatialPage() {
  return <SpatialWorldCanvas mode="spatial" />
}
