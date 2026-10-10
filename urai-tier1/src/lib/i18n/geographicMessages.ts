import type { UraiLaunchLocale, UraiMessageDefinition } from './locales'
import geographic_0 from './geographic-en.prepared.json'
import geographic_1 from './geographic-zh-Hans.prepared.json'
import geographic_2 from './geographic-hi.prepared.json'
import geographic_3 from './geographic-es.prepared.json'
import geographic_4 from './geographic-fr.prepared.json'
import geographic_5 from './geographic-ar.prepared.json'
import geographic_6 from './geographic-bn.prepared.json'
import geographic_7 from './geographic-pt-BR.prepared.json'
import geographic_8 from './geographic-ru.prepared.json'
import geographic_9 from './geographic-ur.prepared.json'
import geographic_10 from './geographic-id.prepared.json'
import geographic_11 from './geographic-de.prepared.json'
import geographic_12 from './geographic-ja.prepared.json'
import geographic_13 from './geographic-sw.prepared.json'
import geographic_14 from './geographic-tr.prepared.json'
import geographic_15 from './geographic-vi.prepared.json'
import geographic_16 from './geographic-fil.prepared.json'
import geographic_17 from './geographic-ko.prepared.json'
import geographic_18 from './geographic-it.prepared.json'
import geographic_19 from './geographic-fa.prepared.json'

