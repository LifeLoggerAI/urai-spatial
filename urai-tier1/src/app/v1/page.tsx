import { redirect } from 'next/navigation'

export default function V1CompatibilityPage() {
  redirect('/home?from=v1')
}
