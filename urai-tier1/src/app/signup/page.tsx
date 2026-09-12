import LoginClient from '../login/LoginClient'

export const metadata = {
  title: 'URAI - Create Your Private World',
  description: 'Create your private URAI account through the configured Firebase identity provider.',
}

export default function SignupPage() {
  return <LoginClient intent="signup" />
}
