import CommunicationSettingsClient from './CommunicationSettingsClient'

export const metadata = {
  title: 'UrAi Communication Settings',
  description: 'Manage optional UrAi SMS consent and communication preferences.',
}

export default function CommunicationSettingsPage() {
  return <CommunicationSettingsClient />
}
