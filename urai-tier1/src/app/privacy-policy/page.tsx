import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'

export const metadata = {
  title: 'URAI Privacy Policy',
  description: 'URAI privacy policy candidate describing data use, controls, retention, sharing, security, and user rights.',
}

export default function PrivacyPolicyPage() {
  return (
    <main aria-labelledby="privacy-policy-heading" style={{ minHeight: '100dvh', padding: 'clamp(32px,7vw,80px) 20px', background: '#020713', color: '#f8fbff' }}>
      <article style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 24, lineHeight: 1.75 }}>
        <p style={{ margin: 0, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7defff' }}>URAI · Privacy policy candidate</p>
        <h1 id="privacy-policy-heading" style={{ margin: 0, fontSize: 'clamp(42px,8vw,72px)', lineHeight: .98 }}>Your life data stays governed by your choices.</h1>
        <p><strong>Pre-launch review status:</strong> this policy candidate is based on the current URAI privacy inventory and governance package and still requires qualified legal review before store submission or final public launch certification.</p>

        <section><h2>What URAI is</h2><p>URAI is a personal intelligence and memory system designed to help users understand memories, habits, context, and life patterns while preserving user control over sensitive processing.</p></section>

        <section><h2>Data we may process</h2><p>Depending on the features you enable, URAI may process account information, memories and transcripts you provide, uploaded media, location context, device or app interaction metadata, user-facing AI insights, optional voice or biometric-derived signals, Captured Reality assets, and records of consent, export, deletion, and privacy requests. Source code or a configured provider alone does not mean a data category is actively collected in a particular release.</p></section>

        <section><h2>Why we use data</h2><p>URAI uses data to provide the product experience, preserve and organize user memories, generate user-facing insights when enabled, operate privacy controls, improve reliability and safety, and personalize experiences according to the permissions you choose. URAI does not treat raw personal data as automatically available for unrelated purposes.</p></section>

        <section><h2>Your controls</h2><p>URAI is designed to provide consent controls, export, deletion, revocation, privacy history, and explanations for sensitive processing. Destructive requests are completed by trusted backend workflows; the interface must not claim data is deleted before those operations actually finish.</p><p><a href="/privacy-controls" style={{ color: 'inherit' }}>Open Privacy & Consent</a> · <a href="/account-deletion" style={{ color: 'inherit' }}>Account deletion guidance</a></p></section>

        <section><h2>Sensitive data and inferences</h2><p>Emotional, mental-health-adjacent, trauma, relationship, location, biometric-derived, voice, likeness, and other sensitive information requires explicit governance and should not be silently escalated into new purposes. Higher-sensitivity features require stronger consent and retention controls.</p></section>

        <section><h2>Sharing and external processors</h2><p>URAI may use infrastructure or AI/media providers only when the exact release enables them and the applicable consent and processing boundaries allow it. Provider configuration alone is not proof that user data is sent to that provider. URAI does not authorize sale of raw identity-bearing personal records through this policy.</p></section>

        <section><h2>Retention</h2><p>Retention depends on the data class and product purpose. User memories are intended to remain under user control until deleted or the account is closed, subject to documented technical or legal retention requirements. Short-lived sensitive processing data should use bounded retention where applicable.</p></section>

        <section><h2>Security and incidents</h2><p>URAI uses access controls, audit evidence, authenticated privacy workflows, environment separation, and incident-response procedures to protect data. Security and privacy controls are continuously verified against the exact release candidate rather than inferred from documentation alone.</p></section>

        <section><h2>Contact</h2><p>For privacy or legal questions during pre-launch review, contact <a href="mailto:legal@urailabs.com" style={{ color: 'inherit' }}>legal@urailabs.com</a>. For account-access or operational support, contact <a href="mailto:support@urailabs.com" style={{ color: 'inherit' }}>support@urailabs.com</a>. Do not send passwords, recovery codes, or other secrets by email.</p></section>

        <section><h2>Policy review boundary</h2><p>This page is an operational policy candidate derived from the current URAI privacy architecture. It must be reconciled with the exact signed release, enabled processors, retention behavior, user-rights workflows, and qualified legal review before it is treated as the final store-submission privacy policy.</p></section>

        <nav aria-label="Privacy policy related links" style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingBottom: 32 }}>
          <a href="/privacy-controls" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', color: 'inherit' }}>Privacy & Consent</a>
          <a href="/account-deletion" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', color: 'inherit' }}>Account deletion</a>
          <a href="/support" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', color: 'inherit' }}>Support</a>
          <AdamLauncherSlot name="privacy-policy" />
        </nav>
      </article>
    </main>
  )
}
