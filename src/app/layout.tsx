import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grappler Gains - Science-Based Workout App for Combat Athletes',
  description: 'Build strength and muscle with evidence-based programming designed for grapplers. Featuring undulating periodization, gamification, and smart progression.',
  keywords: ['workout app', 'grappling', 'BJJ', 'strength training', 'hypertrophy', 'periodization'],
  authors: [{ name: 'Grappler Gains' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Grappler Gains',
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
        <div className="relative min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
