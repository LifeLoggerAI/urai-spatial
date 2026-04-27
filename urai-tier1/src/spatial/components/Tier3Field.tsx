"use client";

export function Tier3Field({ phase }: { phase: string }) {
  return (
    <div className={`t3 t3-${phase}`}>
      <div className="vignette"/>
      <div className="breath"/>
      <div className="dust d1"/>
      <div className="dust d2"/>
      <div className="dust d3"/>
      <style jsx>{`
        .t3 {
          position:absolute; inset:0;
          pointer-events:none;
          mix-blend-mode:screen;
          transition:opacity 900ms ease;
        }

        .vignette {
          position:absolute; inset:-10%;
          background:
            radial-gradient(circle at 50% 50%, rgba(160,90,255,0.12), transparent 30%),
            radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%);
          transition:opacity 900ms ease;
        }

        .breath {
          position:absolute; left:50%; top:50%;
          width:40vmin; height:40vmin;
          transform:translate(-50%,-50%);
          border-radius:999px;
          background:radial-gradient(circle, rgba(180,120,255,0.2), transparent 70%);
          filter:blur(20px);
          animation:breath 6s ease-in-out infinite;
        }

        .dust {
          position:absolute; inset:0;
          background-image:
            radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 2px);
          background-size: 120px 120px, 170px 170px;
background-position: 0 0, 37px 83px;
          opacity:0.2;
          animation:drift 30s linear infinite;
        }

        .d2 { opacity:0.12; animation-duration:45s; }
        .d3 { opacity:0.08; animation-duration:60s; }

        .t3-HOME {
  opacity: 0.4;
  transition: opacity 1400ms ease;
}
        .t3-ASCENT {
  opacity: 0.65;
  animation: ascentPulse 4s ease-in-out infinite;
}
        .t3-LIFEMAP { opacity:0.6; }
        .t3-FOCUS { opacity:0.85; }
        .t3-REPLAY {
  opacity: 1;
  animation: replayHold 6s ease-in-out infinite;
}

        @keyframes ascentPulse {
          0%,100% { opacity: 0.6; }
          50% { opacity: 0.75; }
        }

        @keyframes replayHold {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        @keyframes breath {
          0%,100% { transform:translate(-50%,-50%) scale(1); }
          50% { transform:translate(-50%,-50%) scale(1.08); }
        }

        @keyframes drift {
          from { transform:translate(0,0); }
          to { transform:translate(-5%, -8%); }
        }
      `}</style>
    </div>
  );
}

