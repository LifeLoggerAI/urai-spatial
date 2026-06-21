import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Mirror',
  description: 'URAI Mirror is the Tier Three reflection route connected to the spatial runtime.',
}

export default function MirrorRoutePage() {
  return <RootModeExperience initialMode="mirror" />
}
