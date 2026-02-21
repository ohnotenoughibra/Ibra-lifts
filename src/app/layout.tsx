import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roots Gains — Performance System for Combat Athletes',
  description: 'Periodized training, adaptive nutrition, recovery intelligence, and fight camp planning — built for grapplers, strikers, and combat sport athletes.',
  keywords: ['combat sports', 'martial arts', 'BJJ', 'MMA', 'strength training', 'periodization', 'fight camp', 'nutrition', 'weight cut'],
  authors: [{ name: 'Roots Gains' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Roots',
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Roots Gains',
    description: 'Performance system for combat athletes. Periodization, adaptive nutrition, recovery, fight camp.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Roots Gains — Performance system for combat athletes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roots Gains',
    description: 'Performance system for combat athletes.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-grappler-900 bg-mesh">
        <Providers>
          <div className="relative min-h-screen">
            {children}
          </div>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
