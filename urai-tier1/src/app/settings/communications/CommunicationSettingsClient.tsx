'use client'

import Link from 'next/link'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'

const CONSENT_VERSION = 'twilio-a2p-2026-10-04'
const DISCLOSURE = 'I agree to receive SMS messages from UrAi, including account notifications, service updates, user-requested reminders, and customer-care messages. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to use UrAi.'

type SavedSmsPreference = {
  phoneE164?: string
  consented?: boolean
  consentedAt?: string | null
  withdrawnAt?: string | null
  consentVersion?: string
}

function validE164(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value)
}

export default function CommunicationSettingsClient() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebasePublicEnvReady)
  const [phone, setPhone] = useState('')
  const [affirmed, setAffirmed] = useState(false)
  const [saved, setSaved] = useState<SavedSmsPreference | null>(null)
  const [busy, setBusy] = useState(false)
  const preferenceReadEpochRef = useRef(0)
  const [message, setMessage] = useState(
    firebasePublicEnvReady ? 'Checking your communication preference…' : 'Account communication settings are unavailable until the account service is configured.',
  )

  useEffect(() => {
    if (!firebasePublicEnvReady) {
      setLoading(false)
      return
    }
    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      const readEpoch = ++preferenceReadEpochRef.current
      setUser(nextUser)
      setSaved(null)
      setPhone('')
      setBusy(false)
      setAffirmed(false)
      if (!nextUser) {
        setSaved(null)
        setPhone('')
        setLoading(false)
        setMessage('Sign in to manage your optional SMS preference.')
        return
      }
      setLoading(true)
      const userRef = doc(getFirebaseDb(), 'users', nextUser.uid)
      void getDoc(userRef)
        .then((snapshot) => {
          if (preferenceReadEpochRef.current !== readEpoch) return
          const data = snapshot.data() as { messagingPreferences?: { sms?: SavedSmsPreference } } | undefined
          const sms = data?.messagingPreferences?.sms ?? null
          setSaved(sms)
          setPhone(typeof sms?.phoneE164 === 'string' ? sms.phoneE164 : '')
          setMessage(sms?.consented === true
            ? 'SMS messaging is enabled for this account. You can withdraw consent at any time.'
            : 'SMS messaging is off. Enabling it is optional.')
        })
        .catch(() => {
          if (preferenceReadEpochRef.current !== readEpoch) return
          setSaved(null)
          setMessage('UrAi could not read your SMS preference. No consent has been assumed.')
        })
        .finally(() => {
          if (preferenceReadEpochRef.current === readEpoch) setLoading(false)
        })
    })
    return () => {
      ++preferenceReadEpochRef.current
      unsubscribe()
    }
  }, [])

  async function enableSms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || loading || busy || getAuth(app).currentUser?.uid !== user.uid) return
    const normalized = phone.trim()
    if (!validE164(normalized)) {
      setMessage('Enter the mobile number in international E.164 format, for example +19035551234.')
      return
    }
    if (!affirmed) {
      setMessage('SMS remains off until you actively select the SMS consent checkbox.')
      return
    }

    const writeEpoch = preferenceReadEpochRef.current
    setBusy(true)
    const now = new Date().toISOString()
    const next: SavedSmsPreference = {
      phoneE164: normalized,
      consented: true,
      consentedAt: now,
      withdrawnAt: null,
      consentVersion: CONSENT_VERSION,
    }
    try {
      await setDoc(doc(getFirebaseDb(), 'users', user.uid), {
        messagingPreferences: { sms: next },
      }, { merge: true })
      if (preferenceReadEpochRef.current !== writeEpoch) return
      setSaved(next)
      setAffirmed(false)
      setMessage('SMS messaging enabled. UrAi recorded your explicit consent. Reply STOP to an UrAi text or use Disable SMS here to opt out.')
    } catch {
      if (preferenceReadEpochRef.current !== writeEpoch) return
      setMessage('UrAi could not save the SMS preference. SMS has not been represented as enabled.')
    } finally {
      if (preferenceReadEpochRef.current === writeEpoch) setBusy(false)
    }
  }

  async function disableSms() {
    if (!user || loading || busy || saved?.consented !== true || getAuth(app).currentUser?.uid !== user.uid) return
    const writeEpoch = preferenceReadEpochRef.current
    setBusy(true)
    const now = new Date().toISOString()
    const next: SavedSmsPreference = {
      ...saved,
      consented: false,
      withdrawnAt: now,
      consentVersion: CONSENT_VERSION,
    }
    try {
      await setDoc(doc(getFirebaseDb(), 'users', user.uid), {
        messagingPreferences: { sms: next },
      }, { merge: true })
      if (preferenceReadEpochRef.current !== writeEpoch) return
      setSaved(next)
      setAffirmed(false)
      setMessage('SMS messaging disabled. This account preference no longer authorizes new UrAi SMS sends.')
    } catch {
      if (preferenceReadEpochRef.current !== writeEpoch) return
      setMessage('UrAi could not confirm the change. The previous saved preference remains authoritative.')
    } finally {
      if (preferenceReadEpochRef.current === writeEpoch) setBusy(false)
    }
  }

  const enabled = saved?.consented === true

  return (
    <main data-route-owner="communication-settings" style={{ minHeight: '100dvh', background: 'linear-gradient(180deg,#071326,#020713)', color: '#f8fbff', padding: 'clamp(28px,6vw,72px) 20px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 22 }}>
        <nav aria-label="Communication settings navigation" style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <Link href="/settings" style={{ color: '#b9f4ff', minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>← Settings</Link>
          <Link href="/privacy/" style={{ color: '#b9f4ff', minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>Privacy Policy</Link>
          <Link href="/terms/" style={{ color: '#b9f4ff', minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>Terms &amp; Conditions</Link>
        </nav>

        <header>
          <p style={{ letterSpacing: '.18em', textTransform: 'uppercase', color: '#7defff', fontSize: 12 }}>UrAi · Communications</p>
          <h1 style={{ fontSize: 'clamp(42px,8vw,72px)', lineHeight: 1, margin: '10px 0' }}>SMS preferences</h1>
          <p style={{ maxWidth: 700, fontSize: 18, lineHeight: 1.65, color: '#c7d6df' }}>SMS is optional. You can use UrAi without enabling text messages, and you can withdraw SMS consent at any time.</p>
        </header>

        <section aria-labelledby="sms-consent-heading" style={{ border: '1px solid rgba(186,230,253,.16)', borderRadius: 26, padding: 'clamp(22px,4vw,34px)', background: 'rgba(3,8,20,.56)' }}>
          <h2 id="sms-consent-heading" style={{ marginTop: 0 }}>Text message consent</h2>
          <p role="status" aria-live="polite" style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(125,239,255,.07)' }}>{loading ? 'Checking your communication preference…' : message}</p>

          {!user && !loading ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <p>Sign in before adding a phone number or changing private communication preferences.</p>
              <Link href="/login" style={{ display: 'inline-flex', minHeight: 48, width: 'fit-content', alignItems: 'center', padding: '0 18px', borderRadius: 999, background: '#e9fbfd', color: '#071116', fontWeight: 800, textDecoration: 'none' }}>Sign in</Link>
            </div>
          ) : enabled ? (
            <div style={{ display: 'grid', gap: 16 }}>
              <p><strong>SMS is enabled.</strong> Your saved mobile number is used only within the applicable UrAi messaging and privacy boundaries.</p>
              <p>Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help.</p>
              <button type="button" onClick={() => void disableSms()} disabled={loading || busy} style={{ minHeight: 48, width: 'fit-content', padding: '0 18px', borderRadius: 999, border: '1px solid rgba(255,255,255,.24)', background: 'transparent', color: 'inherit', fontWeight: 800 }}>
                {busy ? 'Saving…' : 'Disable SMS'}
              </button>
            </div>
          ) : (
            <form onSubmit={(event) => void enableSms(event)} style={{ display: 'grid', gap: 18 }}>
              <label style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
                <span>Mobile phone number</span>
                <input
                  type="tel"
                  name="mobilePhone"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+19035551234"
                  value={phone}
                  onChange={(event) => setPhone(event.currentTarget.value)}
                  disabled={!user || loading || busy}
                  required
                  aria-describedby="sms-phone-help"
                  style={{ minHeight: 48, borderRadius: 12, border: '1px solid rgba(255,255,255,.24)', padding: '0 14px', background: '#07111e', color: '#f8fbff', fontSize: 16 }}
                />
              </label>
              <small id="sms-phone-help" style={{ color: '#b8c8ce' }}>Include the country code. Example: +19035551234.</small>

              <label style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 12, alignItems: 'start', lineHeight: 1.6 }}>
                <input
                  type="checkbox"
                  name="smsConsent"
                  checked={affirmed}
                  onChange={(event) => setAffirmed(event.currentTarget.checked)}
                  disabled={!user || loading || busy}
                  required
                  style={{ width: 24, height: 24, marginTop: 3 }}
                />
                <span>
                  {DISCLOSURE}{' '}
                  See our <Link href="/privacy/" style={{ color: '#b9f4ff' }}>Privacy Policy</Link> and{' '}
                  <Link href="/terms/" style={{ color: '#b9f4ff' }}>Terms &amp; Conditions</Link>.
                </span>
              </label>

              <button type="submit" disabled={!user || loading || busy} style={{ minHeight: 48, width: 'fit-content', padding: '0 18px', borderRadius: 999, border: 0, background: '#e9fbfd', color: '#071116', fontWeight: 800 }}>
                {busy ? 'Saving…' : 'Enable SMS'}
              </button>
            </form>
          )}
        </section>

        <aside style={{ border: '1px solid rgba(186,230,253,.12)', borderRadius: 20, padding: 20, color: '#c7d6df' }}>
          <strong>What SMS may contain</strong>
          <p>Account notifications, service updates, user-requested reminders, and customer-care messages. This setting does not authorize purchased-list marketing or SMS authentication codes.</p>
        </aside>
      </div>
    </main>
  )
}
