import ConsentSanctuaryClient from './ConsentSanctuaryClient'
import { publicIndexing } from '../public-indexing'

export const metadata = {
  robots: publicIndexing,
  title: 'URAI Privacy — Permissions & Consent',
  description: 'Review, narrow, pause, revoke, and understand the permissions URAI uses, with clear consent history and user-controlled changes.',
}

export default function PrivacyControlsRoutePage() {
  return <ConsentSanctuaryClient />
}
