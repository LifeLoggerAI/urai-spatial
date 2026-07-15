"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { avatarAssets } from "@/spatial/assets/uraiAssets";
import UraiAutonomousV1Realms from "./UraiAutonomousV1Realms";
import "./urai-autonomous-v1-layer.css";
import "./urai-autonomous-v1-assets.css";
import "./urai-autonomous-v1-realms.css";
import "./urai-autonomous-v1-isolation.css";
import "./urai-autonomous-v1-workforce.css";

const DEFAULT_MEMORY_ID = "quiet-reset";
const DEFAULT_MANIFEST_ID = "replay-recovery-thread";

type MemoryIdentity = {
  memoryId: string;
  manifestId: string;
  node: string;
};

function safeToken(value: string | null, fallback: string) {
  if (!value) return fallback;
  const trimmed = value.trim().slice(0, 120);
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : fallback;
}

function readableName(value: string) {
  return value
    .replace(/[-_:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function memoryRoute(pathname: "/focus" | "/replay" | "/life-map", identity: MemoryIdentity, extra?: Record<string, string>) {
  const params = new URLSearchParams({
    memoryId: identity.memoryId,
    manifestId: identity.manifestId,
    node: identity.node,
    ...extra,
  });
  return `${pathname}?${params.toString()}`;
}

const groundStations = [
  { key: "reception", label: "Reception", detail: "New signals arrive here." },
  { key: "privacy", label: "Consent vault", detail: "Nothing leaves without approval." },
  { key: "work", label: "Work table", detail: "Priorities become visible objects." },
  { key: "wellness", label: "Wellness nook", detail: "Body rhythm remains private context." },
  { key: "memory", label: "Memory archive", detail: "Moments connect to places and people." },
  { key: "logistics", label: "Logistics bay", detail: "Real-life tasks wait for consent." },
];

const helpers = [
  { key: "welcome", label: "Welcome Guide", art: avatarAssets.receptionist.src },
  { key: "privacy", label: "Privacy Steward", art: avatarAssets.privacySteward.src },
  { key: "schedule", label: "Schedule Steward", art: avatarAssets.scheduleSteward.src },
  { key: "wellness", label: "Wellness Guide", art: avatarAssets.wellnessGuide.src },
  { key: "memory", label: "Memory Archivist", art: avatarAssets.archivist.src },
];

const specialists = [
  { label: "Relationship Liaison", art: avatarAssets.relationshipLiaison.src },
  { label: "Operator", art: avatarAssets.operator.src },
  { label: "Builder", art: avatarAssets.builder.src },
  { label: "Protector", art: avatarAssets.protector.src },
  { label: "Mirror Guide", art: avatarAssets.mirror.src },
  { label: "World Guide", art: avatarAssets.guide.src },
];

function SceneArt({
  className,
  desktop,
  mobile,
}: {
  className: string;
  desktop: string;
  mobile: string;
}) {
  return (
    <picture className={`uraiV1SceneArt ${className}`} aria-hidden="true">
      <source media="(max-width: 760px)" srcSet={mobile} />
      <img src={desktop} alt="" draggable="false" />
    </picture>
  );
}

function GroundWorld() {
  return (
    <section
      className="uraiAutoWorld uraiAutoGround"
      aria-label="Private operations floor"
      data-workforce-art="provider-final"
    >
      <SceneArt
        className="uraiGroundSceneArt"
        desktop="/assets/urai/ground/ground-world-main.webp"
        mobile="/assets/urai/ground/ground-world-mobile.webp"
      />
      <div className="uraiAutoAtmosphere" aria-hidden="true" />
      <div className="uraiGroundArchitecture" aria-hidden="true">
        <div className="uraiGroundCeiling" />
        <div className="uraiGroundBackWall">
          <div className="uraiGroundWindow" />
          <div className="uraiGroundCore"><i /></div>
        </div>
        <div className="uraiGroundFloor" />
      </div>

      <header className="uraiAutoHud uraiAutoHudGround">
        <span>URAI GROUND</span>
        <strong>Private floor active</strong>
        <small>Move through the room · inspect only what matters</small>
      </header>

      <div className="uraiGroundRoom" role="group" aria-label="Ground stations">
        {groundStations.map((station) => (
          <button
            className={`uraiGroundObject uraiGroundObject-${station.key}`}
            type="button"
            key={station.key}
            aria-label={`${station.label}. ${station.detail}`}
          >
            <span className="uraiGroundObjectBody" aria-hidden="true" />
            <span className="uraiGroundObjectLabel">
              <b>{station.label}</b>
              <em>{station.detail}</em>
            </span>
          </button>
        ))}

        {helpers.map((helper, index) => (
          <div
            className={`uraiGroundHelper uraiGroundHelper-${index + 1}`}
            key={helper.key}
            aria-label={`${helper.label} helper active`}
          >
            <i
              className="uraiGroundHelperArt"
              style={{ backgroundImage: `url("${helper.art}")` }}
              aria-hidden="true"
            />
            <span>{helper.label}</span>
          </div>
        ))}

        <aside className="uraiGroundCouncil" aria-label="Specialist council present in Ground">
          <strong>Specialist council</strong>
          <div>
            {specialists.map((specialist) => (
              <figure key={specialist.label} title={specialist.label}>
                <i
                  style={{ backgroundImage: `url("${specialist.art}")` }}
                  aria-hidden="true"
                />
                <figcaption>{specialist.label}</figcaption>
              </figure>
            ))}
          </div>
        </aside>
      </div>

      <aside className="uraiGroundStatus">
        <span>PRIVATE WORKFORCE</span>
        <strong>11 workforce presences staged</strong>
        <small>Every action remains staged until you approve it.</small>
      </aside>

      <div className="uraiGroundMobileSheet">
        <span>PRIVATE FLOOR</span>
        <strong>Workforce present. You stay in control.</strong>
        <small>Tap a station to inspect it. Nothing acts without approval.</small>
      </div>

      <nav className="uraiAutoNav" aria-label="Ground navigation">
        <a href="/home">Home</a>
        <a className="isActive" href="/ground">Ground</a>
        <a href="/life-map">Life Map</a>
        <a href="/focus?memoryId=quiet-reset">Focus</a>
      </nav>
    </section>
  );
}

function FocusWorld({ identity }: { identity: MemoryIdentity }) {
  const memoryName = identity.node === DEFAULT_MEMORY_ID ? "The Quiet Reset" : readableName(identity.node);
  const replayHref = memoryRoute("/replay", identity, { from: "focus-chamber" });
  const lifeMapHref = memoryRoute("/life-map", identity, { unwind: "focus" });
  const focusHref = memoryRoute("/focus", identity);

  return (
    <section
      className="uraiAutoWorld uraiAutoFocus"
      aria-label="Selected memory chamber"
      data-testid="urai-final-focus-chamber"
      data-memory-id={identity.memoryId}
      data-manifest-id={identity.manifestId}
      data-node={identity.node}
      data-visible-route-owner="urai-autonomous-v1-focus"
    >
      <SceneArt
        className="uraiFocusSceneArt"
        desktop="/assets/urai/focus/focus-memory-chamber-main.webp"
        mobile="/assets/urai/focus/focus-memory-chamber-mobile.webp"
      />
      <div className="uraiAutoAtmosphere" aria-hidden="true" />
      <div className="uraiFocusTunnel" aria-hidden="true">
        <i /><i /><i /><i />
      </div>

      <header className="uraiAutoHud uraiAutoHudFocus">
        <span>SELECTED MEMORY</span>
        <strong>{memoryName}</strong>
        <small>May 17, 2023 · private chamber</small>
      </header>

      <a
        className="uraiFocusMemory uraiFocusMemoryHotspot"
        href={replayHref}
        aria-label={`Enter Replay for ${memoryName}`}
      >
        <picture className="uraiFocusMemoryImage" aria-hidden="true">
          <source
            media="(max-width: 760px)"
            srcSet="/assets/urai/focus/focus-memory-chamber-mobile.webp"
          />
          <img
            src="/assets/urai/focus/focus-memory-chamber-main.webp"
            alt=""
            draggable="false"
          />
        </picture>
        <div className="uraiFocusMemoryRings" aria-hidden="true"><i /><i /><i /></div>
        <span>ENTER REPLAY</span>
      </a>

      <aside className="uraiFocusMeaning">
        <span>WHY THIS STAR IS AWAKE</span>
        <strong>The moment pressure became permission to begin again.</strong>
        <small>Double-click the memory or press Enter to open the living thread.</small>
      </aside>

      <nav className="uraiAutoNav" aria-label="Focus navigation">
        <a href={lifeMapHref}>Return to Life Map</a>
        <a className="isActive" href={focusHref}>Focus</a>
        <a href={replayHref}>Replay</a>
      </nav>
    </section>
  );
}

function ReplayWorld() {
  return (
    <section className="uraiAutoWorld uraiAutoReplay" aria-label="Cinematic memory replay">
      <div className="uraiAutoAtmosphere" aria-hidden="true" />
      <div className="uraiReplayCinema" aria-hidden="true">
        <SceneArt
          className="uraiReplaySceneArt"
          desktop="/assets/urai/replay/replay-memory-film-main.webp"
          mobile="/assets/urai/replay/replay-memory-film-mobile.webp"
        />
        <div className="uraiReplayScene uraiReplayScene-1"><i /></div>
        <div className="uraiReplayScene uraiReplayScene-2"><i /></div>
        <div className="uraiReplayScene uraiReplayScene-3"><i /></div>
        <div className="uraiReplayScene uraiReplayScene-4"><i /></div>
        <div className="uraiReplayGrain" />
        <div className="uraiReplayLight" />
      </div>

      <header className="uraiAutoHud uraiAutoHudReplay">
        <span>MEMORY FILM</span>
        <strong>The Quiet Reset</strong>
        <small>Living thread · 03:18</small>
      </header>

      <div className="uraiReplayCaption">
        <span>02:11</span>
        <strong>“I stopped asking the pressure for permission.”</strong>
      </div>

      <ol className="uraiReplayBeats" aria-label="Replay emotional beats">
        <li className="isPast"><i />Pressure</li>
        <li className="isPast"><i />Signal</li>
        <li className="isCurrent"><i />Reset</li>
        <li><i />Return</li>
      </ol>

      <div className="uraiReplayControls">
        <a href="/focus?memoryId=quiet-reset">Back to Focus</a>
        <button type="button" aria-label="Pause memory replay"><i />Pause</button>
        <a href="/unwind">Unwind</a>
      </div>
    </section>
  );
}

export default function UraiAutonomousV1Layer() {
  const pathname = usePathname() || "";
  const [focusIdentity, setFocusIdentity] = useState<MemoryIdentity>({
    memoryId: DEFAULT_MEMORY_ID,
    manifestId: DEFAULT_MANIFEST_ID,
    node: DEFAULT_MEMORY_ID,
  });

  useEffect(() => {
    if (!pathname.startsWith("/focus")) return;
    const params = new URLSearchParams(window.location.search);
    const memoryId = safeToken(params.get("memoryId"), DEFAULT_MEMORY_ID);
    const manifestId = safeToken(params.get("manifestId"), DEFAULT_MANIFEST_ID);
    const node = safeToken(params.get("node"), memoryId);
    setFocusIdentity({ memoryId, manifestId, node });
  }, [pathname]);

  // Ground is now owned by the shared City Overlook spatial world. Do not overlay
  // the legacy private-floor screen, because it replaces the explorable city layer.
  if (pathname.startsWith("/ground")) return null;

  if (pathname.startsWith("/focus")) return <FocusWorld identity={focusIdentity} />;
  if (pathname.startsWith("/replay")) return <ReplayWorld />;
  if (
    pathname.startsWith("/mirror") ||
    pathname.startsWith("/passport") ||
    pathname.startsWith("/privacy-controls") ||
    pathname.startsWith("/location-map") ||
    pathname.startsWith("/status")
  ) {
    return <UraiAutonomousV1Realms pathname={pathname} />;
  }
  return null;
}
