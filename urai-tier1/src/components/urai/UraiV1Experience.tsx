"use client";

import Link from "next/link";
import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { loadUraiV1Profile } from "@/lib/urai-v1-profile-store";
import { uraiV1DemoProfile, type UraiDemoProfile, type UraiV1ProfileSource } from "@/lib/urai-v1-demo-profile";

type UraiV1Mode = "home" | "life-map" | "replay" | "demo" | "privacy" | "focus" | "unwind" | "mirror" | "ascent";
type ActivePanel = "home" | "chat" | "memory" | "privacy";

type UraiV1ExperienceProps = {
  mode?: UraiV1Mode;
  profileLabel?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const sourceCopy: Record<UraiV1ProfileSource, string> = {
  demo: "Demo seed active",
  firestore: "Firestore profile active",
  "firestore-fallback": "Firestore empty, demo seed active",
  error: "Firestore unavailable, demo seed active",
};

function panelForMode(mode: UraiV1Mode): ActivePanel {
  if (mode === "life-map" || mode === "ascent") return "memory";
  if (mode === "privacy") return "privacy";
  if (mode === "focus" || mode === "mirror" || mode === "unwind") return "chat";
  return "home";
}

function starWeight(weight?: number) {
  return `${Math.round((weight ?? 0.5) * 100)}%`;
}

export default function UraiV1Experience({ mode = "home", profileLabel }: UraiV1ExperienceProps) {
  const [profile, setProfile] = useState<UraiDemoProfile>(uraiV1DemoProfile);
  const [source, setSource] = useState<UraiV1ProfileSource>("demo");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<ActivePanel>(() => panelForMode(mode));
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: uraiV1DemoProfile.companionInsight.message },
  ]);

  useEffect(() => {
    setActivePanel(panelForMode(mode));
  }, [mode]);

  useEffect(() => {
    let mounted = true;
    const userId = process.env.NEXT_PUBLIC_URAI_DEMO_USER_ID || "demo-user";

    async function load() {
      setLoading(true);
      const bundle = await loadUraiV1Profile(userId);
      if (!mounted) return;
      setProfile(bundle.profile);
      setSource(bundle.source);
      setError(bundle.error ?? null);
      setChatMessages([{ role: "assistant", text: bundle.profile.companionInsight.message }]);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const memoryStars = useMemo(() => profile.memoryStars.slice(0, 8), [profile.memoryStars]);
  const displayName = profileLabel ?? profile.displayName;
  const auraColor = profile.currentMood.auraColor ?? "#9be7d8";
  const moodPercent = Math.max(0, Math.min(100, Math.round(profile.currentMood.intensity)));

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;

    setChatInput("");
    setChatMessages((messages) => [...messages, { role: "user", text: message }]);

    try {
      const response = await fetch("/api/orb-companion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: profile.id, message }),
      });
      const payload = (await response.json()) as { reply?: string };
      setChatMessages((messages) => [
        ...messages,
        { role: "assistant", text: payload.reply || profile.companionInsight.message },
      ]);
    } catch {
      setChatMessages((messages) => [
        ...messages,
        { role: "assistant", text: "The live route is quiet, so I am staying with the local demo reflection." },
      ]);
    }
  }

  return (
    <main
      className={`urai-v1-spine weather-${profile.currentMood.weather}`}
      data-urai-v1-spine="true"
      data-urai-source={source}
      data-urai-weather={profile.currentMood.weather}
      style={{ "--urai-aura": auraColor } as CSSProperties}
    >
      <section className="v1-sky" aria-hidden="true">
        {memoryStars.map((star, index) => (
          <span
            key={star.id}
            className="v1-star"
            style={{
              left: `${12 + ((index * 17) % 76)}%`,
              top: `${12 + ((index * 23) % 46)}%`,
              opacity: 0.45 + (star.emotionalWeight ?? 0.5) * 0.45,
            }}
          />
        ))}
      </section>
      <section className="v1-ground" aria-hidden="true" />

      <header className="v1-header">
        <Link href="/" className="v1-brand" aria-label="URAI Spatial home">URAI Spatial</Link>
        <nav aria-label="URAI V1 routes">
          <Link href="/">Home</Link>
          <Link href="/life-map">Life Map</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </header>

      <section className="v1-center" aria-label="URAI Spatial V1 home">
        <div className="v1-orb-shell">
          <button type="button" className="v1-orb" onClick={() => setActivePanel("chat")} aria-label="Open companion chat">
            <span />
          </button>
          <div className="v1-orb-caption">Companion present</div>
        </div>

        <div className="v1-home-copy">
          <p className="v1-kicker">{displayName}</p>
          <h1>{profile.currentMood.label}</h1>
          <p className="v1-weather">{profile.currentMood.weather} weather</p>
          <p className="v1-reflection">{profile.companionInsight.message}</p>

          <div className="v1-actions">
            <button type="button" onClick={() => setActivePanel("chat")}>Open companion</button>
            <button type="button" onClick={() => setActivePanel("memory")}>Open memory map</button>
          </div>

          <div className="v1-status-row" role="status">
            <span>{loading ? "Warming the home field" : sourceCopy[source]}</span>
            <span>Mood intensity {moodPercent}%</span>
          </div>
          {error ? <p className="v1-error">Firestore fallback: {error}</p> : null}
        </div>
      </section>

      <aside className="v1-panel" aria-label="URAI active panel">
        {activePanel === "home" ? (
          <section>
            <p className="v1-kicker">Companion insight</p>
            <h2>{profile.companionInsight.title}</h2>
            <p>{profile.companionInsight.message}</p>
          </section>
        ) : null}

        {activePanel === "chat" ? (
          <section>
            <p className="v1-kicker">Companion</p>
            <h2>Ask the orb</h2>
            <div className="v1-chat-log" aria-live="polite">
              {chatMessages.map((message, index) => (
                <p key={`${message.role}-${index}`} data-role={message.role}>{message.text}</p>
              ))}
            </div>
            <form className="v1-chat-form" onSubmit={sendChat}>
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Ask what URAI is noticing"
                aria-label="Message URAI companion"
              />
              <button type="submit">Send</button>
            </form>
          </section>
        ) : null}

        {activePanel === "memory" ? (
          <section>
            <p className="v1-kicker">Memory stars</p>
            <h2>Spatial life map</h2>
            {memoryStars.length ? (
              <div className="v1-memory-list">
                {memoryStars.map((star) => (
                  <article key={star.id}>
                    <strong>{star.title}</strong>
                    <span>{star.moodLabel ?? "memory"} - {starWeight(star.emotionalWeight)}</span>
                    <p>{star.summary}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="v1-empty">No memory stars yet. Demo seed data keeps the home field visible.</p>
            )}
          </section>
        ) : null}

        {activePanel === "privacy" ? (
          <section>
            <p className="v1-kicker">Data boundary</p>
            <h2>Private by default</h2>
            <p>URAI V1 renders from demo data when Firebase is missing. Live Firestore data is optional and user-scoped.</p>
          </section>
        ) : null}
      </aside>

      <style jsx>{`
        .urai-v1-spine {
          position: relative;
          min-height: 100dvh;
          overflow: hidden;
          color: #eef8f6;
          background: radial-gradient(circle at 50% 36%, rgba(155, 231, 216, 0.2), transparent 22rem), linear-gradient(180deg, #071225 0%, #10172a 46%, #07150f 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .urai-v1-spine * { box-sizing: border-box; }
        .weather-aurora { background: radial-gradient(circle at 48% 28%, rgba(107, 255, 214, 0.24), transparent 20rem), linear-gradient(180deg, #06142a 0%, #1a1740 48%, #07150f 100%); }
        .weather-night, .weather-fog { background: radial-gradient(circle at 50% 34%, rgba(165, 180, 252, 0.18), transparent 20rem), linear-gradient(180deg, #030815 0%, #111827 52%, #06100d 100%); }
        .v1-sky, .v1-ground { position: absolute; inset: 0; pointer-events: none; }
        .v1-sky { background: radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.16), transparent 11rem), radial-gradient(circle at 78% 20%, rgba(251, 191, 36, 0.13), transparent 10rem), linear-gradient(180deg, rgba(160, 217, 255, 0.1), transparent 58%); }
        .v1-star { position: absolute; width: 0.42rem; height: 0.42rem; border-radius: 999px; background: #f8fbff; box-shadow: 0 0 1rem rgba(180, 245, 255, 0.86), 0 0 2.4rem var(--urai-aura); }
        .v1-ground { top: auto; height: 38dvh; bottom: -8dvh; background: radial-gradient(ellipse at 50% 0%, rgba(155, 231, 216, 0.18), transparent 38%), linear-gradient(180deg, rgba(56, 102, 76, 0.55), #020706 72%); border-radius: 50% 50% 0 0; }
        .v1-header { position: relative; z-index: 5; display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem 1.25rem; }
        .v1-brand, .v1-header a { color: #eef8f6; text-decoration: none; font-weight: 750; }
        .v1-header nav { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end; font-size: 0.92rem; }
        .v1-center { position: relative; z-index: 4; min-height: calc(100dvh - 5rem); display: grid; grid-template-columns: minmax(12rem, 20rem) minmax(18rem, 34rem); align-items: center; justify-content: center; gap: 3rem; padding: 2rem 1.25rem 12rem; }
        .v1-orb-shell { display: grid; justify-items: center; gap: 0.85rem; }
        .v1-orb { width: 10rem; height: 10rem; border: 1px solid rgba(224, 255, 250, 0.34); border-radius: 999px; background: radial-gradient(circle at 36% 26%, #ffffff 0 8%, rgba(255, 255, 255, 0.55) 9% 18%, transparent 19%), radial-gradient(circle at 50% 55%, #f3fffb 0 8%, var(--urai-aura) 34%, #366bc7 72%, rgba(12, 24, 48, 0.92) 100%); box-shadow: 0 0 2.5rem rgba(155, 231, 216, 0.64), 0 0 8rem rgba(100, 180, 255, 0.26); cursor: pointer; }
        .v1-orb span { display: block; width: 100%; height: 100%; border-radius: inherit; background: radial-gradient(circle, rgba(255, 255, 255, 0.18), transparent 60%); }
        .v1-orb-caption, .v1-kicker, .v1-status-row { color: rgba(238, 248, 246, 0.72); font-size: 0.82rem; font-weight: 750; }
        .v1-kicker { margin: 0 0 0.5rem; }
        .v1-home-copy h1 { margin: 0; font-size: 4.4rem; line-height: 0.92; font-weight: 820; letter-spacing: 0; text-transform: lowercase; }
        .v1-weather { margin: 0.8rem 0 0; color: var(--urai-aura); font-weight: 780; }
        .v1-reflection { max-width: 34rem; margin: 1rem 0 0; color: rgba(238, 248, 246, 0.86); font-size: 1.1rem; line-height: 1.6; }
        .v1-actions, .v1-status-row, .v1-chat-form { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
        .v1-actions { margin-top: 1.35rem; }
        .v1-actions button, .v1-chat-form button { min-height: 2.75rem; border: 1px solid rgba(225, 255, 250, 0.3); border-radius: 8px; padding: 0 1rem; background: rgba(238, 248, 246, 0.13); color: #eef8f6; font-weight: 780; cursor: pointer; }
        .v1-status-row { margin-top: 1rem; }
        .v1-error { width: fit-content; max-width: 100%; margin: 0.75rem 0 0; border: 1px solid rgba(251, 191, 36, 0.34); border-radius: 8px; padding: 0.55rem 0.7rem; background: rgba(73, 50, 7, 0.28); color: #fde68a; }
        .v1-panel { position: absolute; right: 1.25rem; bottom: 1.25rem; z-index: 6; width: min(31rem, calc(100vw - 2.5rem)); border: 1px solid rgba(225, 255, 250, 0.2); border-radius: 8px; padding: 1rem; background: rgba(4, 10, 22, 0.72); backdrop-filter: blur(18px); box-shadow: 0 1.25rem 4rem rgba(0, 0, 0, 0.32); }
        .v1-panel h2 { margin: 0 0 0.6rem; font-size: 1.15rem; letter-spacing: 0; }
        .v1-panel p { color: rgba(238, 248, 246, 0.78); line-height: 1.5; }
        .v1-chat-log { display: grid; gap: 0.55rem; max-height: 12rem; overflow: auto; margin-bottom: 0.75rem; }
        .v1-chat-log p { margin: 0; border-radius: 8px; padding: 0.65rem 0.75rem; background: rgba(238, 248, 246, 0.08); }
        .v1-chat-log p[data-role="user"] { background: rgba(155, 231, 216, 0.16); }
        .v1-chat-form input { min-width: 0; flex: 1 1 14rem; min-height: 2.75rem; border: 1px solid rgba(225, 255, 250, 0.24); border-radius: 8px; padding: 0 0.85rem; background: rgba(2, 8, 18, 0.7); color: #eef8f6; }
        .v1-memory-list { display: grid; gap: 0.65rem; }
        .v1-memory-list article { border-left: 2px solid var(--urai-aura); padding-left: 0.75rem; }
        .v1-memory-list strong, .v1-memory-list span { display: block; }
        .v1-memory-list span { color: rgba(155, 231, 216, 0.82); font-size: 0.82rem; font-weight: 720; }
        .v1-memory-list p { margin: 0.25rem 0 0; }
        .v1-empty { border: 1px solid rgba(225, 255, 250, 0.18); border-radius: 8px; padding: 0.75rem; background: rgba(238, 248, 246, 0.07); }
        @media (max-width: 760px) { .v1-header { align-items: flex-start; } .v1-center { min-height: auto; grid-template-columns: 1fr; gap: 1.5rem; justify-items: center; padding: 2rem 1rem 23rem; text-align: center; } .v1-home-copy h1 { font-size: 3rem; } .v1-reflection { font-size: 1rem; } .v1-actions, .v1-status-row { justify-content: center; } .v1-panel { left: 1rem; right: 1rem; bottom: 1rem; width: auto; } }
      `}</style>
    </main>
  );
}
