import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './fonts.css';
import './theme.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import AuthProvider from '@/components/providers/AuthProvider';
import { TagProvider } from '@/components/providers/TagProvider';
import { CardProvider } from '@/components/providers/CardProvider';
import AppShell from '@/components/common/AppShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'My Journal',
  description: 'A personal journal of life stories and memories',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0070f3" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <TagProvider>
              <CardProvider>
                <AppShell>
                  {children}
                </AppShell>
              </CardProvider>
            </TagProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}