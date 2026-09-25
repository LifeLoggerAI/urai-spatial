import { redirect } from 'next/navigation'

export const metadata = { title: 'UrAi First-Run Guide', description: 'Begin the canonical UrAi first-run sequence at Home.' }

export default function OnboardingCompatibilityPage() {
  redirect('/home?onboarding=1')
}
