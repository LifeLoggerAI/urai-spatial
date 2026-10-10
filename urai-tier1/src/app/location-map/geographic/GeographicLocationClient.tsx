'use client'

import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { defaultConsentPolicy, isConsentPolicy, type ConsentDomainPolicy } from '@/app/privacy-controls/consentModel'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import {
  LOCATION_CONSENT_KEY,
  LOCATION_PINS_KEY,
  applyPrecision,
  createPin,
  exportPins,
  geolocationErrorState,
  parsePins,
  type GeographicCoordinate,
  type GeographicMemoryPin,
  type GeographicPermissionState,
  type GeographicPrecision,
} from '@/spatial/places/geographicLocationVault'
import './geographic-location.css'
import { useUraiLocale } from '@/lib/i18n/useUraiLocale'
import { localizedGeographicStatus } from '@/lib/i18n/geographicCopy'
import { URAI_GEOGRAPHIC_MESSAGES, type GeographicMessageId, type GeographicStatusMessage } from '@/lib/i18n/geographicMessages'
import { createGeographicLocationRequest, type GeographicRequestAuthority } from '@/spatial/places/geographicLocationRequest'

const precisionLabels: Record<GeographicPrecision, GeographicMessageId> = {
  city: 'geographic.precision.city',
  approximate: 'geographic.precision.approximate',
  'exact-private': 'geographic.precision.exact',
}

