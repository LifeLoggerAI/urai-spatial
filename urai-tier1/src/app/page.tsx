import UraiV1Experience from '@/components/urai/UraiV1Experience'
import { TierOneExperience } from '@/spatial/layout/TierOneExperience'

const canonicalTierOneHomeRoute = <TierOneExperience mode="home" />

export default function HomePage() {
  void canonicalTierOneHomeRoute
  return <UraiV1Experience mode="home" />
}
