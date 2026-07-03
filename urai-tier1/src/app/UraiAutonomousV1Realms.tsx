"use client";

import {
  avatarAssets,
  locationMapAssets,
  mirrorAssets,
  passportAssets,
  privacyControlsAssets,
  statusAssets,
  uiAssets,
} from "@/spatial/assets/uraiAssets";
import "./urai-autonomous-v1-realms-final.css";

type RealmConfig = {
  key: "mirror" | "passport" | "privacy" | "location" | "status";
  className: string;
  label: string;
  title: string;
  description: string;
  desktop: string;
  mobile: string;
  accents: Array<{ src: string; alt: string }>;
  guide?: { src: string; alt: string };
  statement?: { title: string; detail: string };
  controls?: Array<{ href: string; label: string; primary?: boolean }>;
  signals: string[];
  previous: { href: string; label: string };
  next: { href: string; label: string };
};

const realms: Record<string, RealmConfig> = {
  mirror: {
    key: "mirror",
    className: "uraiAutoMirror",
    label: "REFLECTION REALM",
    title: "Mirror does not judge.",
    description: "Patterns become visible without turning your life into a score.",
    desktop: mirrorAssets.primary.src,
    mobile: mirrorAssets.mobile.src,
    accents: [
      { src: mirrorAssets.accents.pattern.src, alt: "Private pattern glyph" },
      { src: uiAssets.orbActive.src, alt: "Orb reflection companion" },
    ],
    guide: { src: avatarAssets.mirror.src, alt: "Mirror Guide private workforce presence" },
    statement: {
      title: "See the pattern. Keep your authority.",
      detail: "Mirror holds relationships between signals while uncertainty and consent remain visible.",
    },
    controls: [
      { href: "/focus?memoryId=quiet-reset", label: "Open Focus" },
      { href: "/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread", label: "Enter Replay", primary: true },
    ],
    signals: ["Body rhythm", "Relationship weather", "Becoming pattern"],
    previous: { href: "/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread", label: "Replay" },
    next: { href: "/passport", label: "Open Passport" },
  },
  passport: {
    key: "passport",
    className: "uraiAutoPassport",
    label: "OWNERSHIP VAULT",
    title: "Your life remains yours.",
    description: "Identity, consent, provenance, export, and deletion live inside one protected room.",
    desktop: passportAssets.primary.src,
    mobile: passportAssets.mobile.src,
    accents: [{ src: passportAssets.accents.ownershipSeal.src, alt: "Ownership and provenance seal" }],
    statement: {
      title: "Ownership key active",
      detail: "Identity and consent remain private until you make a deliberate choice.",
    },
    controls: [
      { href: "/privacy-controls", label: "Review permissions", primary: true },
      { href: "/privacy-controls#export", label: "Export" },
      { href: "/privacy-controls#delete", label: "Delete" },
    ],
    signals: ["Private by default", "Permission before movement", "Portable provenance"],
    previous: { href: "/mirror", label: "Mirror" },
    next: { href: "/privacy-controls", label: "Privacy Controls" },
  },
  privacy: {
    key: "privacy",
    className: "uraiAutoPrivacy",
    label: "CONSENT SANCTUARY",
    title: "Nothing moves without you.",
    description: "Control model access, location precision, sharing, export, and deletion from one protected layer.",
    desktop: privacyControlsAssets.primary.src,
    mobile: privacyControlsAssets.mobile.src,
    accents: [
      { src: privacyControlsAssets.accents.modelAccess.src, alt: "Model access consent object" },
      { src: privacyControlsAssets.accents.locationPrecision.src, alt: "Location precision consent object" },
    ],
    statement: {
      title: "Consent remains reversible",
      detail: "Every permission can be inspected, narrowed, revoked, exported, or deleted.",
    },
    signals: ["Models require permission", "Location stays precise only when chosen", "Consent can be revoked"],
    previous: { href: "/passport", label: "Passport" },
    next: { href: "/location-map", label: "Location Map" },
  },
  location: {
    key: "location",
    className: "uraiAutoLocation",
    label: "EMOTIONAL WEATHER",
    title: "Places carry signal.",
    description: "See how memory, mood, people, and place connect without exposing private detail.",
    desktop: locationMapAssets.primary.src,
    mobile: locationMapAssets.mobile.src,
    accents: [{ src: locationMapAssets.accents.placeNode.src, alt: "Protected place-memory node" }],
    statement: {
      title: "Place context stays protected",
      detail: "The map can reveal emotional weather without publishing precise private history.",
    },
    signals: ["Private place memory", "Consent-safe climate", "Global signal layer"],
    previous: { href: "/privacy-controls", label: "Privacy" },
    next: { href: "/status", label: "System Status" },
  },
  status: {
    key: "status",
    className: "uraiAutoStatus",
    label: "SYSTEM CONSTELLATION",
    title: "The route matrix is visible.",
    description: "Home, Ground, Life Map, Focus, Replay, Mirror, and Passport remain connected in one release surface.",
    desktop: statusAssets.primary.src,
    mobile: statusAssets.mobile.src,
    accents: [{ src: statusAssets.accents.healthPill.src, alt: "Route availability signal" }],
    statement: {
      title: "Availability and proof stay separate",
      detail: "Route presence, consent boundaries, deployment receipts, and device evidence remain independently visible.",
    },
    signals: ["Core routes listed", "Consent layer present", "Deployment proof recorded separately"],
    previous: { href: "/location-map", label: "Location Map" },
    next: { href: "/home", label: "Return Home" },
  },
};

