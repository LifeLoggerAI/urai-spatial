'use client'

import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { defaultConsentPolicy, isConsentPolicy, type ConsentDomainPolicy } from '@/app/privacy-controls/consentModel'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import {
  LOCATION_CONSENT_KEY,
  LOCATION_PINS_KEY,
  applyPrecision,
  createPin,
  exportPins,
  geolocationErrorState,
  isValidCoordinate,
  parsePins,
  type GeographicCoordinate,
  type GeographicMemoryPin,
  type GeographicPermissionState,
  type GeographicPrecision,
} from '@/spatial/places/geographicLocationVault'
import './geographic-location.css'

const precisionLabels: Record<GeographicPrecision, string> = {
  city: 'City-level',
  approximate: 'Approximate area',
  'exact-private': 'Exact and private',
}

type LocationAuthorityState = 'loading' | 'signed-out' | 'ready' | 'unavailable'
type StoredPinsState = { pins: GeographicMemoryPin[]; present: boolean; invalid: boolean }

function downloadJson(value: unknown, filename: string) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.hidden = true
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function inspectStoredPins(raw: string | null): StoredPinsState {
  if (raw === null) return { pins: [], present: false, invalid: false }
  try {
    const decoded: unknown = JSON.parse(raw)
    if (!Array.isArray(decoded)) return { pins: [], present: true, invalid: true }
    const pins = parsePins(raw)
    return { pins, present: true, invalid: pins.length !== decoded.length }
  } catch {
    return { pins: [], present: true, invalid: true }
  }
}

