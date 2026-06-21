import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Home',
  description: 'The private-by-default URAI launch home field.',
}

export default function HomeRoutePage() {
  return <RootModeExperience initialMode="home" />
}
