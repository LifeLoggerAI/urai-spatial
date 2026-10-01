import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Onboarding',
  description: 'Enter the canonical first-run URAI guidance layer.',
}

export default function OnboardingCompatibilityPage() {
  redirect('/?onboarding=1')
}