export default function GeographicLocationClient() {
  const [permission, setPermission] = useState<GeographicPermissionState>('idle')
  const [consented, setConsented] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [storedPinsPresent, setStoredPinsPresent] = useState(false)
  const [coordinate, setCoordinate] = useState<GeographicCoordinate | null>(null)
  const [precision, setPrecision] = useState<GeographicPrecision>('approximate')
  const [title, setTitle] = useState('Current place')
  const [readablePlace, setReadablePlace] = useState('')
  const [pins, setPins] = useState<GeographicMemoryPin[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [authorityState, setAuthorityState] = useState<LocationAuthorityState>(firebasePublicEnvReady ? 'loading' : 'signed-out')
  const [locationPolicy, setLocationPolicy] = useState<ConsentDomainPolicy>(() => defaultConsentPolicy('local-only').domains.location)
  const [message, setMessage] = useState('Location is off. UrAi will not request or store coordinates until you explicitly opt in.')

  const locationClosed = authorityState === 'ready' && (locationPolicy.mode === 'denied' || locationPolicy.mode === 'paused')
  const exactPrivateAllowed = Boolean(user) && authorityState === 'ready' && !locationClosed && locationPolicy.precise
  const requestBlockedByAuthority = authorityState === 'loading' || authorityState === 'unavailable' || locationClosed

  const clearLocalConsent = (nextMessage?: string) => {
    try { localStorage.removeItem(LOCATION_CONSENT_KEY) } catch { setStorageAvailable(false) }
    setConsented(false)
    setCoordinate(null)
    if (nextMessage) setMessage(nextMessage)
  }

  const applyStoredPins = (raw: string | null, source: 'hydrate' | 'storage') => {
    const inspected = inspectStoredPins(raw)
    if (inspected.invalid) {
      try { localStorage.removeItem(LOCATION_PINS_KEY) } catch { setStorageAvailable(false) }
      setPins([])
      setStoredPinsPresent(false)
      setMessage('An unreadable local location record was removed so hidden coordinates cannot survive without a working delete control.')
      return
    }
    setPins(inspected.pins)
    setStoredPinsPresent(inspected.present)
    if (source === 'storage' && !inspected.present) setMessage('Location pins were deleted in another tab. This tab cleared its in-memory copy.')
  }

  useEffect(() => {
    try {
      setConsented(localStorage.getItem(LOCATION_CONSENT_KEY) === 'granted')
      applyStoredPins(localStorage.getItem(LOCATION_PINS_KEY), 'hydrate')
    } catch {
      setStorageAvailable(false)
      setConsented(false)
      setPins([])
      setStoredPinsPresent(false)
      setMessage('Private browser storage is unavailable. No location data can be retained on this device.')
    }
  }, [])

  useEffect(() => {
    const syncStorage = (event: StorageEvent) => {
      if (event.key === LOCATION_PINS_KEY) applyStoredPins(event.newValue, 'storage')
      if (event.key === LOCATION_CONSENT_KEY) {
        const granted = event.newValue === 'granted'
        setConsented(granted)
        if (!granted) {
          setCoordinate(null)
          setPermission('revoked')
          setMessage('UrAi location consent was revoked in another tab. No coordinate remains in memory here.')
        }
      }
    }
    window.addEventListener('storage', syncStorage)
    return () => window.removeEventListener('storage', syncStorage)
  }, [])

  useEffect(() => {
    if (!firebasePublicEnvReady) {
      setAuthorityState('signed-out')
      setUser(null)
      return
    }
    const auth = getAuth(app)
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      if (!nextUser) {
        setAuthorityState('signed-out')
        setLocationPolicy(defaultConsentPolicy('signed-out-local').domains.location)
        return
      }
      setAuthorityState('loading')
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const policyRef = doc(getFirebaseDb(), 'users', user.uid, 'privacyPolicy', 'current')
    return onSnapshot(policyRef, (snapshot) => {
      const raw = snapshot.data()
      const policy = snapshot.exists() && isConsentPolicy(raw, user.uid) ? raw : defaultConsentPolicy(user.uid)
      setLocationPolicy(policy.domains.location)
      setAuthorityState('ready')
    }, () => {
      setAuthorityState('unavailable')
      clearLocalConsent('The authoritative location policy could not be read. New geographic collection remains blocked rather than guessing permission.')
      setPermission('error')
    })
  }, [user])

  useEffect(() => {
    if (locationClosed) {
      clearLocalConsent(`Consent Sanctuary has ${locationPolicy.mode} location collection. New browser location requests are blocked and no coordinate remains in memory.`)
      setPermission('revoked')
      return
    }
    if (!exactPrivateAllowed) {
      setPrecision((value) => value === 'exact-private' ? 'approximate' : value)
      setCoordinate((value) => value ? applyPrecision(value, 'approximate') : value)
    }
  }, [locationClosed, locationPolicy.mode, exactPrivateAllowed])

  useEffect(() => {
    if (!navigator.onLine) setPermission('offline')
    const online = () => setPermission((state) => state === 'offline' ? 'idle' : state)
    const offline = () => setPermission('offline')
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  useEffect(() => {
    if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') return
    let active = true
    let status: PermissionStatus | undefined
    const syncPermission = () => {
      if (!active || !status) return
      if (status.state === 'denied' || status.state === 'prompt') {
        let hadConsent = false
        try {
          hadConsent = localStorage.getItem(LOCATION_CONSENT_KEY) === 'granted'
          localStorage.removeItem(LOCATION_CONSENT_KEY)
        } catch { setStorageAvailable(false) }
        setConsented(false)
        setCoordinate(null)
        if (status.state === 'denied' || hadConsent) {
          setPermission('revoked')
          setMessage('Browser location permission is no longer granted. UrAi cleared its local consent flag and retained no coordinate in memory.')
        }
      }
    }
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (!active) return
      status = result
      syncPermission()
      status.addEventListener('change', syncPermission)
    }).catch(() => undefined)
    return () => {
      active = false
      status?.removeEventListener('change', syncPermission)
    }
  }, [])

  const displayCoordinate = useMemo(() => coordinate ? applyPrecision(coordinate, exactPrivateAllowed ? precision : precision === 'city' ? 'city' : 'approximate') : null, [coordinate, precision, exactPrivateAllowed])

  const requestLocation = () => {
    if (!storageAvailable) {
      setPermission('error')
      setMessage('Location remains off because private browser storage is unavailable. Nothing was requested or stored.')
      return
    }
    if (requestBlockedByAuthority) {
      setPermission('error')
      setMessage(locationClosed
        ? `Consent Sanctuary has ${locationPolicy.mode} location collection. Browser geolocation was not requested.`
        : 'The authoritative location policy is not available yet. Browser geolocation was not requested.')
      return
    }
    if (!('geolocation' in navigator)) {
      setPermission('unsupported')
      setMessage('This browser does not provide geolocation. The symbolic Life Map remains available.')
      return
    }
    setPermission('requesting')
    setMessage('Waiting for your browser permission. Nothing is stored by requesting access.')
    navigator.geolocation.getCurrentPosition((position) => {
      const received = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      }
      if (!isValidCoordinate(received)) {
        setPermission('error')
        setMessage('The browser returned an invalid coordinate. Nothing was stored.')
        return
      }
      const next = exactPrivateAllowed ? received : applyPrecision(received, 'approximate')
      try {
        localStorage.setItem(LOCATION_CONSENT_KEY, 'granted')
      } catch {
        setStorageAvailable(false)
        setConsented(false)
        setCoordinate(null)
        setPermission('error')
        setMessage('Consent could not be retained privately, so UrAi discarded the coordinate and kept location off.')
        return
      }
      setConsented(true)
      setCoordinate(next)
      setPermission('granted')
      setMessage(exactPrivateAllowed
        ? 'Location received under the current precise-location grant. Choose the stored precision and label before saving.'
        : 'Location received and immediately reduced to approximate precision under the current privacy authority.')
    }, (error) => {
      const state = geolocationErrorState(error.code)
      setPermission(state)
      setMessage(state === 'denied'
        ? 'Location permission was denied or dismissed. No coordinates were stored.'
        : state === 'unavailable'
          ? 'Location is unavailable right now. No coordinates were stored.'
          : state === 'timeout'
            ? 'The location request timed out. No coordinates were stored.'
            : 'The location request failed. No coordinates were stored.')
    }, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 })
  }

  const savePin = () => {
    if (!coordinate || !consented || !storageAvailable || requestBlockedByAuthority) return
    try {
      const safePrecision: GeographicPrecision = precision === 'exact-private' && !exactPrivateAllowed ? 'approximate' : precision
      const current = inspectStoredPins(localStorage.getItem(LOCATION_PINS_KEY))
      if (current.invalid) localStorage.removeItem(LOCATION_PINS_KEY)
      const pin = createPin({
        title,
        coordinate: exactPrivateAllowed ? coordinate : applyPrecision(coordinate, safePrecision === 'city' ? 'city' : 'approximate'),
        readablePlace: readablePlace || 'Unnamed private place',
        precision: safePrecision,
      })
      const next = [pin, ...(current.invalid ? [] : current.pins)]
      localStorage.setItem(LOCATION_PINS_KEY, JSON.stringify(next))
      setPins(next)
      setStoredPinsPresent(true)
      setMessage('Memory pin saved locally with the selected authorized precision.')
    } catch {
      setMessage('The memory pin could not be saved. No existing location record changed.')
    }
  }

  const revoke = () => {
    clearLocalConsent('Location permission inside UrAi is revoked. Existing saved pins remain until you delete them.')
    setPermission('revoked')
  }

  const deleteAll = () => {
    try {
      localStorage.removeItem(LOCATION_PINS_KEY)
      setPins([])
      setStoredPinsPresent(false)
      setMessage('All locally stored geographic memory pins were deleted.')
    } catch {
      setStorageAvailable(false)
      setMessage('Private browser storage is unavailable, so deletion could not be verified on this device.')
    }
  }

  return <main className="geoLayer" data-location-layer="geographic-support" data-permission-state={permission} data-location-authority={authorityState} data-location-policy-mode={locationPolicy.mode}>
    <header className="geoHeader">
      <div><span>UrAi · Geographic supporting layer</span><h1>Places, only when you choose.</h1></div>
      <nav><Link href="/location-map">Symbolic atlas</Link><Link href="/privacy-controls">Privacy controls</Link></nav>
    </header>

    <section className="geoConsent" aria-labelledby="geo-consent-title">
      <p id="geo-consent-title">This layer never starts background collection. Browser location is requested only after you press the button below and the current Consent Sanctuary policy permits collection.</p>
      <div className="geoActions">
        <button type="button" onClick={requestLocation} disabled={permission === 'requesting' || permission === 'offline' || !storageAvailable || requestBlockedByAuthority}>{permission === 'requesting' ? 'Requesting…' : 'Use current location'}</button>
        <button type="button" onClick={revoke} disabled={!consented}>Revoke UrAi location consent</button>
      </div>
      <p role="status" aria-live="polite">{message}</p>
      <small>{user ? `Consent Sanctuary: ${authorityState === 'ready' ? locationPolicy.mode : authorityState}. Precise private storage: ${exactPrivateAllowed ? 'allowed' : 'not allowed'}.` : 'Signed-out local use is approximate-only; exact private location requires an authenticated Consent Sanctuary grant.'}</small>
    </section>

    <section className="geoMap" aria-label="Geographic map fallback">
      {displayCoordinate ? <div className="geoCoordinate"><span>Private coordinate preview</span><strong>{displayCoordinate.latitude.toFixed(precision === 'city' ? 2 : precision === 'approximate' || !exactPrivateAllowed ? 3 : 5)}, {displayCoordinate.longitude.toFixed(precision === 'city' ? 2 : precision === 'approximate' || !exactPrivateAllowed ? 3 : 5)}</strong><small>Accuracy reported by device: {Math.round(displayCoordinate.accuracyMeters ?? 0)} m</small></div> : <div className="geoEmpty"><strong>No geographic location mounted.</strong><span>The symbolic Life Map remains the primary experience.</span></div>}
      <div className="geoMapPlaceholder" aria-hidden="true"><i/><i/><i/><b/></div>
      <p className="geoMapTruth">Interactive Google Maps will load only after restricted project keys are configured. This truthful fallback makes no external map request.</p>
    </section>

    <section className="geoEditor" aria-labelledby="geo-pin-title">
      <h2 id="geo-pin-title">Create a memory pin</h2>
      <label>Label<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Readable place<input value={readablePlace} onChange={(event) => setReadablePlace(event.target.value)} placeholder="Neighborhood, city, or private label" /></label>
      <fieldset><legend>Stored precision</legend>{(Object.keys(precisionLabels) as GeographicPrecision[]).map((value) => <label key={value}><input type="radio" name="precision" checked={precision === value} disabled={value === 'exact-private' && !exactPrivateAllowed} onChange={() => setPrecision(value)} />{precisionLabels[value]}{value === 'exact-private' && !exactPrivateAllowed ? ' — requires precise-location consent' : ''}</label>)}</fieldset>
      <button type="button" onClick={savePin} disabled={!coordinate || !consented || !storageAvailable || requestBlockedByAuthority}>Save memory pin</button>
    </section>

    <section className="geoPins" aria-labelledby="geo-pins-title">
      <div><h2 id="geo-pins-title">Saved geographic memories</h2><span>{pins.length} local pin{pins.length === 1 ? '' : 's'}</span></div>
      {pins.length ? <ul>{pins.map((pin) => <li key={pin.id}><strong>{pin.title}</strong><span>{pin.readablePlace}</span><small>{precisionLabels[pin.precision]} · {pin.coordinate.latitude}, {pin.coordinate.longitude}</small></li>)}</ul> : <p>No geographic memory pins are stored.</p>}
      <div className="geoActions"><button type="button" onClick={() => downloadJson(exportPins(pins), 'urai-location-export.json')} disabled={!pins.length}>Export location data</button><button type="button" onClick={deleteAll} disabled={!storedPinsPresent && !pins.length}>Delete all location pins</button></div>
    </section>
  </main>
}
