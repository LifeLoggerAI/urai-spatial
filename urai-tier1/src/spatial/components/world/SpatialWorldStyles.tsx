export default function SpatialWorldStyles() {
  return (
    <style>{`
      .spatial-world-root{
        position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;overflow:hidden;
        background:
          radial-gradient(circle at 50% 18%,rgba(103,232,249,.16) 0%,rgba(16,24,64,.38) 26%,transparent 54%),
          radial-gradient(circle at 50% 78%,rgba(124,58,237,.18) 0%,transparent 44%),
          linear-gradient(180deg,#02030a 0%,#061026 44%,#01030a 100%);
        color:#eef6ff;isolation:isolate
      }
      .spatial-world-root:before{
        content:'';position:absolute;inset:-20%;z-index:1;pointer-events:none;
        background:
          radial-gradient(circle at 18% 24%,rgba(103,232,249,.12),transparent 22%),
          radial-gradient(circle at 78% 18%,rgba(167,139,250,.12),transparent 24%),
          radial-gradient(circle at 52% 50%,transparent 0 42%,rgba(255,255,255,.025) 43%,transparent 44%);
        opacity:.9;animation:uraiSpatialAtmosphereDrift 22s ease-in-out infinite alternate
      }
      .spatial-world-root:after{
        content:'';position:absolute;inset:0;z-index:2;pointer-events:none;
        background:linear-gradient(180deg,rgba(2,3,10,.72),transparent 18%,transparent 72%,rgba(2,3,10,.74));
        mix-blend-mode:multiply
      }
      .spatial-world-root[data-embed='true']{position:absolute}
      .spatial-world-root canvas{display:block;cursor:grab;position:relative;z-index:3}
      .spatial-world-root canvas:active{cursor:grabbing}
      .spatial-world-loading{position:absolute;inset:0;z-index:40;display:grid;place-items:center;background:#02030a;overflow:hidden}
      .spatial-world-loading:before{
        content:'';width:138px;height:138px;border-radius:999px;
        background:radial-gradient(circle at 34% 28%,#fff 0 7%,#dbeafe 8% 18%,#67e8f9 26%,#8b5cf6 56%,rgba(34,211,238,.1) 72%,transparent 100%);
        box-shadow:0 0 42px rgba(103,232,249,.58),0 0 120px rgba(139,92,246,.36),0 0 220px rgba(34,211,238,.16);
        animation:uraiSpatialLoaderPulse 2.4s ease-in-out infinite
      }
      .spatial-world-loading:after{
        content:'URAI Spatial World · loading assets';position:absolute;left:50%;top:calc(50% + 104px);transform:translateX(-50%);
        width:max-content;max-width:calc(100vw - 40px);letter-spacing:.2em;text-transform:uppercase;font-size:.68rem;color:rgba(226,246,255,.74)
      }
      .spatial-fallback-panel{position:absolute;left:50%;top:50%;z-index:45;width:min(430px,calc(100vw - 32px));transform:translate(-50%,-50%);padding:24px;border:1px solid rgba(142,220,255,.28);border-radius:28px;background:linear-gradient(150deg,rgba(5,12,30,.78),rgba(20,13,48,.7));box-shadow:0 30px 120px rgba(0,0,0,.45),0 0 80px rgba(103,232,249,.12);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      .spatial-fallback-panel__orb{width:74px;height:74px;border-radius:999px;background:radial-gradient(circle at 35% 28%,#fff,#dbeafe 22%,#8b5cf6 54%,#22d3ee 100%);box-shadow:0 0 42px rgba(103,232,249,.42);margin-bottom:16px}
      .spatial-fallback-panel__eyebrow,.spatial-hud__eyebrow{margin:0 0 8px;font-size:.68rem;letter-spacing:.22em;text-transform:uppercase;color:rgba(186,230,253,.82)}
      .spatial-fallback-panel h1{margin:0 0 10px;font-size:clamp(1.6rem,5vw,2.4rem);line-height:1}
      .spatial-fallback-panel p{margin:0 0 10px;color:rgba(235,244,255,.75);line-height:1.55}
      .spatial-fallback-panel__truth{font-size:.78rem;color:rgba(226,232,240,.58)!important}
      .spatial-hud{position:absolute;inset:0;z-index:20;pointer-events:none}
      .spatial-hud__top{
        position:absolute;left:22px;top:22px;width:min(330px,calc(100vw - 44px));padding:13px 15px;
        border:1px solid rgba(142,220,255,.16);border-radius:24px;
        background:linear-gradient(150deg,rgba(3,8,21,.34),rgba(12,10,32,.22));
        box-shadow:0 18px 70px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)
      }
      .spatial-hud__top .spatial-hud__eyebrow{font-size:0;margin:0 0 7px}
      .spatial-hud__top .spatial-hud__eyebrow:after{content:'URAI Spatial';font-size:.64rem;letter-spacing:.22em;text-transform:uppercase;color:rgba(186,230,253,.72)}
      .spatial-hud__top h1{margin:0 0 7px;font-size:0;line-height:1.02}
      .spatial-hud__top h1:after{content:'Living 3D memory field';font-size:clamp(1.12rem,2.6vw,1.72rem);font-weight:850;color:#f8fbff;text-shadow:0 0 28px rgba(103,232,249,.2)}
      .spatial-hud__top p{margin:0;color:transparent;font-size:0;line-height:1.45}
      .spatial-hud__top p:after{content:'Drag to orbit. Scroll through depth. Click a star to open its memory thread.';display:block;color:rgba(235,244,255,.66);font-size:.78rem;line-height:1.45}
      .spatial-hud__pill{display:inline-flex;margin-top:10px;padding:6px 10px;border:1px solid rgba(142,220,255,.16);border-radius:999px;background:rgba(103,232,249,.06);color:rgba(224,247,255,.76);font-size:0}
      .spatial-hud__pill:after{content:'Orbit · zoom · select';font-size:.66rem}
      .spatial-hud__detail{position:absolute;right:22px;bottom:24px;width:min(390px,calc(100vw - 44px));padding:18px 20px;border:1px solid rgba(142,220,255,.22);border-radius:28px;background:linear-gradient(150deg,rgba(3,8,21,.66),rgba(20,13,48,.52));box-shadow:0 28px 100px rgba(0,0,0,.38),0 0 70px rgba(103,232,249,.1);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);pointer-events:auto}
      .spatial-hud__detail h2{margin:0 0 8px;font-size:1.35rem}
      .spatial-hud__detail p{margin:0 0 10px;color:rgba(235,244,255,.74);line-height:1.5}
      .spatial-hud__meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
      .spatial-hud__meta span{border:1px solid rgba(142,220,255,.18);border-radius:999px;padding:5px 8px;background:rgba(255,255,255,.06);font-size:.72rem;color:rgba(226,239,255,.78)}
      .spatial-hud__actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
      .spatial-hud button,.memory-star-label,.orb-companion-button{border:1px solid rgba(142,220,255,.26);background:rgba(8,18,40,.52);color:#eef6ff;border-radius:999px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      .spatial-hud button{padding:8px 12px;pointer-events:auto}
      .spatial-hud button.primary{background:linear-gradient(135deg,rgba(103,232,249,.92),rgba(167,139,250,.88));color:#03101f;font-weight:800;box-shadow:0 0 34px rgba(103,232,249,.16)}
      .spatial-hud__companion{position:absolute;left:22px;bottom:24px;width:min(340px,calc(100vw - 44px));padding:13px 15px;border:1px solid rgba(142,220,255,.16);border-radius:22px;background:rgba(5,12,30,.34);box-shadow:0 20px 70px rgba(0,0,0,.22);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);color:rgba(235,244,255,.74);font-size:.82rem}
      .memory-star-label{padding:5px 8px;font-size:.68rem;white-space:nowrap;opacity:.92;box-shadow:0 8px 28px rgba(0,0,0,.28)}
      .orb-companion-button{width:58px;height:58px;border-radius:999px;box-shadow:0 0 34px rgba(103,232,249,.28);font-size:0;cursor:pointer}
      .orb-companion-button:after{content:'Orb';font-size:.62rem;color:rgba(235,244,255,.86)}
      .spatial-truth-strip{display:none}
      @keyframes uraiSpatialLoaderPulse{0%,100%{transform:scale(.96);filter:saturate(1)}50%{transform:scale(1.06);filter:saturate(1.4)}}
      @keyframes uraiSpatialAtmosphereDrift{0%{transform:translate3d(-1.5%,-1%,0) rotate(-1deg)}100%{transform:translate3d(1.5%,1%,0) rotate(1deg)}}
      @media(max-width:720px){.spatial-hud__top{left:14px;right:14px;top:14px;width:auto;padding:13px 14px}.spatial-hud__top p:after{font-size:.76rem}.spatial-hud__detail{left:14px;right:14px;bottom:52px;width:auto;padding:15px 16px}.spatial-hud__companion{display:none}.memory-star-label{display:none}}
      @media(prefers-reduced-motion:reduce){.spatial-world-root *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
    `}</style>
  )
}
