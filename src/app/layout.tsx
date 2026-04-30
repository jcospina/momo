import { NavigationProgressBar } from '@components/navigation-progress/navigation-progress-bar';
import { NavigationProgressProvider } from '@providers/navigation-progress-provider';
import { ThemeProvider } from '@providers/theme-provider';
import DotGrid from '@ui/dot-grid/dot-grid';
import { cn } from '@utils/cn';
import type { Metadata, Viewport } from 'next';
import { Bungee_Shade, Outfit } from 'next/font/google';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { themeAntiFlashScript } from '@/lib/theme/anti-flash-script';
import { generateThemeCSS } from '@/lib/theme/generate-css';
import { THEMES_CONFIG } from '@/lib/theme/themes.config';
import './globals.css';

const themeCSS = generateThemeCSS(THEMES_CONFIG);

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const ua = (await headers()).get('user-agent') || '';
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const messages = await getMessages();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeAntiFlashScript }} />
        <style
          id="momo-theme-overrides"
          dangerouslySetInnerHTML={{ __html: themeCSS }}
        />
      </head>
      <body
        className={cn('antialiased', outfit.className, bungeeShade.variable)}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <NavigationProgressProvider>
              <NavigationProgressBar />
              <DotGrid
                blastStrength={4}
                blastRadius={100}
                disableHover={isMobile}
              />
              <main
                style={{ position: 'relative', zIndex: 1 }}
                className="root"
              >
                {children}
              </main>
            </NavigationProgressProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
