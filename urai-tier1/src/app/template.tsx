import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import './spatial-runtime-restoration.css'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeSpatialRuntimeLayer />
      {children}
    </>
  )
}
