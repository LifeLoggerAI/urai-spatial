export const metadata = {
  title: 'URAI Spatial',
  description: 'Personal Intelligence OS'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#000',
          overflow: 'hidden',
          height: '100vh',
          width: '100vw'
        }}
      >
        {children}
      </body>
    </html>
  )
}
