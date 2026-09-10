import GroundMovementAccessibilityStatus from './GroundMovementAccessibilityStatus'
import HomeAccessibleMovementControls from './HomeAccessibleMovementControls'
import HomeParallaxTelemetryBridge from './HomeParallaxTelemetryBridge'
import HomeSemanticOrbHydrationBridge from './HomeSemanticOrbHydrationBridge'
import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import './spatial-runtime-restoration.css'
import './continuous-spatial-proof-defects.css'
import './premium-spatial-atmosphere.css'
import './home-provider-preview-composition.css'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeParallaxTelemetryBridge />
      <HomeSemanticOrbHydrationBridge />
      <HomeSpatialRuntimeLayer />
      <HomeAccessibleMovementControls />
      <GroundMovementAccessibilityStatus />
      {children}
    </>
  )
}
