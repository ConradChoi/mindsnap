import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import MobileShell from '@/components/layout/MobileShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MindSnap',
  description: 'Capture your thoughts and ideas instantly',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/mipmap-mdpi-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/mipmap-hdpi-72.png', sizes: '72x72', type: 'image/png' },
      { url: '/mipmap-xhdpi-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/mipmap-xxhdpi-144.png', sizes: '144x144', type: 'image/png' },
      { url: '/mipmap-xxxhdpi-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/playstore-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
      { url: '/iphone-60@2x-120.png', sizes: '120x120', type: 'image/png' },
      { url: '/iphone-60@3x-180.png', sizes: '180x180', type: 'image/png' },
      { url: '/ipad-76.png', sizes: '76x76', type: 'image/png' },
      { url: '/ipad-76@2x-152.png', sizes: '152x152', type: 'image/png' },
      { url: '/ipadpro-83.5@2x-167.png', sizes: '167x167', type: 'image/png' },
      { url: '/appstore-1024.png', sizes: '1024x1024', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        {/* iOS safe area meta tag */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <MobileShell>
            {children}
          </MobileShell>
        </AuthProvider>
      </body>
    </html>
  )
}
