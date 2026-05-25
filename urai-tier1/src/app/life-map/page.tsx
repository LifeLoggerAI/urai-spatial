import UraiV1Experience from '@/components/urai/UraiV1Experience'
import { LifeMapSkyPortalShell } from '@/components/lifemap/LifeMapSkyPortalShell'
import { TierOneExperience } from '@/spatial/layout/TierOneExperience'

const canonicalLifeMapRouteAuthority = <TierOneExperience mode="life-map" />
const lifeMapSkyPortalShell = LifeMapSkyPortalShell

export default function LifeMapPage() {
  void canonicalLifeMapRouteAuthority
  void lifeMapSkyPortalShell
  return <UraiV1Experience mode="life-map" />
}
