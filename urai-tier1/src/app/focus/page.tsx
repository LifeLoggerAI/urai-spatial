import { AssetFactoryRoutePanel } from '@/components/urai/assets/AssetFactoryRoutePanel'
import M from '../MemoryStarJourneyWorld'

export default function FocusRoutePage() {
  return (
    <>
      <M mode="focus" />
      <AssetFactoryRoutePanel route="/focus" title="Focus Asset Factory" />
    </>
  )
}
