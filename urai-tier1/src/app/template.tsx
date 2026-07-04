import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import './home-spatial-runtime-layer.css'
import './home-spatial-runtime-fallback.css'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeSpatialRuntimeLayer />
      {children}
    </>
  )
}
