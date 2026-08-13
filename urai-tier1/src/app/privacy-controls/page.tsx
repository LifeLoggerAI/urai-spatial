import ConsentSanctuaryClient from './ConsentSanctuaryClient'

export const metadata = {
  title: 'URAI Privacy — Permissions & Consent',
  description: 'Review, narrow, pause, revoke, and understand the permissions URAI uses, with clear consent history and user-controlled changes.',
}

export default function PrivacyControlsRoutePage() {
  return <ConsentSanctuaryClient />
}
