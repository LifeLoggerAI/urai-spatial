"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  groundCouncil,
  groundObjects,
  groundZones,
  type GroundCouncilId,
  type GroundLifeObject,
  type GroundObjectId,
} from "./groundWorldData";

type ActiveFocus =
  | { type: "object"; id: GroundObjectId }
  | { type: "council"; id: GroundCouncilId }
  | null;

function worldPositionStyle(position: { x: number; y: number }, extra?: Record<string, string>): CSSProperties {
  return {
    "--x": `${position.x}%`,
    "--y": `${position.y}%`,
    ...extra,
  } as CSSProperties;
}

function privacyLabel(object: GroundLifeObject) {
  if (object.privacy === "protected") return "Protected";
  if (object.privacy === "private") return "Private";
  if (object.privacy === "active") return "Active";
  return "Daily";
}

export default function GroundWorldExperience() {
  const [activeFocus, setActiveFocus] = useState<ActiveFocus>(null);
  const [activeZoneId, setActiveZoneId] = useState(groundZones[0]?.id ?? "council-ring");

  const activeObject = useMemo(() => {
    if (activeFocus?.type !== "object") return null;
    return groundObjects.find((object) => object.id === activeFocus.id) ?? null;
  }, [activeFocus]);

  const activeCouncil = useMemo(() => {
    if (activeFocus?.type !== "council") return null;
    return groundCouncil.find((member) => member.id === activeFocus.id) ?? null;
  }, [activeFocus]);

  const relatedCouncil = useMemo(() => {
    if (!activeObject) return null;
    return groundCouncil.find((member) => member.id === activeObject.councilId) ?? null;
  }, [activeObject]);

  const closeInspector = useCallback(() => setActiveFocus(null), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeInspector();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeInspector]);

  return (
    <main className="urai-ground-world" aria-label="URAI Ground World living layer">
      <a className="urai-ground-world__skip" href="#ground-world-objects">
        Skip to life objects
      </a>

      <div className="urai-ground-world__scene" aria-hidden="true">
        <div className="urai-ground-world__sky" />
        <div className="urai-ground-world__cloud urai-ground-world__cloud--one" />
        <div className="urai-ground-world__cloud urai-ground-world__cloud--two" />
        <div className="urai-ground-world__horizon" />
        <div className="urai-ground-world__distant-village" />
        <div className="urai-ground-world__terrain" />
        <div className="urai-ground-world__path urai-ground-world__path--main" />
        <div className="urai-ground-world__path urai-ground-world__path--left" />
        <div className="urai-ground-world__path urai-ground-world__path--right" />
        <div className="urai-ground-world__council-ring" />
        <div className="urai-ground-world__foreground" />
      </div>

      <header className="urai-ground-world__header">
        <div>
          <p className="urai-ground-world__eyebrow">URAI · Ground World</p>
          <h1>Your life has become a place.</h1>
          <p>
            Walk the embodied layer: council avatars move through the terrain, real-life objects hold meaning,
            and every artifact can be inspected without turning your world into a dashboard.
          </p>
        </div>
        <nav className="urai-ground-world__nav" aria-label="Ground World navigation">
          <Link href="/home">Return Home</Link>
          <Link href="/life-map">Look up to Life Map</Link>
          <Link href="/passport">Privacy Passport</Link>
        </nav>
      </header>

      <section className="urai-ground-world__zones" aria-label="Ground World zones">
        {groundZones.map((zone) => (
          <button
            key={zone.id}
            type="button"
            className="urai-ground-world__zone"
            data-active={zone.id === activeZoneId ? "true" : "false"}
            onClick={() => setActiveZoneId(zone.id)}
          >
            <strong>{zone.label}</strong>
            <span>{zone.description}</span>
          </button>
        ))}
      </section>

      <section className="urai-ground-world__living-layer" aria-label="Walkable embodied ground layer">
        <div className="urai-ground-world__world-label urai-ground-world__world-label--ground">
          <span>Ground life</span>
          <strong>Objects, routines, tools, places, council</strong>
        </div>
        <Link className="urai-ground-world__world-label urai-ground-world__world-label--sky" href="/life-map">
          <span>Sky memory</span>
          <strong>Ascend to Life Map</strong>
        </Link>

        <div className="urai-ground-world__council" aria-label="Council avatars walking in the Ground World">
          {groundCouncil.map((member) => (
            <button
              key={member.id}
              type="button"
              className="urai-ground-world__avatar"
              data-council={member.id}
              data-zone-active={member.zone === activeZoneId ? "true" : "false"}
              style={worldPositionStyle(member.position, { "--walk-delay": member.walkDelay })}
              aria-label={`Talk to ${member.name}: ${member.role}`}
              onClick={() => setActiveFocus({ type: "council", id: member.id })}
            >
              <span className="urai-ground-world__avatar-shadow" />
              <span className="urai-ground-world__avatar-body" />
              <span className="urai-ground-world__avatar-core" />
              <span className="urai-ground-world__avatar-name">{member.name}</span>
            </button>
          ))}
        </div>

        <div id="ground-world-objects" className="urai-ground-world__objects" aria-label="Clickable real-life objects">
          {groundObjects.map((object) => (
            <button
              key={object.id}
              type="button"
              className="urai-ground-world__object"
              data-object={object.id}
              data-privacy={object.privacy}
              data-zone-active={object.zone === activeZoneId ? "true" : "false"}
              style={worldPositionStyle(object.position)}
              aria-label={`Inspect ${object.label}: ${object.meaning}`}
              onClick={() => setActiveFocus({ type: "object", id: object.id })}
            >
              <span className="urai-ground-world__object-glow" />
              <span className="urai-ground-world__object-shape" />
              <span className="urai-ground-world__object-label">{object.label}</span>
            </button>
          ))}
        </div>
      </section>

      <aside
        className="urai-ground-world__inspector"
        data-open={activeFocus ? "true" : "false"}
        aria-live="polite"
        aria-label="Ground World inspector"
      >
        <button type="button" className="urai-ground-world__inspector-close" onClick={closeInspector}>
          Close
        </button>

        {!activeFocus && (
          <div className="urai-ground-world__inspector-empty">
            <p>Click an object or a council avatar.</p>
            <strong>The ground world responds to real life, not stars.</strong>
            <span>Objects open meaning. Council members open guidance. The sky still leads to Life Map.</span>
          </div>
        )}

        {activeObject && (
          <div className="urai-ground-world__inspector-content">
            <p className="urai-ground-world__inspector-kicker">{privacyLabel(activeObject)} · {activeObject.type}</p>
            <h2>{activeObject.label}</h2>
            <p>{activeObject.meaning}</p>

            <div className="urai-ground-world__inspector-section">
              <span>Connected to</span>
              <div className="urai-ground-world__chips">
                {activeObject.connectedTo.map((connection) => (
                  <em key={connection}>{connection}</em>
                ))}
              </div>
            </div>

            <div className="urai-ground-world__inspector-section">
              <span>Council nearby</span>
              <button
                type="button"
                className="urai-ground-world__inline-council"
                onClick={() => relatedCouncil && setActiveFocus({ type: "council", id: relatedCouncil.id })}
              >
                {relatedCouncil?.name ?? "Council"}
              </button>
            </div>

            <div className="urai-ground-world__inspector-actions">
              {activeObject.actions.map((action) => (
                <button key={action} type="button">
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeCouncil && (
          <div className="urai-ground-world__inspector-content">
            <p className="urai-ground-world__inspector-kicker">Council avatar · {activeCouncil.zone.replace("-", " ")}</p>
            <h2>{activeCouncil.name}</h2>
            <p>{activeCouncil.description}</p>

            <div className="urai-ground-world__inspector-section">
              <span>They watch for</span>
              <strong>{activeCouncil.signal}</strong>
            </div>

            <div className="urai-ground-world__inspector-section">
              <span>Guidance</span>
              <strong>{activeCouncil.guidance}</strong>
            </div>

            <div className="urai-ground-world__inspector-actions">
              <button type="button">Ask {activeCouncil.name}</button>
              <button type="button">Approach avatar</button>
              <button type="button">Show nearby objects</button>
            </div>
          </div>
        )}
      </aside>

      <footer className="urai-ground-world__footer">
        <span>Ground = embodied life</span>
        <span>Sky = memory constellation</span>
        <span>Esc closes inspector</span>
      </footer>
    </main>
  );
}
