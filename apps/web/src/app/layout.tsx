import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MainLayout } from '@/components/layout/MainLayout'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: 'Atlas Financial - Brutal Honesty Personal Finance',
  description: 'A brutally honest personal finance platform that tells you the truth about your money.',
  keywords: ['personal finance', 'budgeting', 'financial planning', 'brutal honesty', 'money management', 'mobile banking', 'financial dashboard'],
  authors: [{ name: 'Atlas Financial Team' }],
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
    { media: '(prefers-color-scheme: dark)', color: '#0284c7' }
  ],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Atlas Financial',
    startupImage: [
      {
        url: '/apple-splash-2048-2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/apple-splash-1668-2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/apple-splash-1536-2048.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/apple-splash-1125-2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/apple-splash-1242-2688.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/apple-splash-828-1792.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/apple-splash-1242-2208.png',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/apple-splash-750-1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://atlas-financial.com',
    title: 'Atlas Financial - Brutal Honesty Personal Finance',
    description: 'A brutally honest personal finance platform that tells you the truth about your money.',
    siteName: 'Atlas Financial',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Atlas Financial Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Atlas Financial - Brutal Honesty Personal Finance',
    description: 'A brutally honest personal finance platform that tells you the truth about your money.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
    { media: '(prefers-color-scheme: dark)', color: '#0284c7' }
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Critical resource hints for mobile performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//api.atlas-financial.com" />

        {/* Critical CSS for above-the-fold content */}
        <style dangerouslySetInnerHTML={{
          __html: `
            body {
              margin: 0;
              font-family: 'Inter', system-ui, sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeLegibility;
            }
            .loading-fallback {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            }
            .loading-spinner {
              width: 40px;
              height: 40px;
              border: 3px solid #e5e7eb;
              border-top: 3px solid #0ea5e9;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @media (prefers-reduced-motion: reduce) {
              .loading-spinner {
                animation: none;
              }
            }
          `
        }} />
      </head>
      <body className={`${inter.className} min-h-screen-mobile`}>
        <noscript>
          <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-center">
            Atlas Financial requires JavaScript to function properly. Please enable JavaScript in your browser.
          </div>
        </noscript>

        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  )
}
