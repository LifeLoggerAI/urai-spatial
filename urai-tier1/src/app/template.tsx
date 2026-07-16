import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import './spatial-runtime-restoration.css'
import './continuous-spatial-proof-defects.css'
import './premium-mobile-composition.css'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeSpatialRuntimeLayer />
      {children}
    </>
  )
}
