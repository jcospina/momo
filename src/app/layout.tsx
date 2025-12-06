import type { Metadata, Viewport } from 'next';
import { Bungee_Shade, Outfit } from 'next/font/google';

import { cn } from '@utils/cn';
import type { ReactNode } from 'react';
import DotGrid from '../components/dot-grid/dot-grid';
import './globals.css';

const metadataBase =
  process.env.NEXT_PUBLIC_SITE_URL &&
  (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SITE_URL);
    } catch {
      return undefined;
    }
  })();

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const bungeeShade = Bungee_Shade({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-logo',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: 'MoMo',
    template: '%s | MoMo',
  },
  applicationName: 'MoMo',
  description: 'Personal finances made easy.',
  keywords: [
    'MoMo',
    'personal finance',
    'budgeting',
    'savings',
    'spending tracker',
    'cash flow',
    'financial wellness',
  ],
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'MoMo',
    description: 'Personal finances made easy.',
    url: '/',
    siteName: 'MoMo',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoMo',
    description: 'Personal finances made easy.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  category: 'finance',
  creator: 'MoMo',
  publisher: 'MoMo',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf8ef' },
    { media: '(prefers-color-scheme: dark)', color: '#001f29' },
  ],
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn('antialiased', outfit.className, bungeeShade.variable)}
      >
        <DotGrid blastStrength={4} blastRadius={100} />
        <main style={{ position: 'relative', zIndex: 1 }}>{children}</main>
      </body>
    </html>
  );
}
