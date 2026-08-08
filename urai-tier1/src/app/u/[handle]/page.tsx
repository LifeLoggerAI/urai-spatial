import { redirect } from 'next/navigation'

export function generateStaticParams() {
  return [{ handle: 'adamclamp' }]
}

export default async function PublicUserCompatibilityPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const profile = encodeURIComponent(handle || 'adamclamp')
  redirect(`/life-map?demo=1&from=public-profile&handle=${profile}`)
}
