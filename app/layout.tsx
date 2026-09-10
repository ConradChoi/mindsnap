import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import MobileShell from '@/components/layout/MobileShell'

const inter = Inter({ subsets: ['latin'] })

// viewport는 metadata와 별도 export로 분리해야 한다(Next 14 요구사항). 예전에는
// metadata.viewport와 <head>의 수동 <meta name="viewport"> 태그가 동시에 존재해서
// 두 개의 viewport 메타 태그가 충돌했고, 그 결과 maximum-scale/user-scalable이
// 제대로 적용되지 않아 iOS에서 입력창 포커스 시 화면이 확대되는 문제가 있었다.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'MindSnap',
  description: 'Capture your thoughts and ideas instantly',
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
      <head></head>
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
