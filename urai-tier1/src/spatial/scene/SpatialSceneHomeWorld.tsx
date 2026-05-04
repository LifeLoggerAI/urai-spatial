"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function star(index: number) {
  return {
    x: (index * 37 + 11) % 100,
    y: (index * 53 + 17) % 100,
    opacity: 0.28 + (((index * 13) % 65) / 100),
    delay: ((index * 17) % 11) / 10,
  };
}

export default function SpatialSceneHomeWorld() {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const stars = useMemo(() => Array.from({ length: 96 }, (_, index) => star(index)), []);

  const enter = () => {
    if (opening) return;
    setOpening(true);
    window.setTimeout(() => router.push("/life-map", { scroll: false }), 1180);
  };

  return (
    <main className="world" data-testid="urai-spatial-stage" data-camera={opening ? "ascent" : "home"}>
      <section className={`home-world ${opening ? "opening" : ""}`} data-testid="urai-home-scene">
        <div className="camera-rig">
          <div className="sky" />
          <div className="aurora" />
          <div className="cloud cloud-a" />
          <div className="cloud cloud-b" />
          <div className="stars" aria-hidden="true">
            {stars.map((s, index) => (
              <i key={index} style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.opacity, animationDelay: `${s.delay}s` }} />
            ))}
          </div>

          <div className="horizon-glow" />
          <div className="horizon-line" data-testid="urai-home-horizon" />
          <div className="mountain mountain-a" />
          <div className="mountain mountain-b" />
          <div className="ground ground-back" />
          <div className="ground ground-mid" />
          <div className="ground ground-front" data-testid="urai-home-ground" />
          <div className="ground-grid" />

          <div className="avatar" data-testid="urai-home-avatar">
            <div className="avatar-aura" />
            <div className="avatar-head" />
            <div className="avatar-torso" />
            <div className="avatar-arm avatar-arm-left" />
            <div className="avatar-arm avatar-arm-right" />
            <div className="avatar-leg avatar-leg-left" />
            <div className="avatar-leg avatar-leg-right" />
            <div className="avatar-shadow" />
          </div>

          <button type="button" className="orb" data-testid="urai-orb-button" aria-label="Enter Life Map" onClick={enter} disabled={opening}>
            <span className="orb-core" />
            <span className="orb-ring ring-a" />
            <span className="orb-ring ring-b" />
          </button>
          <div className="orb-beam" />
          <div className="camera-path path-a" />
          <div className="camera-path path-b" />

          <button type="button" className="enter-label" onClick={enter} disabled={opening}>
            {opening ? "CAMERA LIFTING THROUGH THE SKY" : "ENTER THE SKY"}
          </button>

          <p className="caption">A living world: orb, sky, horizon, ground, avatar, and camera movement into the Life Map.</p>
        </div>
      </section>

      <nav className="dock" data-testid="urai-command-ribbon">
        <button type="button" onClick={enter} disabled={opening}>LifeMap</button>
        <button type="button" onClick={() => router.push("/mirror", { scroll: false })}>Mirror</button>
        <button type="button" onClick={() => router.push("/replay", { scroll: false })}>Replay</button>
      </nav>

      <style jsx>{`
        .world{position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;overflow:hidden;background:#020612;color:white;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.home-world,.camera-rig,.sky,.stars{position:absolute;inset:0}.home-world{perspective:1200px;transform-style:preserve-3d}.camera-rig{transform-style:preserve-3d;transition:transform 1180ms cubic-bezier(.16,1,.3,1),filter 1180ms cubic-bezier(.16,1,.3,1),opacity 1180ms cubic-bezier(.16,1,.3,1)}.opening .camera-rig{transform:translateZ(360px) translateY(31vh) scale(1.24);filter:blur(16px) saturate(1.45);opacity:.08}.sky{background:radial-gradient(circle at 50% 20%,rgba(255,255,255,.22),transparent 9%),radial-gradient(circle at 50% 30%,rgba(139,203,255,.4),transparent 31%),radial-gradient(circle at 72% 18%,rgba(196,181,253,.22),transparent 21%),linear-gradient(180deg,#050813 0%,#132b48 44%,#07111f 72%,#030811 100%);animation:sky-breathe 8s ease-in-out infinite alternate}.aurora{position:absolute;inset:4% -10% 34%;background:linear-gradient(105deg,transparent,rgba(125,211,252,.14),rgba(196,181,253,.2),rgba(52,211,153,.11),transparent);filter:blur(28px);opacity:.78;transform:skewY(-7deg);animation:aurora 16s ease-in-out infinite alternate}.cloud{position:absolute;left:50%;border-radius:999px;background:rgba(220,244,255,.12);filter:blur(18px);mix-blend-mode:screen}.cloud-a{top:18%;width:58vw;height:8vh;transform:translateX(-64%);animation:cloud 24s linear infinite}.cloud-b{top:31%;width:46vw;height:7vh;transform:translateX(-18%);animation:cloud 31s linear infinite reverse}.stars i{position:absolute;width:2px;height:2px;border-radius:999px;background:white;box-shadow:0 0 10px rgba(255,255,255,.82),0 0 24px rgba(151,202,255,.32);animation:twinkle 2.4s ease-in-out infinite alternate}.horizon-glow{position:absolute;left:-10%;right:-10%;bottom:31vh;height:28vh;background:radial-gradient(ellipse at 50% 100%,rgba(157,220,255,.72),rgba(86,149,207,.24) 42%,transparent 72%);filter:blur(16px);opacity:.88}.horizon-line{position:absolute;left:0;right:0;bottom:33vh;height:1px;background:linear-gradient(90deg,transparent,rgba(226,246,255,.72),transparent);box-shadow:0 0 24px rgba(155,220,255,.56)}.mountain{position:absolute;left:50%;width:122vw;transform:translateX(-50%);border-radius:50% 50% 0 0;background:linear-gradient(180deg,rgba(63,105,142,.58),rgba(8,24,43,.82))}.mountain-a{bottom:26vh;height:16vh;opacity:.48}.mountain-b{bottom:22vh;height:18vh;opacity:.72}.ground{position:absolute;left:50%;width:130vw;transform:translateX(-50%);border-radius:50% 50% 0 0}.ground-back{bottom:13vh;height:22vh;background:rgba(13,50,58,.44)}.ground-mid{bottom:4vh;height:25vh;background:linear-gradient(180deg,rgba(18,72,67,.76),rgba(5,25,31,.94))}.ground-front{bottom:-12vh;height:30vh;background:radial-gradient(ellipse at 50% 0%,rgba(71,201,147,.22),transparent 54%),linear-gradient(180deg,rgba(4,30,33,.98),#02070c)}.ground-grid{position:absolute;left:50%;bottom:-2vh;width:130vw;height:31vh;transform:translateX(-50%) rotateX(68deg);transform-origin:50% 100%;background-image:linear-gradient(rgba(134,239,172,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(134,239,172,.1) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(180deg,transparent,black 22%,transparent 92%);opacity:.52;animation:grid 10s linear infinite}.avatar{position:absolute;left:50%;bottom:14vh;z-index:6;width:154px;height:312px;transform:translateX(-50%);filter:drop-shadow(0 22px 34px rgba(0,0,0,.5));animation:avatar 5.2s ease-in-out infinite alternate}.avatar-aura{position:absolute;inset:18px -34px 0;border-radius:999px;background:radial-gradient(ellipse at 50% 22%,rgba(155,220,255,.26),rgba(167,139,250,.14),transparent 68%);filter:blur(16px)}.avatar-head{position:absolute;left:50%;top:6px;width:68px;height:68px;transform:translateX(-50%);border-radius:999px;background:radial-gradient(circle at 45% 28%,#fff,#dbeafe 38%,#6fa8dc 75%,#11223a);box-shadow:0 0 34px rgba(255,255,255,.72)}.avatar-torso{position:absolute;left:50%;top:78px;width:74px;height:126px;transform:translateX(-50%);border-radius:48px 48px 40px 40px;background:linear-gradient(180deg,rgba(226,246,255,.88),rgba(96,165,250,.3),rgba(8,26,44,.88));box-shadow:inset 0 0 28px rgba(255,255,255,.18)}.avatar-arm,.avatar-leg{position:absolute;border-radius:999px;background:linear-gradient(180deg,rgba(219,234,254,.58),rgba(15,42,66,.86))}.avatar-arm{top:94px;width:19px;height:102px}.avatar-arm-left{left:24px;transform:rotate(11deg)}.avatar-arm-right{right:24px;transform:rotate(-11deg)}.avatar-leg{top:194px;width:22px;height:94px}.avatar-leg-left{left:55px;transform:rotate(4deg)}.avatar-leg-right{right:55px;transform:rotate(-4deg)}.avatar-shadow{position:absolute;left:50%;bottom:0;width:190px;height:28px;transform:translateX(-50%);border-radius:999px;background:rgba(0,0,0,.58);filter:blur(12px)}.orb{position:absolute;left:50%;top:42%;z-index:8;width:clamp(92px,13vw,164px);height:clamp(92px,13vw,164px);transform:translate(-50%,-50%);border:1px solid rgba(230,248,255,.58);border-radius:999px;cursor:pointer;background:radial-gradient(circle at 34% 24%,#f8fcff 0 14%,#9ddcff 22%,#3175bd 58%,#102d60 100%);box-shadow:0 0 22px rgba(179,226,255,.95),0 0 78px rgba(83,175,255,.58),0 22px 120px rgba(134,239,172,.18);animation:orb 3.8s ease-in-out infinite alternate}.orb-core{position:absolute;inset:20%;border-radius:999px;background:radial-gradient(circle,#fff,rgba(255,255,255,.1));filter:blur(1px)}.orb-ring{position:absolute;inset:-22%;border-radius:999px;border:1px solid rgba(219,241,255,.22);animation:ring 5s linear infinite}.ring-b{inset:-38%;animation-duration:7s;animation-direction:reverse}.orb-beam{position:absolute;left:50%;top:42%;z-index:4;width:min(28vw,240px);height:52vh;transform:translateX(-50%);border-radius:999px;background:linear-gradient(180deg,rgba(155,220,255,.18),rgba(155,220,255,.04),transparent);filter:blur(18px);pointer-events:none}.camera-path{position:absolute;left:50%;z-index:5;pointer-events:none;border:1px solid rgba(219,241,255,.14);border-bottom:0;border-radius:999px 999px 0 0;transform:translateX(-50%);opacity:.42}.path-a{bottom:31vh;width:42vw;height:34vh}.path-b{bottom:33vh;width:22vw;height:45vh}.enter-label{position:absolute;left:50%;top:22%;z-index:9;transform:translateX(-50%);border:0;border-radius:999px;padding:8px 14px;background:rgba(7,14,28,.44);color:rgba(235,247,255,.78);cursor:pointer;font-size:11px;font-weight:800;letter-spacing:.16em;backdrop-filter:blur(12px)}.caption{position:absolute;left:50%;bottom:7vh;z-index:9;width:min(520px,calc(100vw - 40px));transform:translateX(-50%);margin:0;color:rgba(232,247,255,.76);text-align:center;font-size:14px;line-height:1.5}.dock{position:absolute;left:50%;bottom:max(20px,env(safe-area-inset-bottom));z-index:40;display:flex;gap:8px;transform:translateX(-50%);border:1px solid rgba(210,235,255,.16);border-radius:999px;padding:7px;background:rgba(0,0,0,.42);backdrop-filter:blur(16px)}.dock button{min-width:86px;border:1px solid rgba(214,238,255,.24);border-radius:999px;background:rgba(255,255,255,.1);color:white;cursor:pointer;font-weight:750;padding:9px 12px;font-size:12px}@keyframes sky-breathe{from{filter:brightness(.92)}to{filter:brightness(1.12)}}@keyframes aurora{from{transform:translateX(-4%) skewY(-7deg)}to{transform:translateX(4%) skewY(-4deg)}}@keyframes cloud{from{margin-left:-8vw}to{margin-left:8vw}}@keyframes twinkle{from{transform:scale(.8)}to{transform:scale(1.45)}}@keyframes grid{from{background-position:0 0}to{background-position:0 84px}}@keyframes avatar{from{transform:translateX(-50%) translateY(0) scale(1)}to{transform:translateX(-50%) translateY(-7px) scale(1.012)}}@keyframes orb{from{transform:translate(-50%,-54%) scale(.98)}to{transform:translate(-50%,-46%) scale(1.025)}}@keyframes ring{from{transform:rotate(0deg) scale(.96);opacity:.36}to{transform:rotate(360deg) scale(1.06);opacity:.1}}@media(max-width:760px){.enter-label{top:18%}.avatar{bottom:15vh;transform:translateX(-50%) scale(.78)}.orb{top:40%;width:92px;height:92px}.orb-beam{top:40%}.caption{bottom:10vh;font-size:13px}.ground-grid{height:26vh}.dock{max-width:calc(100vw - 24px);overflow-x:auto}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}}
      `}</style>
    </main>
  );
}