// Existing English source copy moved into governed IDs. Prepared catalogs do not
// grant runtime eligibility, native review, device or linguistic acceptance.
export const URAI_GEOGRAPHIC_MESSAGES = {
  "geographic.status.off": {
    "id": "geographic.status.off",
    "source": "Location is off. UrAi will not request or store coordinates until you explicitly opt in.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.off"
  },
  "geographic.status.waiting": {
    "id": "geographic.status.waiting",
    "source": "Waiting for your browser permission. Nothing is stored by requesting access.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.waiting"
  },
  "geographic.status.receivedPrecise": {
    "id": "geographic.status.receivedPrecise",
    "source": "Location received under the current precise-location grant. Choose the stored precision and label before saving.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.receivedPrecise"
  },
  "geographic.status.receivedApproximate": {
    "id": "geographic.status.receivedApproximate",
    "source": "Location received and immediately reduced to approximate precision under the current privacy authority.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.receivedApproximate"
  },
  "geographic.status.invalidCoordinate": {
    "id": "geographic.status.invalidCoordinate",
    "source": "The browser returned an invalid coordinate. Nothing was stored.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.invalidCoordinate"
  },
  "geographic.status.storageFailed": {
    "id": "geographic.status.storageFailed",
    "source": "Consent could not be retained privately, so UrAi discarded the coordinate and kept location off.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.storageFailed"
  },
  "geographic.status.permissionDenied": {
    "id": "geographic.status.permissionDenied",
    "source": "Location permission was denied or dismissed. No coordinates were stored.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.permissionDenied"
  },
  "geographic.status.deviceUnavailable": {
    "id": "geographic.status.deviceUnavailable",
    "source": "Location is unavailable right now. No coordinates were stored.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.deviceUnavailable"
  },
  "geographic.status.timeout": {
    "id": "geographic.status.timeout",
    "source": "The location request timed out. No coordinates were stored.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.timeout"
  },
  "geographic.status.failed": {
    "id": "geographic.status.failed",
    "source": "The location request failed. No coordinates were stored.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.failed"
  },
  "geographic.status.corruptRecordRemoved": {
    "id": "geographic.status.corruptRecordRemoved",
    "source": "An unreadable local location record was removed so hidden coordinates cannot survive without a working delete control.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.corruptRecordRemoved"
  },
  "geographic.status.pinsDeletedOtherTab": {
    "id": "geographic.status.pinsDeletedOtherTab",
    "source": "Location pins were deleted in another tab. This tab cleared its in-memory copy.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.pinsDeletedOtherTab"
  },
  "geographic.status.storageUnavailable": {
    "id": "geographic.status.storageUnavailable",
    "source": "Private browser storage is unavailable. No location data can be retained on this device.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.storageUnavailable"
  },
  "geographic.status.allClearedOtherTab": {
    "id": "geographic.status.allClearedOtherTab",
    "source": "Local location data was cleared in another tab. This tab retained no coordinate or pin in memory.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.allClearedOtherTab"
  },
  "geographic.status.consentRevokedOtherTab": {
    "id": "geographic.status.consentRevokedOtherTab",
    "source": "UrAi location consent was revoked in another tab. No coordinate remains in memory here.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.consentRevokedOtherTab"
  },
  "geographic.status.awaitingPolicy": {
    "id": "geographic.status.awaitingPolicy",
    "source": "The current location policy is awaiting server confirmation. No new coordinate can be requested or retained from cached or unconfirmed authority.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.awaitingPolicy"
  },
  "geographic.status.policyUnavailable": {
    "id": "geographic.status.policyUnavailable",
    "source": "The authoritative location policy could not be read. New geographic collection remains blocked rather than guessing permission.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.policyUnavailable"
  },
  "geographic.status.browserPermissionLost": {
    "id": "geographic.status.browserPermissionLost",
    "source": "Browser location permission is no longer granted. UrAi cleared its local consent flag and retained no coordinate in memory.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.browserPermissionLost"
  },
  "geographic.status.requestStorageUnavailable": {
    "id": "geographic.status.requestStorageUnavailable",
    "source": "Location remains off because private browser storage is unavailable. Nothing was requested or stored.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.requestStorageUnavailable"
  },
  "geographic.status.requestPolicyUnavailable": {
    "id": "geographic.status.requestPolicyUnavailable",
    "source": "The authoritative location policy is not available yet. Browser geolocation was not requested.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.requestPolicyUnavailable"
  },
  "geographic.status.unsupported": {
    "id": "geographic.status.unsupported",
    "source": "This browser does not provide geolocation. The symbolic Life Map remains available.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.unsupported"
  },
  "geographic.status.authorityChanged": {
    "id": "geographic.status.authorityChanged",
    "source": "Location authority changed before the request. Nothing was requested or stored; choose location again after the current policy is ready.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.authorityChanged"
  },
  "geographic.status.pinSaved": {
    "id": "geographic.status.pinSaved",
    "source": "Memory pin saved locally with the selected authorized precision.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.pinSaved"
  },
  "geographic.status.pinSaveFailed": {
    "id": "geographic.status.pinSaveFailed",
    "source": "The memory pin could not be saved. No existing location record changed.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.pinSaveFailed"
  },
  "geographic.status.revoked": {
    "id": "geographic.status.revoked",
    "source": "Location permission inside UrAi is revoked. Existing saved pins remain until you delete them.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.revoked"
  },
  "geographic.status.pinsDeleted": {
    "id": "geographic.status.pinsDeleted",
    "source": "All locally stored geographic memory pins were deleted.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.pinsDeleted"
  },
  "geographic.status.deletionUnverified": {
    "id": "geographic.status.deletionUnverified",
    "source": "Private browser storage is unavailable, so deletion could not be verified on this device.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.deletionUnverified"
  },
  "geographic.status.policyClosed": {
    "id": "geographic.status.policyClosed",
    "source": "Consent Sanctuary has {mode} location collection. New browser location requests are blocked and no coordinate remains in memory.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.policyClosed"
  },
  "geographic.status.policyBlocked": {
    "id": "geographic.status.policyBlocked",
    "source": "Consent Sanctuary has {mode} location collection. Browser geolocation was not requested.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer status.policyBlocked"
  },
  "geographic.precision.city": {
    "id": "geographic.precision.city",
    "source": "City-level",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer precision.city"
  },
  "geographic.precision.approximate": {
    "id": "geographic.precision.approximate",
    "source": "Approximate area",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer precision.approximate"
  },
  "geographic.precision.exact": {
    "id": "geographic.precision.exact",
    "source": "Exact and private",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer precision.exact"
  },
  "geographic.pin.currentPlace": {
    "id": "geographic.pin.currentPlace",
    "source": "Current place",
    "sensitivity": "general",
    "description": "Geographic supporting layer pin.currentPlace"
  },
  "geographic.pin.unnamed": {
    "id": "geographic.pin.unnamed",
    "source": "Unnamed private place",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer pin.unnamed"
  },
  "geographic.brand": {
    "id": "geographic.brand",
    "source": "UrAi · Geographic supporting layer",
    "sensitivity": "general",
    "description": "Geographic supporting layer brand"
  },
  "geographic.title": {
    "id": "geographic.title",
    "source": "Places, only when you choose.",
    "sensitivity": "general",
    "description": "Geographic supporting layer title"
  },
  "geographic.nav.symbolic": {
    "id": "geographic.nav.symbolic",
    "source": "Symbolic atlas",
    "sensitivity": "general",
    "description": "Geographic supporting layer nav.symbolic"
  },
  "geographic.nav.privacy": {
    "id": "geographic.nav.privacy",
    "source": "Privacy controls",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer nav.privacy"
  },
  "geographic.consent.explanation": {
    "id": "geographic.consent.explanation",
    "source": "This layer never starts background collection. Browser location is requested only after you press the button below and the current Consent Sanctuary policy permits collection.",
    "sensitivity": "consent",
    "description": "Geographic supporting layer consent.explanation"
  },
  "geographic.action.requesting": {
    "id": "geographic.action.requesting",
    "source": "Requesting…",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer action.requesting"
  },
  "geographic.action.useLocation": {
    "id": "geographic.action.useLocation",
    "source": "Use current location",
    "sensitivity": "consent",
    "description": "Geographic supporting layer action.useLocation"
  },
  "geographic.action.revoke": {
    "id": "geographic.action.revoke",
    "source": "Revoke UrAi location consent",
    "sensitivity": "consent",
    "description": "Geographic supporting layer action.revoke"
  },
  "geographic.policy.summary": {
    "id": "geographic.policy.summary",
    "source": "Consent Sanctuary: {mode}. Precise private storage: {precise}.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer policy.summary"
  },
  "geographic.policy.signedOut": {
    "id": "geographic.policy.signedOut",
    "source": "Signed-out local use is approximate-only; exact private location requires an authenticated Consent Sanctuary grant.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer policy.signedOut"
  },
  "geographic.policy.allowed": {
    "id": "geographic.policy.allowed",
    "source": "allowed",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer policy.allowed"
  },
  "geographic.policy.notAllowed": {
    "id": "geographic.policy.notAllowed",
    "source": "not allowed",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer policy.notAllowed"
  },
  "geographic.map.label": {
    "id": "geographic.map.label",
    "source": "Geographic map fallback",
    "sensitivity": "general",
    "description": "Geographic supporting layer map.label"
  },
  "geographic.coordinate.preview": {
    "id": "geographic.coordinate.preview",
    "source": "Private coordinate preview",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer coordinate.preview"
  },
  "geographic.coordinate.accuracy": {
    "id": "geographic.coordinate.accuracy",
    "source": "Accuracy reported by device: {meters} m",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer coordinate.accuracy"
  },
  "geographic.coordinate.empty": {
    "id": "geographic.coordinate.empty",
    "source": "No geographic location mounted.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer coordinate.empty"
  },
  "geographic.map.primary": {
    "id": "geographic.map.primary",
    "source": "The symbolic Life Map remains the primary experience.",
    "sensitivity": "general",
    "description": "Geographic supporting layer map.primary"
  },
  "geographic.map.fallback": {
    "id": "geographic.map.fallback",
    "source": "Interactive Google Maps will load only after restricted project keys are configured. This truthful fallback makes no external map request.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer map.fallback"
  },
  "geographic.pin.create": {
    "id": "geographic.pin.create",
    "source": "Create a memory pin",
    "sensitivity": "general",
    "description": "Geographic supporting layer pin.create"
  },
  "geographic.pin.label": {
    "id": "geographic.pin.label",
    "source": "Label",
    "sensitivity": "general",
    "description": "Geographic supporting layer pin.label"
  },
  "geographic.pin.readablePlace": {
    "id": "geographic.pin.readablePlace",
    "source": "Readable place",
    "sensitivity": "general",
    "description": "Geographic supporting layer pin.readablePlace"
  },
  "geographic.pin.placeholder": {
    "id": "geographic.pin.placeholder",
    "source": "Neighborhood, city, or private label",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer pin.placeholder"
  },
  "geographic.precision.legend": {
    "id": "geographic.precision.legend",
    "source": "Stored precision",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer precision.legend"
  },
  "geographic.precision.requiresConsent": {
    "id": "geographic.precision.requiresConsent",
    "source": " — requires precise-location consent",
    "sensitivity": "consent",
    "description": "Geographic supporting layer precision.requiresConsent"
  },
  "geographic.action.savePin": {
    "id": "geographic.action.savePin",
    "source": "Save memory pin",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer action.savePin"
  },
  "geographic.pins.title": {
    "id": "geographic.pins.title",
    "source": "Saved geographic memories",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer pins.title"
  },
  "geographic.pins.countOne": {
    "id": "geographic.pins.countOne",
    "source": "{count} local pin",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer pins.countOne"
  },
  "geographic.pins.countOther": {
    "id": "geographic.pins.countOther",
    "source": "{count} local pins",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer pins.countOther"
  },
  "geographic.pins.empty": {
    "id": "geographic.pins.empty",
    "source": "No geographic memory pins are stored.",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer pins.empty"
  },
  "geographic.action.export": {
    "id": "geographic.action.export",
    "source": "Export location data",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer action.export"
  },
  "geographic.action.delete": {
    "id": "geographic.action.delete",
    "source": "Delete all location pins",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer action.delete"
  },
  "geographic.authority.granted": {
    "id": "geographic.authority.granted",
    "source": "granted",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer authority.granted"
  },
  "geographic.authority.limited": {
    "id": "geographic.authority.limited",
    "source": "limited",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer authority.limited"
  },
  "geographic.authority.paused": {
    "id": "geographic.authority.paused",
    "source": "paused",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer authority.paused"
  },
  "geographic.authority.denied": {
    "id": "geographic.authority.denied",
    "source": "denied",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer authority.denied"
  },
  "geographic.authority.loading": {
    "id": "geographic.authority.loading",
    "source": "loading",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer authority.loading"
  },
  "geographic.authority.signed-out": {
    "id": "geographic.authority.signed-out",
    "source": "signed-out",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer authority.signed-out"
  },
  "geographic.authority.ready": {
    "id": "geographic.authority.ready",
    "source": "ready",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer authority.ready"
  },
  "geographic.authority.unavailable": {
    "id": "geographic.authority.unavailable",
    "source": "unavailable",
    "sensitivity": "privacy",
    "description": "Geographic supporting layer authority.unavailable"
  }
} as const satisfies Record<string, UraiMessageDefinition>

export type GeographicMessageId = keyof typeof URAI_GEOGRAPHIC_MESSAGES
export type GeographicStatusId = Extract<GeographicMessageId, `geographic.status.${string}`>
export type GeographicStatusMessage = {id: GeographicStatusId; mode?: 'granted' | 'limited' | 'paused' | 'denied'}
export const URAI_GEOGRAPHIC_CATALOGS = {
  "en": geographic_0,
  "zh-Hans": geographic_1,
  "hi": geographic_2,
  "es": geographic_3,
  "fr": geographic_4,
  "ar": geographic_5,
  "bn": geographic_6,
  "pt-BR": geographic_7,
  "ru": geographic_8,
  "ur": geographic_9,
  "id": geographic_10,
  "de": geographic_11,
  "ja": geographic_12,
  "sw": geographic_13,
  "tr": geographic_14,
  "vi": geographic_15,
  "fil": geographic_16,
  "ko": geographic_17,
  "it": geographic_18,
  "fa": geographic_19,
} as const satisfies Record<UraiLaunchLocale, Record<GeographicMessageId, string>>
