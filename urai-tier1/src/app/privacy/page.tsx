import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | UrAi',
  description: 'UrAi Privacy Policy, including account, consent, communications, SMS, retention, security, and user-control practices.',
}

const sectionStyle = {
  border: '1px solid rgba(186,230,253,.14)',
  borderRadius: 24,
  background: 'rgba(3,8,20,.5)',
  padding: 'clamp(20px,4vw,30px)',
} as const

const linkStyle = { color: '#b9f4ff', textUnderlineOffset: 4 } as const

export default function PrivacyPolicyPage() {
  return (
    <main aria-labelledby="privacy-policy-heading" style={{ minHeight: '100dvh', padding: 'clamp(32px,7vw,80px) 20px', background: 'linear-gradient(180deg,#071326,#020713)', color: '#f8fbff' }}>
      <article style={{ maxWidth: 920, margin: '0 auto', display: 'grid', gap: 20, lineHeight: 1.72 }}>
        <header style={{ display: 'grid', gap: 12, marginBottom: 8 }}>
          <p style={{ margin: 0, letterSpacing: '.18em', textTransform: 'uppercase', color: '#7defff', fontSize: 12 }}>UrAi · Legal</p>
          <h1 id="privacy-policy-heading" style={{ margin: 0, fontSize: 'clamp(42px,8vw,72px)', lineHeight: 1 }}>Privacy Policy</h1>
          <p style={{ margin: 0, color: '#bfd0db' }}>Last updated October 4, 2026</p>
          <p style={{ margin: 0, fontSize: 18 }}>This Privacy Policy explains how UrAi collects, uses, protects, and gives you control over information when you use UrAi products and services.</p>
        </header>

        <section style={sectionStyle}>
          <h2>Information UrAi may collect</h2>
          <p>Depending on the features you choose to use, UrAi may process account and contact information; memories, transcripts, notes, and media you provide; consent and privacy preferences; device and app interaction metadata; user-facing AI outputs; optional location, voice, likeness, or other sensitive context; Captured Reality assets; and records of export, deletion, support, and privacy requests.</p>
          <p>When you choose SMS functionality, UrAi may collect your mobile phone number, SMS consent choice, the time of that choice, and messaging delivery or opt-out status needed to provide and govern the requested messaging service.</p>
        </section>

        <section style={sectionStyle}>
          <h2>How UrAi uses information</h2>
          <p>UrAi uses information to provide requested product features, organize and present user-controlled memories and context, operate account and privacy controls, provide account and service notifications, deliver user-requested reminders, respond to customer-care requests, maintain security and reliability, and meet applicable legal or operational requirements.</p>
          <p>Optional sensitive processing is permission-bound. A configured provider or available feature does not by itself mean a data category is being collected or sent to that provider.</p>
        </section>

        <section style={sectionStyle}>
          <h2>SMS privacy</h2>
          <p><strong>We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.</strong></p>
          <p>Mobile phone numbers, SMS consent records, and messaging preferences are used to provide messaging that you requested, to honor opt-out choices, to support delivery and security, and to maintain necessary compliance records. Service providers may process limited messaging data only as needed to provide those requested services and subject to applicable safeguards.</p>
          <p>SMS consent is optional and is not required to create or use an UrAi account. You can reply STOP to an UrAi SMS to opt out or HELP for assistance, and you can change your SMS preference from your UrAi communication settings when that account feature is available to you.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Sharing and processors</h2>
          <p>UrAi may use infrastructure, communications, AI, media, security, or support providers only for authorized product purposes and within applicable consent and processing boundaries. UrAi does not authorize the sale of raw identity-bearing personal records under this policy.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Your controls</h2>
          <p>UrAi is designed to provide consent controls, revocation, export, deletion, privacy history, and explanations for sensitive processing where those features apply. A request is not represented as completed until the trusted system reports completion.</p>
          <p><Link href="/privacy-controls" style={linkStyle}>Open Privacy &amp; Consent</Link> · <Link href="/settings/communications" style={linkStyle}>Communication settings</Link> · <Link href="/account-deletion" style={linkStyle}>Account deletion guidance</Link></p>
        </section>

        <section style={sectionStyle}>
          <h2>Retention</h2>
          <p>Retention depends on the type of information and the purpose for which it is used. UrAi keeps information only for the period reasonably necessary to provide the requested service, meet documented security or legal requirements, or preserve user-directed records, subject to available deletion and retention controls.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Security</h2>
          <p>UrAi uses access controls, authenticated workflows, environment separation, audit evidence, and operational safeguards intended to protect personal information. No system can guarantee absolute security, and UrAi continues to review controls against the exact deployed release.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Contact</h2>
          <p>For privacy or legal questions, contact <a href="mailto:legal@urailabs.com" style={linkStyle}>legal@urailabs.com</a>. For product or account support, contact <a href="mailto:support@urailabs.com" style={linkStyle}>support@urailabs.com</a>. Do not send passwords, recovery codes, or other authentication secrets by email.</p>
        </section>

        <nav aria-label="Privacy policy related links" style={{ display: 'flex', flexWrap: 'wrap', gap: 18, padding: '12px 0 32px' }}>
          <Link href="/terms/" style={{ ...linkStyle, minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>Terms &amp; Conditions</Link>
          <Link href="/support" style={{ ...linkStyle, minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>Support</Link>
          <Link href="/home" style={{ ...linkStyle, minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>Return to UrAi</Link>
        </nav>
      </article>
    </main>
  )
}
