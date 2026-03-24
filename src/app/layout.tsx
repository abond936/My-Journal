import type { Metadata } from 'next';
import './fonts.css';
import './theme.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import AuthProvider from '@/components/providers/AuthProvider';
import { TagProvider } from '@/components/providers/TagProvider';
import { CardProvider } from '@/components/providers/CardProvider';
import AppShell from '@/components/common/AppShell';

export const metadata: Metadata = {
  title: 'My Journal',
  description: 'A personal journal of life stories and memories',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0070f3" />
        <meta name="pinterest" content="nopin" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
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