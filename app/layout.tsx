import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "URAI",
  description: "URAI Spatial",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "black",
          overflow: "hidden",
          width: "100vw",
          height: "100vh",
        }}
      >
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  )
}
