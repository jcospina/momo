import type { Metadata, Viewport } from 'next';
import { Bungee_Shade, Outfit } from 'next/font/google';

import { cn } from '@utils/cn';
import type { ReactNode } from 'react';
import DotGrid from '../ui/dot-grid/dot-grid';
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
    description: 'More Money, More Fun',
    url: '/',
    siteName: 'MoMo',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'MoMo',
    description: 'More Money, More Fun',
  },
  robots: {
    index: true,
    follow: false,
    googleBot: {
      index: true,
      follow: false,
      'max-image-preview': 'standard',
    },
  },
  category: 'finance',
  creator: 'Juan Ospina',
  publisher: 'Juan Ospina',
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
