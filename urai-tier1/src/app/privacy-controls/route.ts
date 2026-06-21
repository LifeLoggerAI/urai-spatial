export const dynamic = 'force-static'

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>URAI Passport Controls</title>
  <meta name="description" content="URAI privacy controls route connected to Passport identity, consent, access, and provenance controls." />
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 40px; color: #eef6ff; background: radial-gradient(circle at 20% 15%, rgba(125,211,252,.24), transparent 28rem), linear-gradient(150deg, #020617, #071126 52%, #0f172a); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    section { width: min(820px, 100%); border: 1px solid rgba(186,230,253,.28); border-radius: 32px; padding: clamp(24px, 5vw, 54px); background: rgba(2,6,23,.78); box-shadow: 0 30px 120px rgba(0,0,0,.52); }
    p.kicker { color: #67e8f9; letter-spacing: .18em; text-transform: uppercase; font-weight: 900; }
    h1 { font-size: clamp(2.3rem, 6vw, 5.4rem); line-height: .9; letter-spacing: -.07em; }
    p { color: rgba(238,246,255,.76); line-height: 1.6; }
    a { display: inline-flex; margin-top: 18px; border-radius: 999px; padding: 13px 18px; color: #02111d; background: linear-gradient(135deg, #a7f3d0, #67e8f9); font-weight: 900; text-decoration: none; }
  </style>
</head>
<body>
  <section>
    <p class="kicker">URAI Passport Controls</p>
    <h1>Privacy routes through Passport.</h1>
    <p>This legacy privacy-controls URL is connected to URAI Passport, the access, consent, identity, and provenance layer.</p>
    <a href="/passport">Open Passport</a>
  </section>
</body>
</html>`

export function GET() {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  })
}
