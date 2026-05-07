'use client'

import { useRouter } from 'next/navigation'
import { DEMO_MEMORY_STARS } from '../spatial/demo/demoMemoryStars'

type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'mirror'

function SceneOverlayStyles() {
  return (
    <style>{`
      .urai-scene-stage{--scene-cyan:103 232 249;--scene-blue:80 150 255;--scene-violet:168 85 247;--panel-bg:8 18 40;--panel-border:160 220 255}.urai-scene-stage canvas{opacity:1!important;pointer-events:auto!important}.urai-visual-overlay{position:absolute!important;inset:0!important;z-index:30!important;pointer-events:none!important;overflow:hidden!important;isolation:isolate!important}.urai-visual-overlay:after{content:'';position:absolute;inset:0;z-index:22;pointer-events:none;background:radial-gradient(circle at 50% 49%,transparent 0 47%,rgba(0,0,0,.24) 100%),linear-gradient(180deg,rgba(1,3,12,0) 56%,rgba(1,3,12,.36) 100%)}.urai-sky-click-target{z-index:38!important}.urai-camera-reset,.urai-spatial-guidance,.urai-focus-action-panel,.tier-one-route-card,.urai-hud-layer{z-index:60!important}.urai-glass-panel,.urai-visual-caption,.urai-scene-status{border:1px solid rgba(var(--panel-border),.18);background:rgba(var(--panel-bg),.58);color:rgba(235,244,255,.9);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 12px 40px rgba(0,0,0,.22)}.urai-visual-caption,.urai-scene-status{position:absolute;z-index:35}.urai-visual-caption{left:24px;bottom:86px;display:grid;gap:4px;padding:12px 15px;border-radius:19px}.urai-visual-caption--right{left:auto;right:24px}.urai-visual-caption strong,.urai-scene-status strong{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#e0f7ff}.urai-visual-caption span,.urai-scene-status span:last-child{font-size:13px;line-height:1.25;color:rgba(235,244,255,.78)}.urai-visual-caption em{font-style:normal;font-size:12px;line-height:1.25;color:rgba(210,235,255,.6)}.urai-scene-status{left:50%;bottom:clamp(96px,14vh,148px);display:inline-flex;align-items:center;gap:10px;transform:translateX(-50%);padding:10px 14px;border-radius:999px}.urai-scene-status__dot{width:8px;height:8px;border-radius:999px;background:#67e8f9;box-shadow:0 0 18px rgba(103,232,249,.9)}
      .urai-spatial-guidance--home{position:fixed!important;left:50%!important;bottom:clamp(88px,15vh,150px)!important;transform:translateX(-50%)!important;display:inline-flex!important;align-items:center!important;gap:12px!important;min-width:min(92vw,350px)!important;justify-content:center!important;padding:12px 14px 12px 18px!important;border-radius:999px!important;border:1px solid rgba(var(--scene-cyan),.26)!important;background:rgba(8,18,40,.64)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 0 30px rgba(80,220,255,.16),0 18px 48px rgba(0,0,0,.24)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;color:white!important;pointer-events:auto!important}.urai-spatial-guidance--home>span:nth-of-type(2){font-size:13px!important;line-height:1.25!important;color:rgba(226,239,255,.78)!important}.urai-spatial-guidance--home button{min-height:40px!important;border:0!important;border-radius:999px!important;padding:0 18px!important;background:linear-gradient(135deg,rgba(224,247,255,.96),rgba(125,211,252,.82))!important;color:#051225!important;font-size:13px!important;font-weight:800!important;letter-spacing:.08em!important;text-transform:uppercase!important;box-shadow:0 0 24px rgba(103,232,249,.26)!important;cursor:pointer!important;transition:transform .25s ease,box-shadow .25s ease,background .25s ease!important}.urai-spatial-guidance--home:hover{border-color:rgba(var(--scene-cyan),.46)!important;background:rgba(8,18,40,.76)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 0 44px rgba(80,220,255,.24),0 20px 54px rgba(0,0,0,.28)!important}.urai-spatial-guidance--home button:hover{transform:translateY(-1px);box-shadow:0 0 34px rgba(103,232,249,.34)!important}.urai-spatial-guidance--home button:focus-visible,.urai-spatial-guidance--home:focus-within{outline:2px solid rgba(var(--scene-cyan),.58)!important;outline-offset:3px!important}.urai-spatial-guidance__pulse{width:8px!important;height:8px!important;flex:0 0 auto;border-radius:999px;background:#67e8f9;box-shadow:0 0 14px rgba(103,232,249,.92)}
      .urai-visual-overlay--home{background:linear-gradient(180deg,#315fb4 0%,#263f88 34%,#122653 68%,#07152d 100%)!important}.urai-visual-overlay--home:before,.urai-visual-overlay--life-map:before,.urai-visual-overlay--focus:before{content:'';position:absolute;inset:0;z-index:4;background-image:radial-gradient(2px 2px at 18% 28%,rgba(255,255,255,.78),transparent),radial-gradient(1px 1px at 34% 18%,rgba(255,255,255,.6),transparent),radial-gradient(2px 2px at 68% 26%,rgba(199,229,255,.78),transparent),radial-gradient(1px 1px at 82% 46%,rgba(255,255,255,.56),transparent),radial-gradient(1px 1px at 52% 36%,rgba(167,139,250,.72),transparent),radial-gradient(2px 2px at 73% 14%,rgba(255,255,255,.52),transparent),radial-gradient(1px 1px at 26% 44%,rgba(103,232,249,.56),transparent);opacity:.7;animation:uraiStarDrift 16s ease-in-out infinite}.urai-home-sky-layer,.urai-home-atmosphere,.urai-home-horizon-glow,.urai-home-horizon-line,.urai-home-horizon-mist,.urai-home-ground,.urai-home-ground-reflection,.urai-home-ground-vignette,.urai-home-orb,.urai-home-compass{position:absolute;z-index:2}.urai-home-sky-layer{inset:0 0 30% 0;background:radial-gradient(circle at 50% 42%,rgba(117,190,255,.3) 0%,rgba(70,120,210,.16) 18%,transparent 38%),radial-gradient(circle at 50% 28%,rgba(190,220,255,.22) 0%,rgba(110,170,255,.1) 15%,transparent 32%),linear-gradient(180deg,rgba(49,95,180,.78),rgba(18,38,83,.4) 68%,transparent 100%)}.urai-home-atmosphere{inset:0;z-index:5;background:radial-gradient(circle at 50% 50%,rgba(103,232,249,.16),transparent 25%),radial-gradient(circle at 45% 42%,rgba(255,255,255,.12),transparent 12%),radial-gradient(circle at 54% 57%,rgba(168,85,247,.13),transparent 28%),linear-gradient(180deg,rgba(255,255,255,.03),transparent 42%,rgba(103,232,249,.04) 65%,transparent 100%);mix-blend-mode:screen;animation:uraiAtmosphereBreathe 10s ease-in-out infinite}.urai-home-atmosphere:after{content:'';position:absolute;inset:0;opacity:.085;background-image:linear-gradient(115deg,rgba(255,255,255,.08) 0 1px,transparent 1px 5px),radial-gradient(circle at 20% 30%,rgba(255,255,255,.16),transparent 1px);background-size:7px 7px,5px 5px;mask-image:linear-gradient(180deg,rgba(0,0,0,.75),rgba(0,0,0,.28) 60%,transparent)}.urai-home-horizon-glow{left:0;right:0;top:61%;height:88px;background:linear-gradient(180deg,rgba(103,232,249,.3),rgba(103,232,249,.08) 36%,transparent 100%);filter:blur(18px);opacity:.72}.urai-home-horizon-line{left:8%;right:8%;top:62%;height:1px;border-radius:999px;background:linear-gradient(90deg,transparent,rgba(103,232,249,.66),rgba(180,220,255,.5),transparent);opacity:.72}.urai-home-horizon-mist{left:-10%;right:-10%;top:57%;height:18vh;background:radial-gradient(ellipse at 50% 62%,rgba(160,215,255,.18),transparent 62%);filter:blur(22px);opacity:.78}.urai-home-ground{inset-inline:-8%;bottom:-18%;height:42%;border-radius:50% 50% 0 0;background:radial-gradient(ellipse at 50% 0%,rgba(105,220,255,.42) 0%,rgba(65,120,190,.28) 28%,rgba(35,44,96,.74) 68%,rgba(12,17,44,1) 100%);filter:blur(.2px);box-shadow:0 -34px 120px rgba(103,232,249,.15)}.urai-home-ground-reflection{left:50%;top:68.5%;width:clamp(230px,27vw,340px);height:54px;transform:translateX(-50%);border-radius:999px;background:radial-gradient(ellipse,rgba(150,220,255,.34),rgba(100,110,255,.14) 45%,transparent 72%);filter:blur(18px);opacity:.9}.urai-home-ground-vignette{left:0;right:0;bottom:0;height:36%;z-index:6;background:linear-gradient(180deg,transparent,rgba(1,5,16,.2) 34%,rgba(1,5,16,.72) 100%)}.urai-home-cloud{position:absolute;z-index:7;height:18vh;border-radius:999px;filter:blur(32px);opacity:.34;background:rgba(174,219,255,.52);animation:uraiCloudFloat 12s ease-in-out infinite}.urai-home-cloud--one{width:58vw;left:-12vw;top:24vh}.urai-home-cloud--two{width:54vw;right:-10vw;top:33vh;background:rgba(184,164,255,.42);animation-delay:-2s}.urai-home-cloud--three{width:42vw;left:32vw;top:43vh;opacity:.24;background:rgba(103,232,249,.44);animation-delay:-4s}.urai-home-orb,.urai-focus-orb{position:absolute;left:50%;top:55%;width:clamp(170px,19vw,252px);aspect-ratio:1;transform:translate(-50%,-50%);z-index:12}.urai-home-orb__aura-outer,.urai-home-orb__aura-inner,.urai-home-orb__core,.urai-focus-orb__halo,.urai-focus-orb__ring,.urai-focus-orb__core{position:absolute;border-radius:999px}.urai-home-orb__aura-outer{inset:-50%;background:radial-gradient(circle,rgba(110,190,255,.18),rgba(100,120,255,.08) 42%,transparent 70%);filter:blur(12px);animation:uraiAuraDrift 9s ease-in-out infinite}.urai-home-orb__aura-inner{inset:-30%;border:1px solid rgba(103,232,249,.22);box-shadow:0 0 42px rgba(90,190,255,.18),inset 0 0 54px rgba(120,170,255,.14);opacity:.88}.urai-home-orb__core{inset:29%;background:radial-gradient(circle at 33% 28%,rgba(255,255,255,.95) 0%,rgba(230,210,255,.72) 10%,rgba(170,105,255,.84) 38%,rgba(80,155,255,.92) 76%,rgba(35,110,240,.96) 100%);box-shadow:inset -18px -22px 38px rgba(50,90,255,.35),inset 16px 14px 26px rgba(255,255,255,.16),0 0 38px rgba(146,105,255,.52),0 0 84px rgba(80,200,255,.3);animation:uraiOrbBreath 7s ease-in-out infinite}.urai-home-compass{left:18px;bottom:18px;z-index:38;display:inline-flex;align-items:center;gap:8px;min-width:34px;min-height:34px;border-radius:999px;border:1px solid rgba(var(--panel-border),.2);background:rgba(var(--panel-bg),.58);color:rgba(235,244,255,.88);font-size:12px;font-weight:800;letter-spacing:.1em;pointer-events:auto;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 12px 34px rgba(0,0,0,.22);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);cursor:default;transition:border-color .24s ease,background .24s ease,box-shadow .24s ease}.urai-home-compass span{display:none;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(226,239,255,.78)}.urai-home-compass:hover,.urai-home-compass:focus-visible{border-color:rgba(var(--scene-cyan),.45);background:rgba(var(--panel-bg),.72);box-shadow:0 0 30px rgba(103,232,249,.16),0 12px 34px rgba(0,0,0,.22);outline:none}.urai-home-compass:hover span,.urai-home-compass:focus-visible span{display:inline;padding-right:10px}
      .urai-visual-overlay--ascent{background:radial-gradient(circle at 50% 45%,rgba(103,232,249,.34),transparent 19%),radial-gradient(circle at 50% 56%,rgba(139,92,246,.42),transparent 42%),linear-gradient(180deg,#02051a 0%,#071126 64%,#010208 100%)}.urai-ascent-rift{position:absolute;left:50%;top:-15%;width:34vw;height:130%;transform:translateX(-50%) skewX(-8deg);background:linear-gradient(180deg,transparent,rgba(103,232,249,.28),rgba(167,139,250,.16),transparent);filter:blur(18px);animation:uraiRiftRise 2.4s ease-in-out infinite}.urai-ascent-tunnel{position:absolute;left:50%;top:48%;width:min(84vw,860px);aspect-ratio:1;transform:translate(-50%,-50%)}.urai-ascent-tunnel span{position:absolute;inset:12%;border:2px solid rgba(103,232,249,.34);border-radius:999px;box-shadow:0 0 46px rgba(103,232,249,.2),inset 0 0 46px rgba(139,92,246,.18);animation:uraiAscentRing 2.8s ease-in-out infinite}.urai-ascent-tunnel span:nth-child(2){inset:22%;animation-delay:.25s;border-color:rgba(167,139,250,.46)}.urai-ascent-tunnel span:nth-child(3){inset:33%;animation-delay:.5s;border-color:rgba(125,211,252,.48)}.urai-ascent-tunnel span:nth-child(4){inset:44%;animation-delay:.75s;border-color:rgba(255,255,255,.4)}.urai-ascent-tunnel span:nth-child(5){inset:4%;animation-delay:1s;border-color:rgba(103,232,249,.2)}.urai-ascent-portal-core{position:absolute;left:50%;top:48%;width:clamp(92px,11vw,144px);aspect-ratio:1;border-radius:999px;transform:translate(-50%,-50%);background:radial-gradient(circle,#fff,#67e8f9 22%,#8b5cf6 52%,transparent 74%);box-shadow:0 0 90px rgba(103,232,249,.72),0 0 220px rgba(139,92,246,.5)}.urai-ascent-stream{position:absolute;top:-10%;bottom:-10%;width:14%;background:linear-gradient(180deg,transparent,rgba(103,232,249,.3),transparent);filter:blur(18px);transform:skewX(-18deg)}.urai-ascent-stream--one{left:20%}.urai-ascent-stream--two{right:18%;background:linear-gradient(180deg,transparent,rgba(167,139,250,.28),transparent)}.urai-ascent-stream--three{left:48%;width:8%;opacity:.58}
      .urai-visual-overlay--life-map{background:radial-gradient(circle at 50% 48%,rgba(103,232,249,.24),transparent 20%),radial-gradient(circle at 34% 42%,rgba(139,92,246,.24),transparent 32%),radial-gradient(circle at 73% 60%,rgba(244,114,182,.18),transparent 26%),linear-gradient(180deg,#08112a 0%,#020817 100%)}.urai-life-map-nebula{position:absolute;inset:6% 8% 8%;z-index:2;border-radius:44px;background:radial-gradient(circle at 48% 44%,rgba(103,232,249,.38),transparent 16%),radial-gradient(circle at 24% 38%,rgba(139,92,246,.34),transparent 23%),radial-gradient(circle at 72% 60%,rgba(244,114,182,.24),transparent 24%),radial-gradient(circle at 50% 50%,rgba(255,255,255,.1),transparent 48%);box-shadow:inset 0 0 130px rgba(103,232,249,.1),0 0 90px rgba(139,92,246,.08)}.urai-life-map-paths{position:absolute;inset:0;z-index:3;width:100%;height:100%;overflow:visible}.urai-life-map-paths path{fill:none;stroke:rgba(125,211,252,.28);stroke-width:1.2;filter:drop-shadow(0 0 8px rgba(103,232,249,.25))}.urai-life-map-paths path:nth-child(2n){stroke:rgba(167,139,250,.26)}.urai-life-map-orbit{position:absolute;z-index:3;border:1px solid rgba(103,232,249,.2);border-radius:999px;transform:rotate(-12deg)}.urai-life-map-orbit--one{left:18%;top:18%;right:18%;bottom:18%}.urai-life-map-orbit--two{left:30%;top:9%;right:30%;bottom:9%;transform:rotate(22deg);border-color:rgba(167,139,250,.2)}.urai-life-map-orbit--three{left:12%;top:29%;right:12%;bottom:29%;transform:rotate(4deg);border-color:rgba(103,232,249,.16)}.urai-life-map-star-button{position:absolute;transform:translate(-50%,-50%);width:48px;height:48px;border:0;border-radius:999px;background:transparent;pointer-events:auto!important;cursor:pointer;z-index:40}.urai-life-map-star-button:before{content:'';position:absolute;left:50%;top:50%;width:var(--star-size);height:var(--star-size);transform:translate(-50%,-50%);border-radius:999px;background:#e0f7ff;box-shadow:0 0 22px rgba(103,232,249,.98),0 0 56px rgba(139,92,246,.62);animation:uraiStarPulse 2.4s ease-in-out infinite}.urai-life-map-star-button[data-tone=violet]:before{box-shadow:0 0 24px rgba(167,139,250,.98),0 0 62px rgba(103,232,249,.38)}.urai-life-map-star-button[data-tone=pink]:before{box-shadow:0 0 24px rgba(244,114,182,.9),0 0 62px rgba(103,232,249,.38)}.urai-life-map-star-button span{position:absolute;left:32px;top:8px;padding:5px 9px;border-radius:999px;background:rgba(3,7,18,.66);border:1px solid rgba(142,220,255,.28);color:rgba(235,244,255,.9);font-size:.64rem;white-space:nowrap;backdrop-filter:blur(10px)}.urai-life-map-star-button:hover:before,.urai-life-map-star-button:focus-visible:before{width:calc(var(--star-size) + 9px);height:calc(var(--star-size) + 9px);box-shadow:0 0 32px rgba(255,255,255,.96),0 0 82px rgba(103,232,249,.76)}.urai-life-map-star-button:focus-visible{outline:2px solid rgba(125,211,252,.92);outline-offset:2px}
      .urai-visual-overlay--focus{background:radial-gradient(circle at 50% 52%,rgba(200,215,255,.24),transparent 22%),radial-gradient(circle at 50% 52%,rgba(139,92,246,.2),transparent 42%),linear-gradient(180deg,#07122c 0%,#030817 100%)}.urai-focus-ripple{position:absolute;left:50%;top:52%;width:min(56vw,620px);aspect-ratio:1;transform:translate(-50%,-50%);border:1px solid rgba(103,232,249,.18);border-radius:999px;box-shadow:inset 0 0 70px rgba(139,92,246,.14),0 0 90px rgba(103,232,249,.12)}.urai-focus-ripple--two{width:min(38vw,420px);border-color:rgba(167,139,250,.22)}.urai-focus-ripple--three{width:min(20vw,230px);border-color:rgba(255,255,255,.18)}.urai-focus-orb{top:52%;width:clamp(190px,17vw,270px)}.urai-focus-orb__halo{inset:0;background:radial-gradient(circle,rgba(139,92,246,.78),rgba(103,232,249,.3) 42%,transparent 74%);filter:blur(9px);animation:uraiOrbBreath 3.2s ease-in-out infinite}.urai-focus-orb__ring{inset:-18%;border:1px solid rgba(103,232,249,.44);box-shadow:inset 0 0 38px rgba(139,92,246,.18),0 0 52px rgba(103,232,249,.22)}.urai-focus-orb__core{inset:28%;background:radial-gradient(circle at 35% 28%,#fff,#d6c7ff 22%,#8b5cf6 52%,#22d3ee 100%);box-shadow:0 0 86px rgba(139,92,246,.82),0 0 170px rgba(34,211,238,.36)}.urai-focus-memory-card{position:absolute;z-index:4;right:24px;bottom:170px;width:min(320px,calc(100vw - 48px));padding:16px 18px;border-radius:22px;border:1px solid rgba(142,220,255,.28);background:rgba(3,7,18,.6);backdrop-filter:blur(18px);box-shadow:0 22px 82px rgba(0,0,0,.32)}.urai-focus-memory-card strong{display:block;color:#e0f7ff;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase}.urai-focus-memory-card h2{margin:8px 0 6px;font-size:1.25rem}.urai-focus-memory-card p{margin:0;color:rgba(235,244,255,.74);font-size:.82rem;line-height:1.45}
      @keyframes uraiOrbBreath{0%,100%{transform:scale(1);filter:saturate(1)}50%{transform:scale(1.025);filter:saturate(1.08)}}@keyframes uraiAuraDrift{0%,100%{transform:scale(.98);opacity:.78}50%{transform:scale(1.05);opacity:1}}@keyframes uraiAtmosphereBreathe{0%,100%{opacity:.82;transform:translate3d(0,0,0)}50%{opacity:1;transform:translate3d(0,-.5vh,0)}}@keyframes uraiStarDrift{0%,100%{transform:translate3d(0,0,0);opacity:.66}50%{transform:translate3d(.35vw,-.2vh,0);opacity:.82}}@keyframes uraiAscentRing{0%,100%{transform:scale(.96);opacity:.55}50%{transform:scale(1.08);opacity:1}}@keyframes uraiStarPulse{0%,100%{transform:translate(-50%,-50%) scale(.92);opacity:.84}50%{transform:translate(-50%,-50%) scale(1.35);opacity:1}}@keyframes uraiCloudFloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(1.8vw,-1vh,0)}}@keyframes uraiRiftRise{0%,100%{opacity:.7;transform:translateX(-50%) skewX(-8deg) scaleY(.96)}50%{opacity:1;transform:translateX(-50%) skewX(-8deg) scaleY(1.04)}}@media(prefers-reduced-motion:reduce){.urai-home-cloud,.urai-home-orb__aura-outer,.urai-home-orb__core,.urai-focus-orb__halo,.urai-ascent-rift,.urai-ascent-tunnel span,.urai-life-map-star-button:before,.urai-home-atmosphere,.urai-visual-overlay--home:before{animation:none!important}.urai-spatial-guidance--home button,.urai-spatial-guidance--home{transition:none!important}}@media(max-width:640px){.urai-scene-status{display:none}.urai-spatial-guidance--home{bottom:92px!important;min-width:calc(100vw - 32px)!important;gap:9px!important;padding:11px 12px!important}.urai-spatial-guidance--home>span:nth-of-type(2){font-size:12px!important}.urai-spatial-guidance--home button{min-height:38px!important;padding:0 14px!important;font-size:12px!important}.urai-life-map-star-button span{display:none}.urai-visual-caption{left:14px;bottom:74px;padding:11px 13px}.urai-visual-caption--right{left:14px;right:auto}.urai-focus-memory-card{left:14px;right:14px;bottom:146px;width:auto}.urai-home-orb{width:clamp(156px,48vw,210px);top:54%}.urai-home-compass{left:14px;bottom:18px}.urai-home-compass span{display:none!important}}
    `}</style>
  )
}

