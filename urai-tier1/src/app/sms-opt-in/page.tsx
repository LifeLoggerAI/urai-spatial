import Link from 'next/link'

export const metadata = {
  title: 'UrAi SMS Opt-In Proof',
  description: 'Public compliance proof showing the UrAi SMS web-form consent experience.',
}

const disclosure = 'I agree to receive SMS messages from UrAi, including account notifications, service updates, user-requested reminders, and customer-care messages. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to use UrAi.'

export default function SmsOptInProofPage() {
  return (
    <main data-route-owner="sms-opt-in-proof" style={{ minHeight: '100dvh', background: 'linear-gradient(180deg,#071326,#020713)', color: '#f8fbff', padding: 'clamp(28px,6vw,72px) 20px' }}>
      <article style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 22, lineHeight: 1.65 }}>
        <header>
          <p style={{ letterSpacing: '.18em', textTransform: 'uppercase', color: '#7defff', fontSize: 12 }}>UrAi · A2P compliance proof</p>
          <h1 style={{ fontSize: 'clamp(42px,8vw,72px)', lineHeight: 1, margin: '10px 0' }}>SMS web-form opt-in</h1>
          <p style={{ fontSize: 18, color: '#c7d6df' }}>This public page documents the consent experience used in UrAi account communication settings. It does not submit a phone number, create an account, or enroll anyone in SMS.</p>
        </header>

        <section aria-labelledby="proof-form-heading" style={{ border: '1px solid rgba(186,230,253,.16)', borderRadius: 26, padding: 'clamp(22px,4vw,34px)', background: 'rgba(3,8,20,.56)', display: 'grid', gap: 18 }}>
          <div>
            <p style={{ margin: 0, color: '#7defff', fontWeight: 700 }}>Before consent</p>
            <h2 id="proof-form-heading" style={{ margin: '6px 0' }}>Text message consent</h2>
          </div>

          <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
            <span>Mobile phone number</span>
            <input aria-describedby="proof-phone-help" type="tel" inputMode="tel" placeholder="+19035551234" readOnly value="" style={{ minHeight: 48, borderRadius: 12, border: '1px solid rgba(255,255,255,.24)', padding: '0 14px', background: '#07111e', color: '#f8fbff', fontSize: 16 }} />
          </label>
          <small id="proof-phone-help" style={{ color: '#b8c8ce' }}>In the authenticated UrAi setting, the user enters their own number with country code.</small>

          <label style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 12, alignItems: 'start' }}>
            <input aria-label="SMS consent checkbox shown unchecked by default" type="checkbox" readOnly checked={false} style={{ width: 24, height: 24, marginTop: 3 }} />
            <span>
              {disclosure}{' '}
              See our <Link href="/privacy/" style={{ color: '#b9f4ff' }}>Privacy Policy</Link> and{' '}
              <Link href="/terms/" style={{ color: '#b9f4ff' }}>Terms &amp; Conditions</Link>.
            </span>
          </label>

          <button type="button" disabled style={{ minHeight: 48, width: 'fit-content', padding: '0 18px', borderRadius: 999, border: 0, fontWeight: 800 }}>Enable SMS — documentation only</button>
        </section>

        <section aria-labelledby="proof-after-heading" style={{ border: '1px solid rgba(186,230,253,.16)', borderRadius: 26, padding: 'clamp(22px,4vw,34px)', background: 'rgba(3,8,20,.56)' }}>
          <p style={{ marginTop: 0, color: '#7defff', fontWeight: 700 }}>After the authenticated user submits the form</p>
          <h2 id="proof-after-heading">Confirmation shown to the user</h2>
          <div role="status" style={{ padding: 16, borderRadius: 14, background: 'rgba(125,239,255,.07)' }}>
            SMS messaging enabled. UrAi recorded your explicit consent. Reply STOP to an UrAi text or use Disable SMS in Communication settings to opt out.
          </div>
          <p>The authenticated settings screen then displays a <strong>Disable SMS</strong> control so consent can be withdrawn later.</p>
        </section>

        <section style={{ border: '1px solid rgba(186,230,253,.12)', borderRadius: 20, padding: 20 }}>
          <h2>Reviewer notes</h2>
          <ul>
            <li>The SMS consent control is separate from general Terms acceptance.</li>
            <li>The opt-in checkbox starts unchecked for a user who has not previously opted in.</li>
            <li>SMS consent is not required to create or use an UrAi account.</li>
            <li>The authenticated implementation is available at <Link href="/settings/communications" style={{ color: '#b9f4ff' }}>/settings/communications</Link>.</li>
          </ul>
        </section>
      </article>
    </main>
  )
}
