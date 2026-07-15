import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import './spatial-runtime-restoration.css'
import './continuous-spatial-proof-defects.css'
import './home-webgl-legacy-owner-fix.css'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeSpatialRuntimeLayer />
      {children}
    </>
  )
}