function SceneStatus({ label, detail }: { label: string; detail: string }) {
  return <div className="urai-scene-status" aria-hidden="true"><span className="urai-scene-status__dot"/><strong>{label}</strong><span>{detail}</span></div>
}

function SkyLayer() {
  return <div className="urai-home-sky-layer" aria-hidden="true" />
}

function AtmosphereLayer() {
  return (
    <>
      <div className="urai-home-atmosphere" aria-hidden="true" />
      <div className="urai-home-cloud urai-home-cloud--one" aria-hidden="true" />
      <div className="urai-home-cloud urai-home-cloud--two" aria-hidden="true" />
      <div className="urai-home-cloud urai-home-cloud--three" aria-hidden="true" />
    </>
  )
}

function HorizonLayer() {
  return (
    <>
      <div className="urai-home-horizon-mist" aria-hidden="true" />
      <div className="urai-home-horizon-glow" aria-hidden="true" />
      <div className="urai-home-horizon-line" aria-hidden="true" />
    </>
  )
}

function GroundLayer() {
  return (
    <>
      <div className="urai-home-ground" aria-hidden="true" />
      <div className="urai-home-ground-reflection" aria-hidden="true" />
      <div className="urai-home-ground-vignette" aria-hidden="true" />
    </>
  )
}

