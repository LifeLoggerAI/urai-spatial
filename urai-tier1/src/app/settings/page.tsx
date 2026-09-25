import DeviceSettingsClient from './DeviceSettingsClient'

export const metadata = {
  title: 'UrAi Settings - Device & Permission Controls',
  description: 'Control local device feel and move directly into UrAi privacy and ownership permissions.',
}

export default function SettingsPage() {
  return <DeviceSettingsClient />
}
