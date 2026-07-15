import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import './spatial-runtime-restoration.css'
import './continuous-spatial-proof-defects.css'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeSpatialRuntimeLayer />
      {children}
    </>
  )
}
