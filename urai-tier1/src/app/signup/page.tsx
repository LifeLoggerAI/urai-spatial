import LoginClient from '../login/LoginClient'

export const metadata = {
  title: 'URAI - Create Your Private World',
  description: 'Create or open your private URAI world through the configured Firebase identity provider.',
}

export default function SignupPage() {
  return <LoginClient />
}
