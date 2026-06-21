import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Focus',
  description: 'A stable focus chamber for selected memory review.',
}

export default function FocusRoutePage() {
  return <RootModeExperience initialMode="focus" />
}
