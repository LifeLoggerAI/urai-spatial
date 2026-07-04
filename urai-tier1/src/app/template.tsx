import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import './home-spatial-runtime-layer.css'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeSpatialRuntimeLayer />
      {children}
    </>
  )
}
