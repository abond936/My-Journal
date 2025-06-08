import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './fonts.css';
import './theme.css';
import { TagProvider } from '@/lib/contexts/TagContext';
import { ThemeProvider } from '@/components/common/ThemeProvider';

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
        <ThemeProvider>
          <TagProvider>
            {children}
          </TagProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}