import './globals.css'
import { Inter } from 'next/font/google'
import CanvasRoot from '@/engine/CanvasRoot'
import SceneManager from '@/components/SceneManager'
import SceneSwitcher from '@/components/SceneSwitcher'
import type { Metadata, Viewport } from 'next'
import SafeModeProvider from './SafeModeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'URAI',
  description: 'A new world for your mind',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SafeModeProvider>
          <CanvasRoot>
            <SceneManager />
          </CanvasRoot>
          <div className="ui-layer">
            <SceneSwitcher />
            <main>{children}</main>
          </div>
        </SafeModeProvider>
      </body>
    </html>
  )
}
