import HomeParallaxTelemetryBridge from './HomeParallaxTelemetryBridge'
import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import './spatial-runtime-restoration.css'
import './continuous-spatial-proof-defects.css'
import './premium-spatial-atmosphere.css'
import './home-provider-preview-composition.css'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeParallaxTelemetryBridge />
      <HomeSpatialRuntimeLayer />
      {children}
    </>
  )
}
