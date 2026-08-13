import DeviceSettingsClient from './DeviceSettingsClient'

export const metadata = {
  title: 'URAI Settings — Device & Permission Controls',
  description: 'Control local device feel and move directly into URAI privacy and ownership permissions.',
}

export default function SettingsPage() {
  return <DeviceSettingsClient />
}
