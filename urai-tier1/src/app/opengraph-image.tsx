import { ImageResponse } from 'next/og'

export const alt = 'URAI Labs — URAI, created by Adam Clamp'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          color: '#f7f9ff',
          background:
            'radial-gradient(circle at 78% 18%, rgba(151, 118, 255, 0.42), transparent 34%), radial-gradient(circle at 18% 20%, rgba(91, 178, 255, 0.32), transparent 36%), linear-gradient(145deg, #060914 0%, #111a3b 52%, #090d18 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 82,
            right: 118,
            display: 'flex',
            width: 154,
            height: 154,
            border: '2px solid rgba(255,255,255,0.44)',
            borderRadius: 999,
            background:
              'radial-gradient(circle at 34% 28%, #ffffff 0%, #dce8ff 18%, #8fb3ff 54%, rgba(199,146,255,0.18) 100%)',
            boxShadow: '0 0 90px rgba(143,179,255,0.48)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '70px 82px 64px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 25,
              fontWeight: 800,
              letterSpacing: 7,
            }}
          >
            URAI LABS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 880 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 74,
                fontWeight: 850,
                lineHeight: 0.98,
                letterSpacing: -4,
              }}
            >
              Own your life.
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 10,
                fontSize: 74,
                fontWeight: 850,
                lineHeight: 0.98,
                letterSpacing: -4,
              }}
            >
              Step inside yourself.
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 32,
                color: '#b7c3e5',
                fontSize: 28,
              }}
            >
              URAI was created by Adam Clamp.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#90b8ff',
              fontSize: 22,
              fontWeight: 750,
              letterSpacing: 1,
            }}
          >
            <span>URAI.APP</span>
            <span>MEMORY · REFLECTION · OWNERSHIP</span>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
