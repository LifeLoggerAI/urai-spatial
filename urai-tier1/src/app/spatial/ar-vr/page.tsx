import UraiQuestEntryWorldV2 from './UraiQuestEntryWorldV2'
import { spatialLaunchBoundary } from '@/lib/spatial-launch-boundaries'

export const metadata = {
  title: 'UrAi XR World',
  description: 'An accessible, explorable spatial entry chamber. Immersive sessions remain gated until authorized.',
}

export default function SpatialArVrPage() {
  const immersiveSessionEnabled = spatialLaunchBoundary.liveArWebXrEnabled

  return (
    <>
      <h1 className="sr-only">URAI AR / VR / XR entry chamber</h1>
      {!immersiveSessionEnabled ? (
        <aside
          role="status"
          data-xr-release-state="technical-preview"
          className="relative z-10 bg-slate-950 px-6 py-3 text-center text-sm text-white"
        >
          Explorable entry chamber · desktop and touch technical preview.
          Live WebXR headset sessions remain disabled until consent, device
          verification, and governed release acceptance are complete.
        </aside>
      ) : null}
      <UraiQuestEntryWorldV2 immersiveSessionEnabled={immersiveSessionEnabled} />
    </>
  )
}
