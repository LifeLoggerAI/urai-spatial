import ConsentSanctuaryClient from './ConsentSanctuaryClient'

export const metadata = {
  title: 'UrAi Privacy - Permissions & Consent',
  description: 'Review, narrow, pause, revoke, and understand the permissions UrAi uses, with clear consent history and user-controlled changes.',
}

export default function PrivacyControlsRoutePage() {
  return <ConsentSanctuaryClient />
}
