import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Epilogue, Space_Grotesk, Inter } from 'next/font/google';
import Providers from '@/components/Providers';
import './globals.css';

// Editorial brutalism stack — declared in tailwind.config.ts but never loaded until now.
const epilogue = Epilogue({
  subsets: ['latin'],
  weight: ['400', '600', '800', '900'],
  variable: '--font-epilogue',
  display: 'swap',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://rootsgains.com'),
  title: 'Ibra Lifts — Performance System for Combat Athletes',
  description: 'Periodized training, adaptive nutrition, recovery intelligence, and fight camp planning — built for grapplers, strikers, and combat sport athletes.',
  keywords: ['combat sports', 'martial arts', 'BJJ', 'MMA', 'strength training', 'periodization', 'fight camp', 'nutrition', 'weight cut'],
  authors: [{ name: 'Ibra Lifts' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ibra Lifts',
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
    title: 'Ibra Lifts',
    description: 'Performance system for combat athletes. Periodization, adaptive nutrition, recovery, fight camp.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Ibra Lifts — Performance system for combat athletes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ibra Lifts',
    description: 'Performance system for combat athletes.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${epilogue.variable} ${spaceGrotesk.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-grappler-900 bg-mesh">
        {/* Viewport height JS fallback — runs before paint so there's no flash.
            Updates --app-h on resize/orientation change for browsers without dvh support. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            if(CSS.supports&&CSS.supports('min-height','100dvh'))return;
            function u(){document.documentElement.style.setProperty('--app-h',window.innerHeight+'px')}
            u();window.addEventListener('resize',u);
          })();
        ` }} />
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
