"use client";

type RealmConfig = {
  className: string;
  label: string;
  title: string;
  description: string;
  desktop: string;
  mobile: string;
  accents: Array<{ src: string; alt: string }>;
  signals: string[];
  previous: { href: string; label: string };
  next: { href: string; label: string };
};

const realms: Record<string, RealmConfig> = {
  mirror: {
    className: "uraiAutoMirror",
    label: "REFLECTION REALM",
    title: "Mirror does not judge.",
    description: "Patterns become visible without turning your life into a score.",
    desktop: "/assets/urai/mirror/mirror-reflection-main.webp",
    mobile: "/assets/urai/mirror/mirror-reflection-mobile.webp",
    accents: [{ src: "/assets/urai/mirror/mirror-pattern-glyph.webp", alt: "Private pattern glyph" }],
    signals: ["Body rhythm", "Relationship weather", "Becoming pattern"],
    previous: { href: "/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread", label: "Replay" },
    next: { href: "/passport", label: "Open Passport" },
  },
  passport: {
    className: "uraiAutoPassport",
    label: "OWNERSHIP VAULT",
    title: "Your life remains yours.",
    description: "Identity, consent, provenance, export, and deletion live inside one protected room.",
    desktop: "/assets/urai/passport/passport-vault-main.webp",
    mobile: "/assets/urai/passport/passport-vault-mobile.webp",
    accents: [{ src: "/assets/urai/passport/passport-ownership-seal.webp", alt: "Ownership and provenance seal" }],
    signals: ["Private by default", "Permission before movement", "Portable provenance"],
    previous: { href: "/mirror", label: "Mirror" },
    next: { href: "/privacy-controls", label: "Privacy Controls" },
  },
  privacy: {
    className: "uraiAutoPrivacy",
    label: "CONSENT SANCTUARY",
    title: "Nothing moves without you.",
    description: "Control model access, location precision, sharing, export, and deletion from one protected layer.",
    desktop: "/assets/urai/privacy-controls/privacy-controls-main.webp",
    mobile: "/assets/urai/privacy-controls/privacy-controls-mobile.webp",
    accents: [
      { src: "/assets/urai/privacy-controls/privacy-model-access.webp", alt: "Model access consent object" },
      { src: "/assets/urai/privacy-controls/privacy-location-precision.webp", alt: "Location precision consent object" },
    ],
    signals: ["Models require permission", "Location stays precise only when chosen", "Consent can be revoked"],
    previous: { href: "/passport", label: "Passport" },
    next: { href: "/location-map", label: "Location Map" },
  },
  location: {
    className: "uraiAutoLocation",
    label: "EMOTIONAL WEATHER",
    title: "Places carry signal.",
    description: "See how memory, mood, people, and place connect without exposing private detail.",
    desktop: "/assets/urai/location-map/location-emotional-weather-main.webp",
    mobile: "/assets/urai/location-map/location-emotional-weather-mobile.webp",
    accents: [{ src: "/assets/urai/location-map/location-place-node.webp", alt: "Protected place-memory node" }],
    signals: ["Private place memory", "Consent-safe climate", "Global signal layer"],
    previous: { href: "/privacy-controls", label: "Privacy" },
    next: { href: "/status", label: "System Status" },
  },
  status: {
    className: "uraiAutoStatus",
    label: "SYSTEM CONSTELLATION",
    title: "The living route is online.",
    description: "Home, Ground, Life Map, Focus, Replay, Mirror, and Passport remain connected as one world.",
    desktop: "/assets/urai/status/status-route-matrix-main.webp",
    mobile: "/assets/urai/status/status-route-matrix-mobile.webp",
    accents: [{ src: "/assets/urai/status/status-health-pill.webp", alt: "Launch health signal" }],
    signals: ["Core route reachable", "Consent layer present", "Production proof current"],
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
    <section className={`uraiAutoWorld uraiAutoRealm ${realm.className}`} aria-label={realm.label}>
      <picture className="uraiV1SceneArt uraiRealmSceneArt" aria-hidden="true">
        <source media="(max-width: 760px)" srcSet={realm.mobile} />
        <img src={realm.desktop} alt="" draggable="false" />
      </picture>
      <div className="uraiRealmLight" aria-hidden="true" />

      <header className="uraiRealmHud">
        <span>{realm.label}</span>
        <h1>{realm.title}</h1>
        <p>{realm.description}</p>
      </header>

      <div className="uraiRealmAccents" aria-hidden="true">
        {realm.accents.map((accent, index) => (
          <img key={accent.src} className={`uraiRealmAccent uraiRealmAccent-${index + 1}`} src={accent.src} alt={accent.alt} />
        ))}
      </div>

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
