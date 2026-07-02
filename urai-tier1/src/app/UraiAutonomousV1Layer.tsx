"use client";

import { usePathname } from "next/navigation";
import "./urai-autonomous-v1-layer.css";

const groundStations = [
  { key: "reception", label: "Reception", detail: "New signals arrive here." },
  { key: "privacy", label: "Consent vault", detail: "Nothing leaves without approval." },
  { key: "work", label: "Work table", detail: "Priorities become visible objects." },
  { key: "wellness", label: "Wellness nook", detail: "Body rhythm remains private context." },
  { key: "memory", label: "Memory archive", detail: "Moments connect to places and people." },
  { key: "logistics", label: "Logistics bay", detail: "Real-life tasks wait for consent." },
];

const helpers = ["privacy", "schedule", "wellness", "memory", "logistics"];

function GroundWorld() {
  return (
    <section className="uraiAutoWorld uraiAutoGround" aria-label="Private operations floor">
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
          <div className={`uraiGroundHelper uraiGroundHelper-${index + 1}`} key={helper} aria-label={`${helper} helper active`}>
            <i className="uraiGroundHelperHead" />
            <i className="uraiGroundHelperBody" />
            <span>{helper}</span>
          </div>
        ))}
      </div>

      <aside className="uraiGroundStatus">
        <span>PRIVATE WORKFORCE</span>
        <strong>5 helpers preparing quietly</strong>
        <small>Every action remains staged until you approve it.</small>
      </aside>

      <div className="uraiGroundMobileSheet">
        <span>PRIVATE FLOOR</span>
        <strong>Tap a station to inspect it.</strong>
        <small>Helpers prepare. You decide what moves.</small>
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

function FocusWorld() {
  return (
    <section className="uraiAutoWorld uraiAutoFocus" aria-label="Selected memory chamber">
      <div className="uraiAutoAtmosphere" aria-hidden="true" />
      <div className="uraiFocusTunnel" aria-hidden="true">
        <i /><i /><i /><i />
      </div>

      <header className="uraiAutoHud uraiAutoHudFocus">
        <span>SELECTED MEMORY</span>
        <strong>The Quiet Reset</strong>
        <small>May 17, 2023 · private chamber</small>
      </header>

      <a
        className="uraiFocusMemory"
        href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&from=focus-chamber"
        aria-label="Enter Replay for The Quiet Reset"
      >
        <div className="uraiFocusMemoryImage" aria-hidden="true">
          <i className="uraiFocusHorizon" />
          <i className="uraiFocusFigure" />
        </div>
        <div className="uraiFocusMemoryRings" aria-hidden="true"><i /><i /><i /></div>
        <span>ENTER REPLAY</span>
      </a>

      <aside className="uraiFocusMeaning">
        <span>WHY THIS STAR IS AWAKE</span>
        <strong>The moment pressure became permission to begin again.</strong>
        <small>Double-click the memory or press Enter to open the living thread.</small>
      </aside>

      <nav className="uraiAutoNav" aria-label="Focus navigation">
        <a href="/life-map">Return to Life Map</a>
        <a className="isActive" href="/focus?memoryId=quiet-reset">Focus</a>
        <a href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread">Replay</a>
      </nav>
    </section>
  );
}

function ReplayWorld() {
  return (
    <section className="uraiAutoWorld uraiAutoReplay" aria-label="Cinematic memory replay">
      <div className="uraiAutoAtmosphere" aria-hidden="true" />
      <div className="uraiReplayCinema" aria-hidden="true">
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

  if (pathname.startsWith("/ground")) return <GroundWorld />;
  if (pathname.startsWith("/focus")) return <FocusWorld />;
  if (pathname.startsWith("/replay")) return <ReplayWorld />;
  return null;
}
