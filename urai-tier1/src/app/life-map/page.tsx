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
      `}</style>
    </>
  )
}
