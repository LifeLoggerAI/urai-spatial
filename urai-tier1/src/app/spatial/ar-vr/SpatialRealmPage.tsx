import UraiQuestEntryWorldV2 from './UraiQuestEntryWorldV2'
import type { SpatialRealmId } from './xrEntryWorldRuntime'

type SpatialRealmPageProps = {
  realm: SpatialRealmId
}

export default function SpatialRealmPage({ realm }: SpatialRealmPageProps) {
  return <UraiQuestEntryWorldV2 initialRealm={realm} />
}
