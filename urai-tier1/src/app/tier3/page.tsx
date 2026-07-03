import SpatialArVrPage from '../spatial/ar-vr/page'
import '../spatial/ar-vr/aaa-mobile.css'
import '../spatial/ar-vr/review-fixes.css'

export const metadata = {
  title: 'URAI Spatial Tier 3',
  description: 'Tier 3 spatial entry for the canonical AR, VR, and XR portal with manual-device proof boundaries.',
}

export const dynamic = 'force-static'

export default function Tier3Page() {
  return (
    <div className="urai-xr-route-shell" data-urai-tier="3">
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Tier 3 canonical spatial portal
      </span>
      <SpatialArVrPage />
    </div>
  )
}