function resolveRealm(pathname: string): RealmConfig | null {
  if (pathname.startsWith("/mirror")) return realms.mirror;
  if (pathname.startsWith("/passport")) return realms.passport;
  if (pathname.startsWith("/privacy-controls")) return realms.privacy;
  if (pathname.startsWith("/location-map")) return realms.location;
  if (pathname.startsWith("/status")) return realms.status;
  return null;
}

export default function UraiAutonomousV1Realms({ pathname }: { pathname: string }) {
  const realm = resolveRealm(pathname);
  if (!realm) return null;

  return (
    <section
      className={`uraiAutoWorld uraiAutoRealm ${realm.className}`}
      aria-label={realm.label}
      data-realm={realm.key}
      data-realm-art="provider-final"
    >
      <picture className="uraiV1SceneArt uraiRealmSceneArt" aria-hidden="true">
        <source media="(max-width: 760px)" srcSet={realm.mobile} />
        <img src={realm.desktop} alt="" draggable="false" />
      </picture>
      <div className="uraiRealmLight" aria-hidden="true" />

      <header className="uraiRealmHud">
        <span>{realm.label}</span>
        <h1>{realm.title}</h1>
        <p>{realm.description}</p>
        {realm.controls ? (
          <div className="uraiRealmControls" aria-label={`${realm.label} action paths`}>
            {realm.controls.map((control) => (
              <a key={control.href} href={control.href} data-primary={control.primary ? "true" : "false"}>
                {control.label}
              </a>
            ))}
          </div>
        ) : null}
      </header>

      <div className="uraiRealmAccents" aria-hidden="true">
        {realm.accents.map((accent, index) => (
          <img key={accent.src} className={`uraiRealmAccent uraiRealmAccent-${index + 1}`} src={accent.src} alt="" />
        ))}
      </div>

      {realm.guide ? (
        <div className="uraiRealmGuide" role="img" aria-label={realm.guide.alt}>
          <i style={{ backgroundImage: `url("${realm.guide.src}")` }} aria-hidden="true" />
          <span>Mirror Guide</span>
        </div>
      ) : null}

      {realm.statement ? (
        <aside className="uraiRealmStatement">
          <strong>{realm.statement.title}</strong>
          <span>{realm.statement.detail}</span>
        </aside>
      ) : null}

      <ol className="uraiRealmSignals" aria-label={`${realm.label} active signals`}>
        {realm.signals.map((signal, index) => (
          <li key={signal}>
            <i aria-hidden="true" />
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{signal}</strong>
          </li>
        ))}
      </ol>

      <nav className="uraiRealmNavigation" aria-label={`${realm.label} navigation`}>
        <a href={realm.previous.href}>{realm.previous.label}</a>
        <a className="isPrimary" href={realm.next.href}>{realm.next.label}</a>
      </nav>
    </section>
  );
}
