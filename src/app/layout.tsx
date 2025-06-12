import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './fonts.css';
import './theme.css';
import { TagProvider } from '@/components/providers/TagProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { FilterProvider } from '@/components/providers/FilterProvider';
import AuthProvider from '@/components/providers/AuthProvider';

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
            <FilterProvider>
              <TagProvider>
                {children}
              </TagProvider>
            </FilterProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}