const authorityLabels = {
  granted: 'geographic.authority.granted', limited: 'geographic.authority.limited',
  paused: 'geographic.authority.paused', denied: 'geographic.authority.denied',
  loading: 'geographic.authority.loading', 'signed-out': 'geographic.authority.signed-out',
  ready: 'geographic.authority.ready', unavailable: 'geographic.authority.unavailable',
} as const satisfies Record<ConsentDomainPolicy['mode'] | LocationAuthorityState, GeographicMessageId>

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
  const locale = useUraiLocale()
  const [permission, setPermission] = useState<GeographicPermissionState>('idle')
  const [consented, setConsented] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [storedPinsPresent, setStoredPinsPresent] = useState(false)
  const [coordinate, setCoordinate] = useState<GeographicCoordinate | null>(null)
  const [precision, setPrecision] = useState<GeographicPrecision>('approximate')
  const [title, setTitle] = useState(URAI_GEOGRAPHIC_MESSAGES['geographic.pin.currentPlace'].source as string)
  const [readablePlace, setReadablePlace] = useState('')
  const [pins, setPins] = useState<GeographicMemoryPin[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [authorityState, setAuthorityState] = useState<LocationAuthorityState>(firebasePublicEnvReady ? 'loading' : 'signed-out')
  const [locationPolicy, setLocationPolicy] = useState<ConsentDomainPolicy>(() => defaultConsentPolicy('local-only').domains.location)
  const [policyRevision, setPolicyRevision] = useState(0)
  const [message, setMessage] = useState<GeographicStatusMessage>({id: 'geographic.status.off'})

  const statusCopy = localizedGeographicStatus(locale.preference, message)
  const locationClosed = authorityState === 'ready' && (locationPolicy.mode === 'denied' || locationPolicy.mode === 'paused')
  const exactPrivateAllowed = Boolean(user) && authorityState === 'ready' && !locationClosed && locationPolicy.precise
  const requestBlockedByAuthority = authorityState === 'loading' || authorityState === 'unavailable' || locationClosed
  const mounted = useRef(true)
  const requestAuthority = useRef<GeographicRequestAuthority>({ mounted: true, online: true, storageAvailable, ownerId: null, currentAuthOwnerId: null, state: authorityState, mode: locationPolicy.mode, revision: policyRevision, precise: exactPrivateAllowed })
  requestAuthority.current = { mounted: mounted.current, online: true, storageAvailable, ownerId: user?.uid ?? null, currentAuthOwnerId: null, state: authorityState, mode: locationPolicy.mode, revision: policyRevision, precise: exactPrivateAllowed }
  const locationRequest = useRef<ReturnType<typeof createGeographicLocationRequest> | null>(null)
  if (!locationRequest.current) locationRequest.current = createGeographicLocationRequest(() => ({
    ...requestAuthority.current,
    mounted: mounted.current,
    online: typeof navigator !== 'undefined' && navigator.onLine,
    currentAuthOwnerId: firebasePublicEnvReady ? getAuth(app).currentUser?.uid ?? null : null,
  }), {
    requested: () => { setPermission('requesting'); setMessage({id: 'geographic.status.waiting'}) },
    retainConsent: () => localStorage.setItem(LOCATION_CONSENT_KEY, 'granted'),
    accepted: (next, precise) => {
      setConsented(true); setCoordinate(next); setPermission('granted')
      setMessage(precise
        ? {id: 'geographic.status.receivedPrecise'}
        : {id: 'geographic.status.receivedApproximate'})
    },
    invalid: () => { setPermission('error'); setMessage({id: 'geographic.status.invalidCoordinate'}) },
    storageFailed: () => {
      setStorageAvailable(false); setConsented(false); setCoordinate(null); setPermission('error')
      setMessage({id: 'geographic.status.storageFailed'})
    },
    failed: code => {
      const state = geolocationErrorState(code)
      setPermission(state)
      setMessage(state === 'denied'
        ? {id: 'geographic.status.permissionDenied'}
        : state === 'unavailable'
          ? {id: 'geographic.status.deviceUnavailable'}
          : state === 'timeout'
            ? {id: 'geographic.status.timeout'}
            : {id: 'geographic.status.failed'})
    },
  })
  const invalidateLocationRequest = () => {
    if (locationRequest.current?.cancel()) setPermission('idle')
  }

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; locationRequest.current?.cancel() }
  }, [])

  const clearLocalConsent = (nextMessage?: GeographicStatusMessage) => {
    invalidateLocationRequest()
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
      setMessage({id: 'geographic.status.corruptRecordRemoved'})
      return
    }
    setPins(inspected.pins)
    setStoredPinsPresent(inspected.present)
    if (source === 'storage' && !inspected.present) setMessage({id: 'geographic.status.pinsDeletedOtherTab'})
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
      setMessage({id: 'geographic.status.storageUnavailable'})
    }
  }, [])

  useEffect(() => {
    const syncStorage = (event: StorageEvent) => {
      if (event.key === null) {
        invalidateLocationRequest(); setConsented(false); setCoordinate(null); setPins([]); setStoredPinsPresent(false); setPermission('revoked')
        setMessage({id: 'geographic.status.allClearedOtherTab'})
        return
      }
      if (event.key === LOCATION_PINS_KEY) {
        invalidateLocationRequest()
        if (event.newValue === null) setCoordinate(null)
        applyStoredPins(event.newValue, 'storage')
      }
      if (event.key === LOCATION_CONSENT_KEY) {
        invalidateLocationRequest()
        const granted = event.newValue === 'granted'
        setConsented(granted)
        if (!granted) {
          setCoordinate(null)
          setPermission('revoked')
          setMessage({id: 'geographic.status.consentRevokedOtherTab'})
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
      clearLocalConsent()
      setUser(nextUser)
      if (!nextUser) {
        setAuthorityState('signed-out')
        setLocationPolicy(defaultConsentPolicy('signed-out-local').domains.location)
        setPolicyRevision(0)
        return
      }
      setAuthorityState('loading')
    })
  }, [])

  useEffect(() => {
    if (!user) return
    let active = true
    const policyRef = doc(getFirebaseDb(), 'users', user.uid, 'privacyPolicy', 'current')
    const stop = onSnapshot(policyRef, { includeMetadataChanges: true }, (snapshot) => {
      if (!active || getAuth(app).currentUser?.uid !== user.uid) return
      invalidateLocationRequest()
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
        setAuthorityState('loading')
        clearLocalConsent({id: 'geographic.status.awaitingPolicy'})
        return
      }
      const raw = snapshot.data()
      const policy = snapshot.exists() && isConsentPolicy(raw, user.uid) ? raw : defaultConsentPolicy(user.uid)
      setLocationPolicy(policy.domains.location)
      setPolicyRevision(policy.revision)
      setAuthorityState('ready')
    }, () => {
      if (!active || getAuth(app).currentUser?.uid !== user.uid) return
      setAuthorityState('unavailable')
      clearLocalConsent({id: 'geographic.status.policyUnavailable'})
      setPermission('error')
    })
    return () => { active = false; invalidateLocationRequest(); stop() }
  }, [user])

  useEffect(() => {
    if (locationClosed) {
      clearLocalConsent({id: 'geographic.status.policyClosed', mode: locationPolicy.mode})
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
    const offline = () => { invalidateLocationRequest(); setPermission('offline') }
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
          invalidateLocationRequest()
          setPermission('revoked')
          setMessage({id: 'geographic.status.browserPermissionLost'})
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
      setMessage({id: 'geographic.status.requestStorageUnavailable'})
      return
    }
    if (requestBlockedByAuthority) {
      setPermission('error')
      setMessage(locationClosed
        ? {id: 'geographic.status.policyBlocked', mode: locationPolicy.mode}
        : {id: 'geographic.status.requestPolicyUnavailable'})
      return
    }
    if (!('geolocation' in navigator)) {
      setPermission('unsupported')
      setMessage({id: 'geographic.status.unsupported'})
      return
    }
    if (!locationRequest.current?.request(navigator.geolocation)) {
      setPermission('error')
      setMessage({id: 'geographic.status.authorityChanged'})
    }
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
        readablePlace: readablePlace || URAI_GEOGRAPHIC_MESSAGES['geographic.pin.unnamed'].source,
        precision: safePrecision,
      })
      const next = [pin, ...(current.invalid ? [] : current.pins)]
      localStorage.setItem(LOCATION_PINS_KEY, JSON.stringify(next))
      setPins(next)
      setStoredPinsPresent(true)
      setMessage({id: 'geographic.status.pinSaved'})
    } catch {
      setMessage({id: 'geographic.status.pinSaveFailed'})
    }
  }

  const revoke = () => {
    clearLocalConsent({id: 'geographic.status.revoked'})
    setPermission('revoked')
  }

  const deleteAll = () => {
    invalidateLocationRequest()
    setCoordinate(null)
    try {
      localStorage.removeItem(LOCATION_PINS_KEY)
      setPins([])
      setStoredPinsPresent(false)
      setMessage({id: 'geographic.status.pinsDeleted'})
    } catch {
      setStorageAvailable(false)
      setMessage({id: 'geographic.status.deletionUnverified'})
    }
  }

  return <main className="geoLayer" data-location-layer="geographic-support" data-permission-state={permission} data-location-authority={authorityState} data-location-policy-mode={locationPolicy.mode}>
    <header className="geoHeader">
      <div><span {...locale.props('geographic.brand')}>{locale.text('geographic.brand')}</span><h1 {...locale.props('geographic.title')}>{locale.text('geographic.title')}</h1></div>
      <nav><Link href="/location-map" {...locale.props('geographic.nav.symbolic')}>{locale.text('geographic.nav.symbolic')}</Link><Link href="/privacy-controls" {...locale.props('geographic.nav.privacy')}>{locale.text('geographic.nav.privacy')}</Link></nav>
    </header>

    <section className="geoConsent" aria-labelledby="geo-consent-title">
      <p id="geo-consent-title" {...locale.props('geographic.consent.explanation')}>{locale.text('geographic.consent.explanation')}</p>
      <div className="geoActions">
        <button type="button" {...locale.props('geographic.action.useLocation')} onClick={requestLocation} disabled={permission === 'requesting' || permission === 'offline' || !storageAvailable || requestBlockedByAuthority}>{locale.text(permission === 'requesting' ? 'geographic.action.requesting' : 'geographic.action.useLocation')}</button>
        <button type="button" {...locale.props('geographic.action.revoke')} onClick={revoke} disabled={!consented && permission !== 'requesting'}>{locale.text('geographic.action.revoke')}</button>
      </div>
      <p role="status" aria-live="polite" lang={statusCopy.locale} dir={statusCopy.direction} data-urai-translation-preview={String(statusCopy.preview)}>{statusCopy.text}</p>
      <small {...locale.props(user ? 'geographic.policy.summary' : 'geographic.policy.signedOut')}>{user ? locale.text('geographic.policy.summary', {mode: locale.text(authorityLabels[authorityState === 'ready' ? locationPolicy.mode : authorityState]), precise: locale.text(exactPrivateAllowed ? 'geographic.policy.allowed' : 'geographic.policy.notAllowed')}) : locale.text('geographic.policy.signedOut')}</small>
    </section>

    <section className="geoMap" aria-labelledby="geo-map-label">
      <span id="geo-map-label" {...locale.props('geographic.map.label')} style={{position:'absolute',width:1,height:1,overflow:'hidden',clipPath:'inset(50%)'}}>{locale.text('geographic.map.label')}</span>
      {displayCoordinate ? <div className="geoCoordinate"><span {...locale.props('geographic.coordinate.preview')}>{locale.text('geographic.coordinate.preview')}</span><strong dir="ltr">{displayCoordinate.latitude.toFixed(precision === 'city' ? 2 : precision === 'approximate' || !exactPrivateAllowed ? 3 : 5)}, {displayCoordinate.longitude.toFixed(precision === 'city' ? 2 : precision === 'approximate' || !exactPrivateAllowed ? 3 : 5)}</strong><small {...locale.props('geographic.coordinate.accuracy')}>{locale.text('geographic.coordinate.accuracy', {meters: String(Math.round(displayCoordinate.accuracyMeters ?? 0))})}</small></div> : <div className="geoEmpty"><strong {...locale.props('geographic.coordinate.empty')}>{locale.text('geographic.coordinate.empty')}</strong><span {...locale.props('geographic.map.primary')}>{locale.text('geographic.map.primary')}</span></div>}
      <div className="geoMapPlaceholder" aria-hidden="true"><i/><i/><i/><b/></div>
      <p className="geoMapTruth" {...locale.props('geographic.map.fallback')}>{locale.text('geographic.map.fallback')}</p>
    </section>

    <section className="geoEditor" aria-labelledby="geo-pin-title">
      <h2 id="geo-pin-title" {...locale.props('geographic.pin.create')}>{locale.text('geographic.pin.create')}</h2>
      <label><span {...locale.props('geographic.pin.label')}>{locale.text('geographic.pin.label')}</span><input dir="auto" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label><span {...locale.props('geographic.pin.readablePlace')}>{locale.text('geographic.pin.readablePlace')}</span><input dir="auto" value={readablePlace} onChange={(event) => setReadablePlace(event.target.value)} placeholder={locale.text('geographic.pin.placeholder')} /></label>
      <fieldset><legend {...locale.props('geographic.precision.legend')}>{locale.text('geographic.precision.legend')}</legend>{(Object.keys(precisionLabels) as GeographicPrecision[]).map((value) => <label key={value}><input type="radio" name="precision" checked={precision === value} disabled={value === 'exact-private' && !exactPrivateAllowed} onChange={() => setPrecision(value)} /><span {...locale.props(precisionLabels[value])}>{locale.text(precisionLabels[value])}</span>{value === 'exact-private' && !exactPrivateAllowed ? <span {...locale.props('geographic.precision.requiresConsent')}>{locale.text('geographic.precision.requiresConsent')}</span> : null}</label>)}</fieldset>
      <button type="button" {...locale.props('geographic.action.savePin')} onClick={savePin} disabled={!coordinate || !consented || !storageAvailable || requestBlockedByAuthority}>{locale.text('geographic.action.savePin')}</button>
    </section>

    <section className="geoPins" aria-labelledby="geo-pins-title">
      <div><h2 id="geo-pins-title" {...locale.props('geographic.pins.title')}>{locale.text('geographic.pins.title')}</h2><span {...locale.props(pins.length === 1 ? 'geographic.pins.countOne' : 'geographic.pins.countOther')}>{locale.text(pins.length === 1 ? 'geographic.pins.countOne' : 'geographic.pins.countOther', {count: String(pins.length)})}</span></div>
      {pins.length ? <ul>{pins.map((pin) => <li key={pin.id}><strong dir="auto">{pin.title}</strong><span dir="auto">{pin.readablePlace}</span><small><span {...locale.props(precisionLabels[pin.precision])}>{locale.text(precisionLabels[pin.precision])}</span> · {pin.coordinate.latitude}, {pin.coordinate.longitude}</small></li>)}</ul> : <p {...locale.props('geographic.pins.empty')}>{locale.text('geographic.pins.empty')}</p>}
      <div className="geoActions"><button type="button" {...locale.props('geographic.action.export')} onClick={() => downloadJson(exportPins(pins), 'urai-location-export.json')} disabled={!pins.length}>{locale.text('geographic.action.export')}</button><button type="button" {...locale.props('geographic.action.delete')} onClick={deleteAll} disabled={!storedPinsPresent && !pins.length}>{locale.text('geographic.action.delete')}</button></div>
    </section>
  </main>
}

