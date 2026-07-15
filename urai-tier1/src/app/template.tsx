import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'
import LifeMapDeepLinkRestoration from './LifeMapDeepLinkRestoration'
import './spatial-runtime-restoration.css'
import './spatial-proof-repair.css'

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HomeSpatialRuntimeLayer />
      <LifeMapDeepLinkRestoration />
      {children}
    </>
  )
}
