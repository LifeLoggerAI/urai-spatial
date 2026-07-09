import { AssetFactoryRoutePanel } from '@/components/urai/assets/AssetFactoryRoutePanel'
import { FinalFocusChamber } from '@/app/FinalMemorySurfaces'

export default function FocusRoutePage() {
  return (
    <main data-urai-route-fingerprint="focus-selected-memory-camera-chamber">
      <h1 className="sr-only">Selected memory camera chamber</h1>
      <FinalFocusChamber />
      <AssetFactoryRoutePanel route="/focus" title="Focus Launch Asset Pipeline" />
    </main>
  )
}
