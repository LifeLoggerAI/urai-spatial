import HomeParallaxTelemetryBridge from './HomeParallaxTelemetryBridge'
import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import HomeWebGLFallbackBoundary from './HomeWebGLFallbackBoundary'
import './spatial-runtime-restoration.css'
import './continuous-spatial-proof-defects.css'
import './premium-spatial-atmosphere.css'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeParallaxTelemetryBridge />
      <HomeSpatialRuntimeLayer />
      <HomeWebGLFallbackBoundary />
      {children}
    </>
  )
}
