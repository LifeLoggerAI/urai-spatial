'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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

export default function GeographicLocationClient() {
  const [permission, setPermission] = useState<GeographicPermissionState>('idle')
  const [consented, setConsented] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [coordinate, setCoordinate] = useState<GeographicCoordinate | null>(null)
  const [precision, setPrecision] = useState<GeographicPrecision>('approximate')
  const [title, setTitle] = useState('Current place')
  const [readablePlace, setReadablePlace] = useState('')
  const [pins, setPins] = useState<GeographicMemoryPin[]>([])
  const [message, setMessage] = useState('Location is off. UrAi will not request or store coordinates until you explicitly opt in.')

  useEffect(() => {
    try {
      setConsented(localStorage.getItem(LOCATION_CONSENT_KEY) === 'granted')
      setPins(parsePins(localStorage.getItem(LOCATION_PINS_KEY)))
    } catch {
      setStorageAvailable(false)
      setConsented(false)
      setMessage('Private browser storage is unavailable. No location data can be retained on this device.')
    }
  }, [])

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
      if (status.state === 'denied') {
        setConsented(false)
        setCoordinate(null)
        setPermission('revoked')
        setMessage('Browser location permission is denied or revoked. No coordinate is retained in memory.')
      } else if (status.state === 'prompt') {
        setPermission((state) => state === 'granted' ? 'dismissed' : state)
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

  const displayCoordinate = useMemo(() => coordinate ? applyPrecision(coordinate, precision) : null, [coordinate, precision])

  const requestLocation = () => {
    if (!storageAvailable) {
      setPermission('error')
      setMessage('Location remains off because private browser storage is unavailable. Nothing was requested or stored.')
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
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      }
      if (!isValidCoordinate(next)) {
        setPermission('error')
        setMessage('The browser returned an invalid coordinate. Nothing was stored.')
        return
      }
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
      setMessage('Location received. Choose the precision and label before saving a memory pin.')
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
    if (!coordinate || !consented || !storageAvailable) return
    try {
      const pin = createPin({ title, coordinate, readablePlace: readablePlace || 'Unnamed private place', precision })
      const next = [pin, ...pins]
      localStorage.setItem(LOCATION_PINS_KEY, JSON.stringify(next))
      setPins(next)
      setMessage('Memory pin saved locally with the selected precision.')
    } catch {
      setMessage('The memory pin could not be saved. No existing location record changed.')
    }
  }

  const revoke = () => {
    try { localStorage.removeItem(LOCATION_CONSENT_KEY) } catch { setStorageAvailable(false) }
    setConsented(false)
    setCoordinate(null)
    setPermission('revoked')
    setMessage('Location permission inside UrAi is revoked. Existing saved pins remain until you delete them.')
  }

  const deleteAll = () => {
    try {
      localStorage.removeItem(LOCATION_PINS_KEY)
      setPins([])
      setMessage('All locally stored geographic memory pins were deleted.')
    } catch {
      setStorageAvailable(false)
      setMessage('Private browser storage is unavailable, so deletion could not be verified on this device.')
    }
  }

  return <main className="geoLayer" data-location-layer="geographic-support" data-permission-state={permission}>
    <header className="geoHeader">
      <div><span>UrAi · Geographic supporting layer</span><h1>Places, only when you choose.</h1></div>
      <nav><Link href="/location-map">Symbolic atlas</Link><Link href="/privacy-controls">Privacy controls</Link></nav>
    </header>

    <section className="geoConsent" aria-labelledby="geo-consent-title">
      <p id="geo-consent-title">This layer never starts background collection. Browser location is requested only after you press the button below.</p>
      <div className="geoActions">
        <button type="button" onClick={requestLocation} disabled={permission === 'requesting' || permission === 'offline' || !storageAvailable}>{permission === 'requesting' ? 'Requesting…' : 'Use current location'}</button>
        <button type="button" onClick={revoke} disabled={!consented}>Revoke UrAi location consent</button>
      </div>
      <p role="status" aria-live="polite">{message}</p>
    </section>

    <section className="geoMap" aria-label="Geographic map fallback">
      {displayCoordinate ? <div className="geoCoordinate"><span>Private coordinate preview</span><strong>{displayCoordinate.latitude.toFixed(precision === 'city' ? 2 : precision === 'approximate' ? 3 : 5)}, {displayCoordinate.longitude.toFixed(precision === 'city' ? 2 : precision === 'approximate' ? 3 : 5)}</strong><small>Accuracy reported by device: {Math.round(displayCoordinate.accuracyMeters ?? 0)} m</small></div> : <div className="geoEmpty"><strong>No geographic location mounted.</strong><span>The symbolic Life Map remains the primary experience.</span></div>}
      <div className="geoMapPlaceholder" aria-hidden="true"><i/><i/><i/><b/></div>
      <p className="geoMapTruth">Interactive Google Maps will load only after restricted project keys are configured. This truthful fallback makes no external map request.</p>
    </section>

    <section className="geoEditor" aria-labelledby="geo-pin-title">
      <h2 id="geo-pin-title">Create a memory pin</h2>
      <label>Label<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Readable place<input value={readablePlace} onChange={(event) => setReadablePlace(event.target.value)} placeholder="Neighborhood, city, or private label" /></label>
      <fieldset><legend>Stored precision</legend>{(Object.keys(precisionLabels) as GeographicPrecision[]).map((value) => <label key={value}><input type="radio" name="precision" checked={precision === value} onChange={() => setPrecision(value)} />{precisionLabels[value]}</label>)}</fieldset>
      <button type="button" onClick={savePin} disabled={!coordinate || !consented || !storageAvailable}>Save memory pin</button>
    </section>

    <section className="geoPins" aria-labelledby="geo-pins-title">
      <div><h2 id="geo-pins-title">Saved geographic memories</h2><span>{pins.length} local pin{pins.length === 1 ? '' : 's'}</span></div>
      {pins.length ? <ul>{pins.map((pin) => <li key={pin.id}><strong>{pin.title}</strong><span>{pin.readablePlace}</span><small>{precisionLabels[pin.precision]} · {pin.coordinate.latitude}, {pin.coordinate.longitude}</small></li>)}</ul> : <p>No geographic memory pins are stored.</p>}
      <div className="geoActions"><button type="button" onClick={() => downloadJson(exportPins(pins), 'urai-location-export.json')} disabled={!pins.length}>Export location data</button><button type="button" onClick={deleteAll} disabled={!pins.length}>Delete all location pins</button></div>
    </section>
  </main>
}
