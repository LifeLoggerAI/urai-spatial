from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise AssertionError(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


client = Path('urai-tier1/src/app/location-map/geographic/GeographicLocationClient.tsx')
text = client.read_text()

text = replace_once(
    text,
    "  const requestBlockedByAuthority = authorityState === 'loading' || authorityState === 'unavailable' || locationClosed\n",
    "  const storageScope = authorityState === 'loading' ? null : user?.uid ?? 'signed-out'\n"
    "  const consentStorageKey = storageScope ? `${LOCATION_CONSENT_KEY}:${storageScope}` : null\n"
    "  const pinsStorageKey = storageScope ? `${LOCATION_PINS_KEY}:${storageScope}` : null\n"
    "  const requestBlockedByAuthority = authorityState === 'loading' || authorityState === 'unavailable' || locationClosed || !storageScope\n",
    'scoped storage declarations',
)

text = replace_once(
    text,
    "  const clearLocalConsent = (nextMessage?: string) => {\n"
    "    try { localStorage.removeItem(LOCATION_CONSENT_KEY) } catch { setStorageAvailable(false) }\n"
    "    setConsented(false)\n"
    "    setCoordinate(null)\n"
    "    if (nextMessage) setMessage(nextMessage)\n"
    "  }\n",
    "  const clearLocalConsent = (nextMessage?: string) => {\n"
    "    try { if (consentStorageKey) localStorage.removeItem(consentStorageKey) } catch { setStorageAvailable(false) }\n"
    "    setConsented(false)\n"
    "    setCoordinate(null)\n"
    "    if (nextMessage) setMessage(nextMessage)\n"
    "  }\n",
    'scoped consent clearing',
)

text = replace_once(
    text,
    "      try { localStorage.removeItem(LOCATION_PINS_KEY) } catch { setStorageAvailable(false) }",
    "      try { if (pinsStorageKey) localStorage.removeItem(pinsStorageKey) } catch { setStorageAvailable(false) }",
    'scoped corrupt-pin removal',
)

old_hydrate = '''  useEffect(() => {
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
'''
new_hydrate = '''  useEffect(() => {
    setConsented(false)
    setCoordinate(null)
    setPins([])
    setStoredPinsPresent(false)
    if (!consentStorageKey || !pinsStorageKey) return
    try {
      localStorage.removeItem(LOCATION_CONSENT_KEY)
      localStorage.removeItem(LOCATION_PINS_KEY)
      setConsented(localStorage.getItem(consentStorageKey) === 'granted')
      applyStoredPins(localStorage.getItem(pinsStorageKey), 'hydrate')
    } catch {
      setStorageAvailable(false)
      setMessage('Private browser storage is unavailable. No location data can be retained on this device.')
    }
  }, [consentStorageKey, pinsStorageKey])
'''
text = replace_once(text, old_hydrate, new_hydrate, 'owner-scope hydration')

old_storage = '''  useEffect(() => {
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
'''
new_storage = '''  useEffect(() => {
    if (!consentStorageKey || !pinsStorageKey) return
    const syncStorage = (event: StorageEvent) => {
      if (event.key === pinsStorageKey) applyStoredPins(event.newValue, 'storage')
      if (event.key === consentStorageKey) {
        const granted = event.newValue === 'granted'
        setConsented(granted)
        if (!granted) {
          setCoordinate(null)
          setPermission('revoked')
          setMessage('UrAi location consent was revoked in another tab for this account. No coordinate remains in memory here.')
        }
      }
    }
    window.addEventListener('storage', syncStorage)
    return () => window.removeEventListener('storage', syncStorage)
  }, [consentStorageKey, pinsStorageKey])
'''
text = replace_once(text, old_storage, new_storage, 'owner-scoped storage events')

text = replace_once(
    text,
    "          hadConsent = localStorage.getItem(LOCATION_CONSENT_KEY) === 'granted'\n"
    "          localStorage.removeItem(LOCATION_CONSENT_KEY)",
    "          hadConsent = consentStorageKey ? localStorage.getItem(consentStorageKey) === 'granted' : false\n"
    "          if (consentStorageKey) localStorage.removeItem(consentStorageKey)",
    'scoped permission revocation',
)
text = replace_once(text, "  }, [])\n\n  const displayCoordinate", "  }, [consentStorageKey])\n\n  const displayCoordinate", 'permission-effect dependency')

text = replace_once(
    text,
    "    if (!storageAvailable) {",
    "    if (!storageAvailable || !consentStorageKey || !pinsStorageKey) {",
    'request scoped-storage guard',
)
text = replace_once(
    text,
    "        localStorage.setItem(LOCATION_CONSENT_KEY, 'granted')",
    "        localStorage.setItem(consentStorageKey, 'granted')",
    'scoped consent write',
)

text = replace_once(
    text,
    "    if (!coordinate || !consented || !storageAvailable || requestBlockedByAuthority) return",
    "    if (!coordinate || !consented || !storageAvailable || !pinsStorageKey || requestBlockedByAuthority) return",
    'save scoped-storage guard',
)
text = replace_once(
    text,
    "      const current = inspectStoredPins(localStorage.getItem(LOCATION_PINS_KEY))",
    "      const current = inspectStoredPins(localStorage.getItem(pinsStorageKey))",
    'scoped pin read',
)
text = replace_once(
    text,
    "      if (current.invalid) localStorage.removeItem(LOCATION_PINS_KEY)",
    "      if (current.invalid) localStorage.removeItem(pinsStorageKey)",
    'scoped invalid-pin delete',
)
text = replace_once(
    text,
    "      localStorage.setItem(LOCATION_PINS_KEY, JSON.stringify(next))",
    "      localStorage.setItem(pinsStorageKey, JSON.stringify(next))",
    'scoped pin write',
)
text = replace_once(
    text,
    "      localStorage.removeItem(LOCATION_PINS_KEY)",
    "      if (!pinsStorageKey) throw new Error('No active location storage scope')\n      localStorage.removeItem(pinsStorageKey)",
    'scoped delete-all',
)

text = replace_once(
    text,
    "  return <main className=\"geoLayer\" data-location-layer=\"geographic-support\" data-permission-state={permission} data-location-authority={authorityState} data-location-policy-mode={locationPolicy.mode}>",
    "  return <main className=\"geoLayer\" data-location-layer=\"geographic-support\" data-permission-state={permission} data-location-authority={authorityState} data-location-policy-mode={locationPolicy.mode} data-location-storage-scope={storageScope ?? 'unresolved'}>",
    'storage-scope diagnostic',
)

client.write_text(text)

contract = Path('urai-tier1/tests/geographic-location-client-contract.test.mjs')
contract_text = contract.read_text()
if 'account-scoped local vaults isolate browser-profile users' in contract_text:
    raise AssertionError('account-scope contract already exists')
contract_text += '''

test('account-scoped local vaults isolate browser-profile users', () => {
  assert.match(source, /const storageScope = authorityState === 'loading' \? null : user\?\.uid \?\? 'signed-out'/)
  assert.match(source, /`\$\{LOCATION_CONSENT_KEY\}:\$\{storageScope\}`/)
  assert.match(source, /`\$\{LOCATION_PINS_KEY\}:\$\{storageScope\}`/)
  assert.match(source, /setCoordinate\(null\)\s*setPins\(\[\]\)/)
  assert.match(source, /event\.key === pinsStorageKey/)
  assert.match(source, /event\.key === consentStorageKey/)
  assert.match(source, /localStorage\.getItem\(pinsStorageKey\)/)
  assert.match(source, /localStorage\.setItem\(pinsStorageKey/)
  assert.match(source, /localStorage\.removeItem\(pinsStorageKey\)/)
  assert.match(source, /data-location-storage-scope=/)
})
'''
contract.write_text(contract_text)
