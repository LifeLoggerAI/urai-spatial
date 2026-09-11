import LoginClient from '../login/LoginClient'

export const metadata = {
  title: 'URAI - Create Your Private World',
  description: 'Create a private URAI account through the configured identity provider.',
}

export default function SignupPage() {
  return <LoginClient mode="signup" />
}
