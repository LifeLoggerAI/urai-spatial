import LifeMapClientScene from '@/components/lifemap/LifeMapClientScene'

export const metadata = {
  title: 'URAI Life Map',
  description:
    'The URAI Spatial Life Map with camera movement, living memory stars, Focus, Replay, Mirror, Passport, and XR entry.',
}

export default function LifeMapPage() {
  return <LifeMapClientScene />
}
