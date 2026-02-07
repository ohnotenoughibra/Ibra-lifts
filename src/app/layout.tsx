import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roots Gains - Science-Based Workout App for Martial Artists',
  description: 'Build strength and muscle with evidence-based programming designed for Roots Collective members. Featuring undulating periodization, gamification, and smart progression.',
  keywords: ['workout app', 'martial arts', 'BJJ', 'strength training', 'hypertrophy', 'periodization'],
  authors: [{ name: 'Roots Gains' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Roots Gains',
  },
  openGraph: {
    title: 'Roots Gains',
    description: 'Science-based workout programming for martial artists. Periodization, auto-progression, RPE tracking.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Roots Gains — Science-based workout app' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roots Gains',
    description: 'Science-based workout programming for martial artists.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
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
