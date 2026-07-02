const stations = [
  { tag: "ENTRY", title: "Reception desk", note: "New items arrive here before anything moves." },
  { tag: "CONSENT", title: "Privacy sanctuary", note: "Permissions, exports, boundaries, and model access stay visible." },
  { tag: "PRIORITY", title: "Work console", note: "Inbox, files, unfinished decisions, and timing route here first." },
  { tag: "RECOVERY", title: "Wellness corner", note: "Body signal, pressure, rhythm, and focus remain private context." },
  { tag: "MEANING", title: "Memory archive", note: "Objects connect to places, memories, relationships, and replay." },
  { tag: "ERRANDS", title: "Logistics bay", note: "Returns, deliveries, appointments, and home tasks wait for approval." },
];

const helpers = [
  "Privacy steward",
  "Schedule steward",
  "Wellness guide",
  "Memory archivist",
  "Logistics helper",
];

export default function GroundPage() {
  return (
    <main className="groundFinal" data-route="ground" aria-label="URAI Ground private operations floor">
      <div className="skyGlow" />
      <div className="floorGrid" />
      <div className="depthVignette" />

      <header className="topBar">
        <div className="brand">URAI GROUND</div>
        <div className="mode">Private operations floor · first-person camera</div>
      </header>

      <section className="heroCard">
        <p className="eyebrow">CAMERA DESCENDED</p>
        <h1>Your private floor is open.</h1>
        <p>
          Walk the room. Inspect real objects. Approve what helpers prepare.
          Nothing leaves your world without consent.
        </p>
      </section>

      <section className="room" aria-label="walkable private operations floor">
        <div className="roomBackWall">
          <div className="orbLens" />
          <div className="wallLabel">Private workforce preparing the day</div>
        </div>

        <div className="table tableOne">
          <span>Kitchen table</span>
        </div>
        <div className="table tableTwo">
          <span>Work surface</span>
        </div>
        <div className="vault">
          <span>Consent vault</span>
        </div>
        <div className="archiveCase">
          <span>Memory case</span>
        </div>

        {stations.map((station, index) => (
          <article className={`station station${index + 1}`} key={station.title}>
            <p>{station.tag}</p>
            <h2>{station.title}</h2>
            <span>{station.note}</span>
          </article>
        ))}

        {helpers.map((helper, index) => (
          <div className={`helper helper${index + 1}`} key={helper}>
            <i />
            <span>{helper}</span>
          </div>
        ))}

        <div className="centerReticle">
          <span />
        </div>
      </section>

      <aside className="rightCard">
        <p className="eyebrow">PRIVATE FLOOR</p>
        <h2>Helpers are preparing the day quietly.</h2>
        <p>
          Reception, privacy, work, wellness, memory, and logistics are arranged
          as places you can inspect before anything acts.
        </p>
        <a href="/spatial/ar-vr">Open XR entry</a>
      </aside>

      <footer className="navBar" aria-label="URAI route navigation">
        <a href="/home">Home</a>
        <a className="active" href="/ground">Ground</a>
        <a href="/life-map">Life Map</a>
        <a href="/focus?memoryId=quiet-reset">Focus</a>
        <a href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread">Replay</a>
        <a href="/mirror">Mirror</a>
        <a href="/passport">Passport</a>
        <a href="/spatial/ar-vr">XR</a>
      </footer>

      <style>{`
        .groundFinal {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          color: rgba(248, 250, 255, .96);
          background:
            radial-gradient(circle at 50% 4%, rgba(168, 220, 255, .18), transparent 30%),
            radial-gradient(circle at 10% 90%, rgba(106, 255, 213, .10), transparent 30%),
            linear-gradient(180deg, #071019 0%, #0d1419 42%, #060708 100%);
          isolation: isolate;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .skyGlow {
          position: absolute;
          inset: -20svh -10vw auto -10vw;
          height: 56svh;
          background:
            radial-gradient(circle at 50% 40%, rgba(110, 190, 255, .30), transparent 31%),
            radial-gradient(circle at 42% 55%, rgba(61, 255, 213, .16), transparent 23%),
            linear-gradient(180deg, rgba(255, 232, 184, .08), transparent);
          filter: blur(8px);
          z-index: 0;
        }

        .floorGrid {
          position: absolute;
          left: -18vw;
          right: -18vw;
          bottom: -9svh;
          height: 53svh;
          background:
            linear-gradient(180deg, rgba(255,255,255,.13), rgba(255,255,255,.025) 22%, transparent 72%),
            repeating-linear-gradient(90deg, rgba(255,255,255,.10) 0 1px, transparent 1px 88px),
            repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0 1px, transparent 1px 54px),
            radial-gradient(ellipse at 50% 0%, rgba(101, 180, 255, .28), transparent 58%);
          transform: perspective(900px) rotateX(61deg);
          transform-origin: 50% 0%;
          opacity: .74;
          z-index: 0;
        }

        .depthVignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 50%, transparent 0 42%, rgba(0,0,0,.46) 78%, rgba(0,0,0,.76)),
            linear-gradient(90deg, rgba(0,0,0,.42), transparent 20% 80%, rgba(0,0,0,.42));
          pointer-events: none;
          z-index: 3;
        }

        .topBar {
          position: relative;
          z-index: 5;
          margin: 1.15rem;
          width: fit-content;
          display: flex;
          gap: .85rem;
          align-items: center;
          padding: .72rem 1rem;
          border: 1px solid rgba(245, 224, 178, .28);
          border-radius: 999px;
          background: rgba(3, 6, 9, .72);
          box-shadow: 0 16px 70px rgba(0,0,0,.36);
          backdrop-filter: blur(18px);
        }

        .brand {
          font-size: .74rem;
          font-weight: 900;
          letter-spacing: .36em;
        }

        .mode {
          font-size: .78rem;
          font-weight: 800;
          opacity: .72;
        }

        .heroCard {
          position: absolute;
          z-index: 5;
          left: clamp(1rem, 3.4vw, 3.6rem);
          bottom: 8.5rem;
          width: min(360px, 34vw);
          padding: 1.35rem;
          border: 1px solid rgba(245, 224, 178, .20);
          border-radius: 1.6rem;
          background: linear-gradient(145deg, rgba(7, 11, 14, .78), rgba(20, 18, 13, .55));
          box-shadow: 0 28px 90px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.08);
          backdrop-filter: blur(18px);
        }

        .eyebrow {
          margin: 0 0 .45rem;
          color: #f3d99d;
          font-size: .7rem;
          letter-spacing: .24em;
          font-weight: 950;
        }

        .heroCard h1 {
          margin: 0 0 .85rem;
          max-width: 8ch;
          font-size: clamp(2.45rem, 5.6vw, 5.3rem);
          line-height: .82;
          letter-spacing: -.075em;
        }

        .heroCard p,
        .rightCard p {
          margin: 0;
          color: rgba(246, 249, 255, .78);
          font-size: .95rem;
          line-height: 1.45;
          font-weight: 750;
        }

        .room {
          position: absolute;
          z-index: 2;
          inset: 6.5rem 5vw 6.8rem 5vw;
          perspective: 1200px;
        }

        .roomBackWall {
          position: absolute;
          left: 50%;
          top: 5%;
          width: min(440px, 36vw);
          height: min(260px, 27svh);
          transform: translateX(-50%);
          border: 1px solid rgba(255, 221, 164, .19);
          border-radius: 2rem;
          background:
            radial-gradient(circle at 50% 47%, rgba(112, 180, 255, .35), transparent 28%),
            radial-gradient(circle at 32% 68%, rgba(58,255,215,.14), transparent 25%),
            linear-gradient(160deg, rgba(18, 36, 46, .62), rgba(11, 9, 8, .72));
          box-shadow: 0 38px 140px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.09);
          overflow: hidden;
        }

        .roomBackWall::before {
          content: "";
          position: absolute;
          inset: 23% 12% 0;
          background:
            radial-gradient(circle at 20% 54%, rgba(144, 255, 226, .28) 0 9px, transparent 10px),
            radial-gradient(circle at 50% 52%, rgba(144, 255, 226, .24) 0 9px, transparent 10px),
            radial-gradient(circle at 80% 54%, rgba(144, 255, 226, .24) 0 9px, transparent 10px),
            linear-gradient(90deg, transparent 19%, rgba(255,255,255,.12) 20%, transparent 21% 49%, rgba(255,255,255,.10) 50%, transparent 51% 79%, rgba(255,255,255,.10) 80%, transparent 81%),
            linear-gradient(180deg, transparent 36%, rgba(255,255,255,.09) 37%, transparent 38%);
          opacity: .8;
        }

        .orbLens {
          position: absolute;
          left: 50%;
          top: 47%;
          width: 92px;
          height: 92px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 50%, rgba(192, 214, 255, .95) 0 9px, rgba(103, 172, 255, .28) 10px 34px, transparent 35px),
            radial-gradient(circle, rgba(106, 232, 255, .22), transparent 70%);
          box-shadow: 0 0 70px rgba(105, 188, 255, .42);
        }

        .wallLabel {
          position: absolute;
          left: 1rem;
          bottom: 1rem;
          padding: .62rem .8rem;
          border-radius: .9rem;
          background: rgba(0,0,0,.46);
          color: rgba(255,255,255,.76);
          font-size: .72rem;
          font-weight: 850;
        }

        .station {
          position: absolute;
          width: 190px;
          padding: .88rem;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 1.2rem;
          background: linear-gradient(145deg, rgba(8, 14, 18, .72), rgba(17, 15, 10, .42));
          box-shadow: 0 20px 70px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.08);
          backdrop-filter: blur(14px);
        }

        .station p {
          margin: 0 0 .22rem;
          color: #f3d99d;
          font-size: .62rem;
          letter-spacing: .22em;
          font-weight: 950;
        }

        .station h2 {
          margin: 0 0 .35rem;
          font-size: .98rem;
          letter-spacing: -.025em;
        }

        .station span {
          display: block;
          color: rgba(246, 249, 255, .62);
          font-size: .73rem;
          line-height: 1.32;
          font-weight: 700;
        }

        .station1 { left: 42%; top: 1%; }
        .station2 { left: 8%; top: 27%; }
        .station3 { right: 8%; top: 32%; }
        .station4 { left: 23%; bottom: 9%; }
        .station5 { right: 18%; bottom: 8%; }
        .station6 { right: 3%; bottom: 28%; }

        .helper {
          position: absolute;
          display: flex;
          align-items: center;
          gap: .55rem;
          padding: .48rem .75rem;
          border: 1px solid rgba(126, 209, 255, .18);
          border-radius: 999px;
          background: rgba(5, 11, 15, .66);
          color: rgba(255,255,255,.76);
          font-size: .8rem;
          font-weight: 850;
          backdrop-filter: blur(12px);
        }

        .helper i {
          width: 25px;
          height: 25px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(105,220,255,.95), rgba(55,110,255,.18) 54%, transparent);
          box-shadow: 0 0 28px rgba(90,190,255,.44);
        }

        .helper1 { left: 41%; top: 55%; }
        .helper2 { left: 18%; bottom: 26%; }
        .helper3 { left: 34%; bottom: 18%; }
        .helper4 { right: 20%; bottom: 22%; }
        .helper5 { right: 8%; bottom: 41%; }

        .table,
        .vault,
        .archiveCase {
          position: absolute;
          border: 1px solid rgba(255,255,255,.11);
          background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
          box-shadow: 0 28px 90px rgba(0,0,0,.30);
          color: rgba(255,255,255,.64);
          font-size: .72rem;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .tableOne {
          left: 28%;
          bottom: 4%;
          width: 270px;
          height: 54px;
          border-radius: 999px;
          transform: perspective(600px) rotateX(62deg);
        }

        .tableTwo {
          right: 32%;
          bottom: 14%;
          width: 220px;
          height: 44px;
          border-radius: 999px;
          transform: perspective(600px) rotateX(62deg);
        }

        .vault {
          left: 11%;
          bottom: 3%;
          width: 98px;
          height: 76px;
          border-radius: 1.2rem;
        }

        .archiveCase {
          right: 8%;
          bottom: 9%;
          width: 130px;
          height: 80px;
          border-radius: 1.2rem;
        }

        .table span,
        .vault span,
        .archiveCase span {
          position: absolute;
          inset: auto .7rem .7rem;
        }

        .centerReticle {
          position: absolute;
          left: 50%;
          top: 47%;
          width: 54px;
          height: 54px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          border: 1px solid rgba(255, 229, 175, .22);
          box-shadow: 0 0 42px rgba(247, 209, 138, .15);
        }

        .centerReticle span {
          position: absolute;
          inset: 50% auto auto 50%;
          width: 1px;
          height: 92px;
          background: linear-gradient(180deg, rgba(255,222,158,.6), transparent);
          transform: translateX(-50%);
        }

        .rightCard {
          position: absolute;
          z-index: 5;
          right: clamp(1rem, 3.4vw, 3.6rem);
          bottom: 7.8rem;
          width: min(330px, 30vw);
          padding: 1.25rem;
          border: 1px solid rgba(245, 224, 178, .20);
          border-radius: 1.4rem;
          background: linear-gradient(145deg, rgba(9, 15, 18, .78), rgba(30, 22, 10, .48));
          box-shadow: 0 28px 90px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.08);
          backdrop-filter: blur(18px);
        }

        .rightCard h2 {
          margin: 0 0 .7rem;
          font-size: 1.1rem;
          line-height: 1.18;
        }

        .rightCard a {
          display: inline-flex;
          margin-top: 1rem;
          padding: .78rem 1rem;
          border-radius: 999px;
          background: #f1d394;
          color: #111;
          font-size: .82rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: .06em;
          text-decoration: none;
        }

        .navBar {
          position: fixed;
          z-index: 10;
          left: 50%;
          bottom: max(1rem, env(safe-area-inset-bottom));
          transform: translateX(-50%);
          display: flex;
          gap: .42rem;
          padding: .42rem;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          background: rgba(3, 5, 7, .78);
          box-shadow: 0 22px 70px rgba(0,0,0,.34);
          backdrop-filter: blur(18px);
        }

        .navBar a {
          padding: .72rem .92rem;
          border-radius: 999px;
          color: white;
          text-decoration: none;
          font-size: .78rem;
          font-weight: 950;
        }

        .navBar a.active {
          background: #f1d394;
          color: #111;
        }

        @media (max-width: 860px) {
          .groundFinal {
            min-height: 100svh;
            overflow-y: auto;
            padding-bottom: 7rem;
          }

          .topBar {
            margin: 1rem;
            max-width: calc(100vw - 2rem);
          }

          .mode {
            display: none;
          }

          .room {
            position: relative;
            inset: auto;
            height: 420px;
            margin: 5.4rem 1rem 1rem;
          }

          .roomBackWall {
            width: calc(100vw - 2rem);
            height: 210px;
            top: 0;
          }

          .heroCard {
            position: relative;
            left: auto;
            bottom: auto;
            width: auto;
            margin: 1rem;
          }

          .heroCard h1 {
            max-width: 9ch;
            font-size: 3.15rem;
          }

          .rightCard {
            position: relative;
            right: auto;
            bottom: auto;
            width: auto;
            margin: 1rem;
          }

          .station {
            width: 156px;
            padding: .72rem;
          }

          .station span {
            display: none;
          }

          .station1 { left: 48%; top: 48%; }
          .station2 { left: 2%; top: 49%; }
          .station3 { right: 2%; top: 58%; }
          .station4 { left: 4%; bottom: 6%; }
          .station5 { right: 4%; bottom: 4%; }
          .station6 { display: none; }

          .helper {
            font-size: .72rem;
            padding: .38rem .55rem;
          }

          .helper span {
            max-width: 78px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .helper1 { left: 34%; top: 42%; }
          .helper2 { left: 4%; bottom: 28%; }
          .helper3 { left: 38%; bottom: 22%; }
          .helper4 { right: 5%; bottom: 24%; }
          .helper5 { display: none; }

          .tableOne {
            left: 17%;
            width: 220px;
          }

          .tableTwo,
          .vault,
          .archiveCase {
            display: none;
          }

          .navBar {
            width: calc(100vw - 1rem);
            justify-content: flex-start;
            overflow-x: auto;
            border-radius: 1.25rem;
            transform: translateX(-50%);
          }

          .navBar a {
            flex: 0 0 auto;
          }
        }
      `}</style>
    </main>
  );
}
