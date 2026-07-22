import ConsentSanctuaryClient from './ConsentSanctuaryClient'

export const metadata = {
  title: 'UrAi Consent Sanctuary',
  description: 'Inspect, preview, narrow, pause, revoke, and audit consent inside the private UrAi world.',
}

export default function PrivacyControlsRoutePage() {
  return <ConsentSanctuaryClient />
}
