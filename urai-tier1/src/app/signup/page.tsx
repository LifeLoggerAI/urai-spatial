import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Account Entry',
  description: 'Continue through the configured private identity provider to create or enter your URAI account.',
}

export default function SignupCompatibilityPage() {
  redirect('/login?intent=signup')
}
