import RealLifeMapGalaxy from '@/components/lifemap/RealLifeMapGalaxy'

export const metadata = {
  title: 'URAI Life Map',
  description:
    'The URAI Spatial Life Map with a private memory galaxy, star selection, Focus, Replay, Mirror, Passport, and XR entry.',
}

export default function LifeMapPage() {
  return (
    <>
      <RealLifeMapGalaxy />
      <style>{`
        .lifeGalaxy .cosmicNoise {
          opacity: 0.055 !important;
          filter: blur(0.55px) !important;
        }
        .lifeGalaxy .galaxyDisc {
          background:
            radial-gradient(ellipse at 50% 50%, rgba(248,255,255,0.46), rgba(137,235,255,0.22) 10%, rgba(139,99,255,0.13) 30%, rgba(255,255,255,0.03) 51%, transparent 74%),
            radial-gradient(ellipse at 43% 52%, rgba(92,243,255,0.24), transparent 38%),
            radial-gradient(ellipse at 66% 44%, rgba(204,128,255,0.22), transparent 40%),
            radial-gradient(ellipse at 54% 63%, rgba(255,255,255,0.08), transparent 34%) !important;
          filter: blur(1.6px) saturate(1.08) !important;
          opacity: 0.76 !important;
        }
        .lifeGalaxy .selectedAura {
          width: 230px !important;
          height: 230px !important;
          opacity: 0.58 !important;
          filter: blur(13px) !important;
        }
        .lifeGalaxy .memoryStar.selected {
          transform: translate(-50%, -50%) translateZ(calc(var(--z) * 26px + 110px)) scale(1.08) !important;
        }
        .lifeGalaxy .memoryStar.selected .starLabel::after {
          content: 'Double click / Enter Focus';
          display: block;
          margin-top: 0.2rem;
          color: rgba(165, 243, 252, 0.92);
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .lifeGalaxy .titlePlate {
          width: min(300px, calc(100vw - 2rem)) !important;
          max-width: 300px !important;
          padding: 0.9rem 0.95rem !important;
        }
        .lifeGalaxy .titlePlate h1 {
          font-size: clamp(1.9rem, 3.2vw, 3.15rem) !important;
          line-height: 0.86 !important;
        }
        .lifeGalaxy .titlePlate span,
        .lifeGalaxy .controlPlate span {
          font-size: 0.76rem !important;
          line-height: 1.34 !important;
        }
        .lifeGalaxy .controlPlate {
          display: block !important;
          right: 1rem !important;
          bottom: 4.85rem !important;
          left: auto !important;
          width: min(360px, calc(100vw - 2rem)) !important;
          padding: 0.92rem !important;
          z-index: 60 !important;
        }
        .lifeGalaxy .controlPlate h2 {
          font-size: clamp(1.35rem, 2.15vw, 1.95rem) !important;
        }
        .lifeGalaxy .routeBar {
          z-index: 70 !important;
          bottom: 0.9rem !important;
          gap: 0.35rem !important;
        }
        .lifeGalaxy .routeBar a {
          display: inline-flex !important;
          padding: 0.48rem 0.72rem !important;
          font-size: 0.72rem !important;
        }
        @media (max-width: 760px) {
          .lifeGalaxy .titlePlate {
            width: min(232px, calc(100vw - 1rem)) !important;
            left: 0.5rem !important;
            top: 0.5rem !important;
            padding: 0.72rem !important;
          }
          .lifeGalaxy .titlePlate h1 {
            font-size: 1.55rem !important;
          }
          .lifeGalaxy .controlPlate {
            left: 50% !important;
            right: auto !important;
            bottom: 5.6rem !important;
            width: min(350px, calc(100vw - 1rem)) !important;
            transform: translateX(-50%) !important;
          }
          .lifeGalaxy .routeBar {
            bottom: 0.75rem !important;
            width: calc(100vw - 1rem) !important;
            justify-content: flex-start !important;
          }
        }
      `}</style>
    </>
  )
}
