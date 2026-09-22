import type { Metadata } from 'next'
import PublicAuthorityShell from '@/components/public-authority/PublicAuthorityShell'
import { publicIndexing } from '../public-indexing'

export const metadata: Metadata = {
  robots: publicIndexing,
  title: 'Business information',
  description: 'Business, product, sales-status, billing, and support information for UrAi by URAI Labs LLC.',
  twitter: {
    card: 'summary',
    title: 'UrAi business information',
    description: 'Business, product, sales-status, billing, and support information for UrAi by URAI Labs LLC.',
  },
  alternates: { canonical: 'https://urai.app/business/' },
  openGraph: {
    type: 'website',
    url: 'https://urai.app/business/',
    title: 'UrAi business information',
    description: 'Business, product, sales-status, billing, and support information for UrAi by URAI Labs LLC.',
    siteName: 'UrAi',
  },
}

export default function BusinessPage() {
  return (
    <PublicAuthorityShell
      eyebrow="Business information"
      title="UrAi by URAI Labs LLC"
      intro="UrAi is web-delivered personal intelligence software that helps people explore memories, relationships, places, reflection, and personal direction through an interactive spatial experience."
    >
      <h2>What we provide</h2>
      <p>UrAi is a digital software product. The public website currently provides a preview experience using sample, fallback, or disclosed content. We do not sell physical goods, financial products, medical care, or emergency services.</p>

      <h2>Current sales status</h2>
      <p>Paid subscriptions and checkout are not currently active on this public website. Visitors cannot presently purchase a subscription or incur a charge through urai.app.</p>
      <p>Before any paid offering is activated, the purchase screen will identify the exact product access, price and currency, billing interval, taxes where applicable, any trial, renewal behavior, cancellation method, refund terms, and the way customers receive receipts and review account history.</p>

      <h2>Billing, cancellation, and refunds</h2>
      <p>Because paid checkout is not active, there is currently no UrAi website purchase to cancel or refund. If paid access is introduced, its cancellation and refund terms will be published and presented before payment. UrAi will not rely on this preview page as authorization for a charge.</p>

      <h2>Privacy and product boundaries</h2>
      <p>UrAi is designed around explicit consent and privacy controls. The public experience is not a medical, diagnostic, therapy, crisis-response, or emergency service. Review the <a href="/privacy-controls/">Privacy controls</a>, <a href="/terms/">Terms</a>, and <a href="/status/">Status</a> pages for current boundaries.</p>

      <h2>Support</h2>
      <p>Public mailbox routing is not represented as operational until provider ownership and delivery are verified. For public technical or website corrections, use the <a href="https://github.com/LifeLoggerAI/urai-spatial">canonical public repository</a> and do not include private, payment, account, or security-sensitive information. See <a href="/contact/">Contact</a> for the current support-channel status.</p>

      <h2>Business identity</h2>
      <p>Product: UrAi<br />Operator: URAI Labs LLC<br />Website: <a href="https://urai.app/">https://urai.app/</a></p>
    </PublicAuthorityShell>
  )
}
