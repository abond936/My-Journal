import type { Metadata } from 'next';
import './fonts.css';
import './theme.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import AuthProvider from '@/components/providers/AuthProvider';
import { TagProvider } from '@/components/providers/TagProvider';
import { CardProvider } from '@/components/providers/CardProvider';
import AppShell from '@/components/common/AppShell';
import {
  buildScopedThemeTokensCss,
  buildThemeTokensCss,
  getPersistedThemeDocumentFromJson,
  getResolvedScopedThemeDocument,
  normalizeThemeDocument,
  themeDataForCssGeneration,
} from '@/lib/services/themeService';

export const metadata: Metadata = {
  title: 'My Journal',
  description: 'A personal journal of life stories and memories',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let themeTokensCss = '';
  try {
    const themeDocument = await getResolvedScopedThemeDocument();
    themeTokensCss = [
      buildThemeTokensCss(
        themeDataForCssGeneration({
          ...themeDocument.reader.data,
          activePresetId: themeDocument.reader.activePresetId,
          recipes: themeDocument.reader.recipes,
        })
      ),
      buildScopedThemeTokensCss(themeDocument.admin, '.themeDraftAdminScope'),
    ].join('\n');
  } catch (e) {
    console.error('[theme] Failed to build theme tokens for layout:', e);
  }
  if (!themeTokensCss) {
    try {
      const fallbackDocument = normalizeThemeDocument(await getPersistedThemeDocumentFromJson());
      themeTokensCss = [
        buildThemeTokensCss(
          themeDataForCssGeneration({
            ...fallbackDocument.reader.data,
            activePresetId: fallbackDocument.reader.activePresetId,
            recipes: fallbackDocument.reader.recipes,
          })
        ),
        buildScopedThemeTokensCss(fallbackDocument.admin, '.themeDraftAdminScope'),
      ].join('\n');
    } catch (e) {
      console.error('[theme] Fallback theme-data.json build failed:', e);
    }
  }

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
        {themeTokensCss ? (
          <style
            id="theme-tokens"
            dangerouslySetInnerHTML={{
              __html: themeTokensCss,
            }}
          />
        ) : null}
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
