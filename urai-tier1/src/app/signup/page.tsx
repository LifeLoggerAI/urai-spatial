import { redirect } from 'next/navigation'

export const metadata = { title: 'UrAi Sign Up', description: 'Open the canonical UrAi identity entry for a new or returning account.' }

export default function SignupCompatibilityPage() {
  redirect('/login?from=signup')
}