function Orb() {
  return (
    <div className="urai-home-orb" data-testid="urai-orb-button" aria-hidden="true">
      <div className="urai-home-orb__aura-outer" />
      <div className="urai-home-orb__aura-inner" />
      <div className="urai-home-orb__core" />
    </div>
  )
}

function InnerWeatherCard() {
  return (
    <div className="urai-visual-caption urai-glass-panel" aria-hidden="true">
      <strong>Inner Weather</strong>
      <span>Your companion is listening</span>
      <em>Still · receptive · clear</em>
    </div>
  )
}

function CompassButton() {
  return <button type="button" className="urai-home-compass" aria-label="Spatial orientation: north" title="Spatial orientation: north">N<span>North</span></button>
}

function LifeMapOverlay() {
  const router = useRouter()
  return (
    <div className="urai-visual-overlay urai-visual-overlay--life-map" data-visual-layer="life-map" data-testid="urai-lifemap-scene">
      <SceneOverlayStyles />
      <div className="urai-life-map-nebula" data-testid="lifemap-starfield" aria-hidden="true" />
      <div className="urai-life-map-orbit urai-life-map-orbit--one" aria-hidden="true" />
      <div className="urai-life-map-orbit urai-life-map-orbit--two" aria-hidden="true" />
      <div className="urai-life-map-orbit urai-life-map-orbit--three" aria-hidden="true" />
      <svg className="urai-life-map-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M18 33 C26 24 35 28 45 36 S56 48 61 52" />
        <path d="M31 59 C38 49 50 48 61 52 S75 55 84 66" />
        <path d="M45 36 C54 24 66 20 76 28" />
        <path d="M40 75 C46 64 53 56 61 52" />
        <path d="M18 33 C20 49 28 58 40 75" />
      </svg>
      {DEMO_MEMORY_STARS.map((star, index) => (
        <button key={star.manifestId} type="button" className="urai-life-map-star-button" data-tone={star.tone} data-testid={`lifemap-node-${star.manifestId}`} style={{ left: star.left, top: star.top, ['--star-size' as string]: star.size, animationDelay: `${index * 0.18}s` }} aria-label={`Open ${star.label}`} onClick={() => router.push(`/focus?manifestId=${encodeURIComponent(star.manifestId)}`)}>
          <span>{star.label}</span>
        </button>
      ))}
      <div className="urai-visual-caption urai-visual-caption--right" aria-hidden="true"><strong>Life Map</strong><span>Remembered moments are visible</span></div>
      <SceneStatus label="Constellation awake" detail="Choose a star to open Focus" />
    </div>
  )
}

