import PreviewBuildIdentity from './PreviewBuildIdentity'
import StatusReleaseAuthority from './StatusReleaseAuthority'
import { assetCssStack, statusAssets } from '@/spatial/assets/uraiAssets'
import { publicIndexing } from '../public-indexing'

const configuredBuildSha = process.env.NEXT_PUBLIC_URAI_BUILD_SHA ?? process.env.GITHUB_SHA ?? ''
const embeddedBuildSha = /^[0-9a-f]{40}$/.test(configuredBuildSha) ? configuredBuildSha : 'unverified'
const shortBuildSha = embeddedBuildSha === 'unverified' ? embeddedBuildSha : embeddedBuildSha.slice(0, 12)
const title = 'URAI Status'
const description = 'URAI Spatial fingerprint-gated release authority and bounded certification matrix.'

export const metadata = {
  robots: publicIndexing,
  alternates: { canonical: 'https://urai.app/status/' },
  openGraph: {
    url: 'https://urai.app/status/',
    title,
    description,
    siteName: 'UrAi',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
  title,
  description,
}

export default function StatusRoutePage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#020713] px-4 py-8 text-white md:px-8"
      data-testid="urai-final-status-control-room"
      data-launch-surface="premium-status-control-room"
      data-production-certification="fingerprint-gated"
      data-launch-truth-source="urai-tier1/src/data/launchTruth.ts"
      data-canonical-asset={statusAssets.primary.src}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.16] mix-blend-screen"
        style={{ backgroundImage: assetCssStack(statusAssets.primary), backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(103,232,249,0.20),transparent_30%),radial-gradient(circle_at_76%_28%,rgba(192,132,252,0.18),transparent_32%),linear-gradient(180deg,#020713_0%,#04111b_58%,#01040a_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_0_38%,rgba(0,0,0,0.64)_78%,rgba(0,0,0,0.92)_100%)]" />
      <section className="relative z-10 mx-auto max-w-[1480px]">
        <PreviewBuildIdentity fullSha={embeddedBuildSha} shortSha={shortBuildSha} />
        <StatusReleaseAuthority />
      </section>
    </main>
  )
}