function HomeOverlay() {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--home" data-visual-layer="home" data-testid="urai-home-scene">
      <SceneOverlayStyles />
      <SkyLayer />
      <AtmosphereLayer />
      <HorizonLayer />
      <GroundLayer />
      <Orb />
      <InnerWeatherCard />
      <CompassButton />
      <SceneStatus label="Home awake" detail="Begin the ascent when you are ready" />
    </div>
  )
}

function AscentOverlay() {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--ascent" aria-hidden="true" data-visual-layer="ascent" data-testid="urai-ascent-scene">
      <SceneOverlayStyles />
      <div className="urai-ascent-rift"/><div className="urai-ascent-tunnel"><span/><span/><span/><span/><span/></div><div className="urai-ascent-stream urai-ascent-stream--one"/><div className="urai-ascent-stream urai-ascent-stream--two"/><div className="urai-ascent-stream urai-ascent-stream--three"/><div className="urai-ascent-portal-core"/>
      <div className="urai-visual-caption urai-visual-caption--right"><strong>Ascent</strong><span>Passing from sky into constellation</span></div>
      <SceneStatus label="Ascent active" detail="The Life Map is opening" />
    </div>
  )
}

function FocusOverlay({ replay = false }: { replay?: boolean }) {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--focus" data-visual-layer={replay ? 'replay' : 'focus'} data-testid="urai-focus-scene">
      <SceneOverlayStyles />
      <div className="urai-focus-ripple" aria-hidden="true"/><div className="urai-focus-ripple urai-focus-ripple--two" aria-hidden="true"/><div className="urai-focus-ripple urai-focus-ripple--three" aria-hidden="true"/>
      <div className="urai-focus-orb"><div className="urai-focus-orb__halo"/><div className="urai-focus-orb__ring"/><div className="urai-focus-orb__core"/></div>
      <div className="urai-focus-memory-card" aria-hidden="true"><strong>{replay ? 'Replay Stream' : 'Memory Star'}</strong><h2>{replay ? 'Atmosphere in motion' : 'Opened gently'}</h2><p>{replay ? 'Tone, recovery, and pattern layers animate without leaving the memory context.' : 'A selected star stays readable even when private data is still syncing.'}</p></div>
      <SceneStatus label={replay ? 'Replay ready' : 'Focus ready'} detail={replay ? 'ESC unwinds to focus' : 'Begin replay when ready'} />
    </div>
  )
}

export default function SpatialVisualOverlay({ mode }: { mode: SceneMode }) {
  if (mode === 'home') return <HomeOverlay />
  if (mode === 'ascent') return <AscentOverlay />
  if (mode === 'life-map' || mode === 'demo') return <LifeMapOverlay />
  if (mode === 'focus') return <FocusOverlay />
  if (mode === 'replay') return <FocusOverlay replay />
  return null
}
