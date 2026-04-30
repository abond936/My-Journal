process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID = 'test-project-id';
process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = 'test-private-key';
process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL = 'test@example.com';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
  },
  getFirestore: jest.fn(),
}));

import baseTheme from '../../../../theme-data.json';
import { buildScopedDraftThemeCss, buildThemeTokensCss, normalizeThemeDocument, toPersistedThemeDocument } from '@/lib/services/themeService';
import { normalizeReaderThemeRecipes } from '@/lib/theme/readerThemeSystem';
import { getAdminPresetSettings, getReaderPresetSettings } from '@/lib/theme/themePresets';
import type { ReaderThemeRecipes, ThemeRecipeTokenRef } from '@/lib/types/theme';

describe('theme compiler canaries', () => {
  const getReaderTheme = () => normalizeThemeDocument(baseTheme).reader;

  it('normalizes legacy shared roles into the current support and overlay roles', () => {
    const normalized = normalizeReaderThemeRecipes({
      typography: {
        chromeLabel: {
          family: 'font-family/serif1',
          size: 'font-size/sm',
          weight: 'font-weight/medium',
          lineHeight: 'line-height/base',
          color: 'semantic/reader/tonal-text-primary',
        },
      },
      controls: {
        chromeFilterChip: {
          background: 'palette/4',
          text: 'semantic/reader/contrast-on-fill-text',
          border: 'palette/4',
          hoverBackground: 'palette/3',
        },
      },
      overlays: {
        cardStrong: {
          background: 'semantic/reader/overlay-scrim-strong',
          text: 'semantic/reader/overlay-contrast-text',
          border: 'semantic/reader/overlay-border',
        },
      },
    } as unknown as Partial<ReaderThemeRecipes>);

    expect(normalized?.typography?.supportLabel?.family).toBe('font-family/serif1');
    expect(normalized?.typography?.chromeText?.family).toBe('font-family/serif1');
    expect(normalized?.controls?.supportChip?.background).toBe('palette/4');
    expect(normalized?.overlays?.galleryOverlay?.background).toBe('semantic/reader/overlay-scrim-strong');
    expect(normalized?.overlays?.lightboxBackdrop?.background).toBe('semantic/reader/overlay-scrim-strong');
  });

  it('keeps explicit current roles ahead of legacy aliases during normalization', () => {
    const normalized = normalizeReaderThemeRecipes({
      typography: {
        supportLabel: {
          family: 'font-family/sans1',
          size: 'font-size/base',
          weight: 'font-weight/semibold',
          lineHeight: 'line-height/base',
          color: 'palette/3',
        },
        chromeLabel: {
          family: 'font-family/serif1',
          size: 'font-size/sm',
          weight: 'font-weight/medium',
          lineHeight: 'line-height/base',
          color: 'palette/4',
        },
      },
      controls: {
        supportControl: {
          background: 'layout/background2Color',
          text: 'semantic/reader/tonal-text-primary',
          border: 'layout/border2Color',
          hoverBackground: 'layout/background1Color',
        },
        fieldControl: {
          background: 'palette/5',
          text: 'semantic/reader/contrast-on-fill-text',
          border: 'palette/5',
          hoverBackground: 'palette/4',
        },
      },
      overlays: {
        lightboxBackdrop: {
          background: 'semantic/reader/overlay-scrim',
          text: 'semantic/reader/overlay-contrast-text',
          border: 'semantic/reader/overlay-border',
        },
        cardStrong: {
          background: 'gradient/bottomOverlayStrong',
          text: 'semantic/reader/overlay-contrast-text',
          border: 'semantic/reader/overlay-border',
        },
      },
    } as Partial<ReaderThemeRecipes>);

    expect(normalized?.typography?.supportLabel?.family).toBe('font-family/sans1');
    expect(normalized?.typography?.supportLabel?.color).toBe('palette/3');
    expect(normalized?.controls?.supportControl?.background).toBe('layout/background2Color');
    expect(normalized?.controls?.supportControl?.border).toBe('layout/border2Color');
    expect(normalized?.overlays?.lightboxBackdrop?.background).toBe('semantic/reader/overlay-scrim');
  });

  it('emits separate covered fade, gallery overlay, and lightbox backdrop roles', () => {
    const reader = getReaderTheme();
    const recipes = {
      ...reader.recipes,
      overlays: {
        ...reader.recipes?.overlays,
        coveredFade: {
          background: 'gradient/bottomOverlayStrong' as ThemeRecipeTokenRef,
          text: 'semantic/reader/overlay-contrast-text' as ThemeRecipeTokenRef,
          border: 'semantic/reader/overlay-border' as ThemeRecipeTokenRef,
        },
        galleryOverlay: {
          background: 'semantic/reader/overlay-scrim-strong' as ThemeRecipeTokenRef,
          text: 'semantic/reader/overlay-contrast-text' as ThemeRecipeTokenRef,
          border: 'semantic/reader/overlay-border' as ThemeRecipeTokenRef,
        },
        lightboxBackdrop: {
          background: 'semantic/reader/overlay-scrim' as ThemeRecipeTokenRef,
          text: 'semantic/reader/overlay-contrast-text' as ThemeRecipeTokenRef,
          border: 'semantic/reader/overlay-border' as ThemeRecipeTokenRef,
        },
      },
    } as ReaderThemeRecipes;

    const css = buildThemeTokensCss({
      ...reader.data,
      activePresetId: reader.activePresetId,
      recipes,
    });

    expect(css).toContain('--reader-covered-fade-background: linear-gradient(transparent, rgba(0,0,0,0.9));');
    expect(css).toContain('--reader-gallery-overlay-background: var(--reader-overlay-strong-scrim-color);');
    expect(css).toContain('--reader-lightbox-overlay-background-color: var(--reader-overlay-scrim-color);');
    expect(css).toContain('--reader-card-badge-background-color: var(--reader-overlay-strong-scrim-color);');
  });

  it('uses adaptive covered fades by default and overrides their strength in dark mode', () => {
    const reader = getReaderTheme();

    const css = buildThemeTokensCss({
      ...reader.data,
      activePresetId: reader.activePresetId,
      recipes: reader.recipes,
    });

    expect(css).toContain('--reader-covered-fade-background: var(--reader-covered-fade-adaptive-background);');
    expect(css).toContain('--reader-covered-fade-adaptive-background: linear-gradient(to top, rgb(0 0 0 / var(--reader-covered-fade-bottom-opacity)) 0%, rgb(0 0 0 / var(--reader-covered-fade-mid-opacity)) 38%, rgb(0 0 0 / var(--reader-covered-fade-top-opacity)) 68%, transparent 100%);');
    expect(css).toContain("--reader-covered-fade-bottom-opacity: 0.74;");
    expect(css).toContain("--reader-covered-fade-strong-bottom-opacity: 0.9;");
    expect(css).toContain('[data-theme="dark"] {');
    expect(css).toContain("--reader-covered-fade-bottom-opacity: 0.58;");
    expect(css).toContain("--reader-covered-fade-strong-bottom-opacity: 0.72;");
  });

  it('keeps explicitly fixed covered fades fixed when a theme deliberately chooses a raw gradient', () => {
    const reader = getReaderTheme();
    const recipes = {
      ...reader.recipes,
      overlays: {
        ...reader.recipes?.overlays,
        coveredFade: {
          background: 'gradient/bottomOverlayStrong' as ThemeRecipeTokenRef,
          text: 'semantic/reader/overlay-contrast-text' as ThemeRecipeTokenRef,
          border: 'semantic/reader/overlay-border' as ThemeRecipeTokenRef,
        },
      },
    } as ReaderThemeRecipes;

    const css = buildThemeTokensCss({
      ...reader.data,
      activePresetId: reader.activePresetId,
      recipes,
    });

    expect(css).toContain('--reader-covered-fade-background: linear-gradient(transparent, rgba(0,0,0,0.9));');
    expect(css).toContain('--reader-covered-fade-adaptive-background: linear-gradient(to top, rgb(0 0 0 / var(--reader-covered-fade-bottom-opacity)) 0%, rgb(0 0 0 / var(--reader-covered-fade-mid-opacity)) 38%, rgb(0 0 0 / var(--reader-covered-fade-top-opacity)) 68%, transparent 100%);');
  });

  it('emits support and window canary variables from the current role map', () => {
    const reader = getReaderTheme();
    const recipes = {
      ...reader.recipes,
      typography: {
        ...reader.recipes?.typography,
        chromeText: {
          family: 'font-family/serif1',
          size: 'font-size/lg',
          weight: 'font-weight/semibold',
          lineHeight: 'line-height/base',
          color: 'palette/6',
        },
        chromeMeta: {
          family: 'font-family/sans1',
          size: 'font-size/sm',
          weight: 'font-weight/medium',
          lineHeight: 'line-height/base',
          color: 'palette/7',
        },
        supportLabel: {
          family: 'font-family/serif1',
          size: 'font-size/base',
          weight: 'font-weight/bold',
          lineHeight: 'line-height/relaxed',
          color: 'palette/4',
        },
      },
      controls: {
        ...reader.recipes?.controls,
        supportControl: {
          background: 'layout/background2Color',
          text: 'semantic/reader/tonal-text-primary',
          border: 'layout/border2Color',
          hoverBackground: 'layout/background1Color',
        },
        feedbackAction: {
          background: 'palette/4',
          text: 'semantic/reader/contrast-on-fill-text',
          border: 'palette/4',
          hoverBackground: 'palette/3',
          hoverText: 'semantic/reader/contrast-on-fill-text',
        },
        supportChip: {
          background: 'palette/5',
          text: 'semantic/reader/contrast-on-fill-text',
          border: 'palette/5',
          hoverBackground: 'palette/4',
        },
      },
      surfaces: {
        ...reader.recipes?.surfaces,
        chromeToolbar: {
          background: 'layout/background2Color',
          border: 'layout/border2Color',
        },
        chromeSidebar: {
          background: 'layout/background1Color',
          border: 'layout/border1Color',
        },
        windowSurface: {
          background: 'layout/background2Color',
          border: 'layout/border2Color',
          radius: 'border/radius/md',
        },
        windowFrame: {
          background: 'layout/background1Color',
          border: 'layout/border2Color',
          radius: 'border/radius/lg',
        },
        windowElevation: {
          background: 'layout/background1Color',
          border: 'layout/border1Color',
          radius: 'border/radius/md',
          shadow: 'shadow/xl',
        },
      },
    } as ReaderThemeRecipes;

    const css = buildThemeTokensCss({
      ...reader.data,
      activePresetId: reader.activePresetId,
      recipes,
    });

    expect(css).toContain('--reader-chrome-text-color: var(--color6);');
    expect(css).toContain('--reader-chrome-muted-color: var(--color7);');
    expect(css).toContain(`--reader-chrome-text-font-family: ${reader.data.typography.fontFamilies.serif1};`);
    expect(css).toContain(`--reader-support-label-font-family: ${reader.data.typography.fontFamilies.serif1};`);
    expect(css).toContain('--reader-support-control-border-color: var(--color1-300);');
    expect(css).toContain('--reader-feedback-title-color: var(--text1-color);');
    expect(css).toContain(`--reader-feedback-title-font-family: ${reader.data.typography.fontFamilies.sans1};`);
    expect(css).toContain('--reader-feedback-meta-color: var(--text2-color);');
    expect(css).toContain('--reader-feedback-hint-color: var(--text2-color);');
    expect(css).toContain('--reader-feedback-action-background-color: var(--color4);');
    expect(css).toContain('--reader-feedback-action-hover-background-color: var(--color3);');
    expect(css).toContain('--reader-support-chip-background-color: var(--color5);');
    expect(css).toContain('--reader-support-chip-hover-background-color: var(--color4);');
    expect(css).toContain('--reader-header-background-color: var(--color1-200);');
    expect(css).toContain('--reader-header-text-color: var(--color2-300);');
    expect(css).toContain('--reader-header-icon-color: var(--color2-300);');
    expect(css).toContain('--reader-sidebar-background-color: var(--color1-100);');
    expect(css).toContain('--reader-chrome-active-control-background-color: var(--color3);');
    expect(css).toContain('--reader-chrome-active-control-text-color: var(--reader-contrast-on-fill-text-color);');
    expect(css).toContain('--reader-chrome-active-control-border-color: var(--color3);');
    expect(css).toContain('--header-background-color: var(--color1-200);');
    expect(css).toContain('--reader-window-background-color: var(--color1-200);');
    expect(css).toContain('--reader-window-border-color: var(--color1-300);');
    expect(css).toContain(`--reader-window-border-radius: ${reader.data.borders.radius.lg};`);
    expect(css).toContain(`--reader-window-shadow: ${reader.data.shadows.xl};`);
    expect(css).toContain('--admin-window-background-color: var(--reader-window-background-color);');
    expect(css).toContain('--admin-chrome-active-control-background-color: var(--reader-chrome-active-control-background-color);');
    expect(css).toContain('--admin-support-control-background-color: var(--reader-support-control-background-color);');
    expect(css).toContain('--admin-feedback-title-color: var(--reader-feedback-title-color);');
  });

  it('normalizes legacy windowPanel recipes into explicit window surface, frame, and elevation roles', () => {
    const normalized = normalizeReaderThemeRecipes({
      surfaces: {
        windowPanel: {
          background: 'layout/background2Color',
          border: 'layout/border2Color',
          radius: 'border/radius/lg',
          shadow: 'shadow/xl',
        },
      },
    } as Partial<ReaderThemeRecipes>);

    expect(normalized?.surfaces?.windowSurface?.background).toBe('layout/background2Color');
    expect(normalized?.surfaces?.windowFrame?.border).toBe('layout/border2Color');
    expect(normalized?.surfaces?.windowFrame?.radius).toBe('border/radius/lg');
    expect(normalized?.surfaces?.windowElevation?.shadow).toBe('shadow/xl');
  });

  it('builds separate scoped admin CSS from the saved admin theme data', () => {
    const document = normalizeThemeDocument(baseTheme);
    const admin = JSON.parse(JSON.stringify(document.admin)) as typeof document.admin;

    admin.data.layout.background1Color = 'color4';
    admin.data.layout.background2Color = 'color5';
    admin.data.layout.border1Color = 'color6';
    admin.data.components.input.backgroundColor = 'color7';
    admin.data.components.input.borderColor = 'color8';
    admin.data.components.button.solid.backgroundColor = 'color9';
    admin.data.components.button.solid.borderColor = 'color10';
    admin.data.components.button.solid.textColor = 'color11';

    const scopedCss = buildScopedDraftThemeCss(
      {
        ...document,
        admin,
      },
      {
        reader: '.themeDraftReaderScope',
        admin: '.themeDraftAdminScope',
      }
    );

    expect(scopedCss.adminCss).toContain('.themeDraftAdminScope {');
    expect(scopedCss.adminCss).toContain('--reader-window-background-color: var(--color4);');
    expect(scopedCss.adminCss).toContain('--reader-window-border-color: var(--color6);');
    expect(scopedCss.adminCss).toContain('--reader-support-control-background-color: var(--component-input-backgroundColor);');
    expect(scopedCss.adminCss).toContain('--reader-support-control-border-color: var(--component-input-borderColor);');
    expect(scopedCss.adminCss).toContain('--reader-chrome-active-control-background-color: var(--color9);');
    expect(scopedCss.adminCss).toContain('--reader-chrome-active-control-border-color: var(--color10);');
    expect(scopedCss.adminCss).toContain('--admin-window-background-color: var(--reader-window-background-color);');
    expect(scopedCss.adminCss).toContain('--admin-support-control-background-color: var(--reader-support-control-background-color);');
    expect(scopedCss.adminCss).toContain('--admin-chrome-active-control-background-color: var(--reader-chrome-active-control-background-color);');
    expect(scopedCss.adminCss).toContain('--button-solid-text-color: var(--color11);');
  });

  it('keeps draft and saved scoped compilation aligned for adaptive covered fades', () => {
    const document = normalizeThemeDocument(baseTheme);
    const scopedCss = buildScopedDraftThemeCss(document, {
      reader: '.themeDraftReaderScope',
      admin: '.themeDraftAdminScope',
    });

    expect(scopedCss.readerCss).toContain('.themeDraftReaderScope {');
    expect(scopedCss.readerCss).toContain('--reader-covered-fade-background: var(--reader-covered-fade-adaptive-background);');
    expect(scopedCss.readerCss).toContain('--reader-covered-fade-adaptive-background: linear-gradient(to top, rgb(0 0 0 / var(--reader-covered-fade-bottom-opacity)) 0%, rgb(0 0 0 / var(--reader-covered-fade-mid-opacity)) 38%, rgb(0 0 0 / var(--reader-covered-fade-top-opacity)) 68%, transparent 100%);');
    expect(scopedCss.adminCss).toContain('.themeDraftAdminScope {');
    expect(scopedCss.adminCss).toContain('--admin-window-background-color: var(--reader-window-background-color);');
  });

  it('compiles multiple shipped themes with explicit light/dark and admin aliases intact', () => {
    const journal = getReaderPresetSettings('journal');
    const editorial = getReaderPresetSettings('editorial');
    const admin = getAdminPresetSettings('admin');

    const journalCss = buildThemeTokensCss({
      ...journal.data,
      activePresetId: journal.activePresetId,
      recipes: journal.recipes,
    });
    const editorialCss = buildThemeTokensCss({
      ...editorial.data,
      activePresetId: editorial.activePresetId,
      recipes: editorial.recipes,
    });
    const adminCss = buildThemeTokensCss({
      ...admin.data,
      activePresetId: admin.activePresetId,
      recipes: admin.recipes,
    });

    expect(journalCss).toContain("/* Reader preset role aliases (journal) */");
    expect(journalCss).toContain('[data-theme="dark"] {');
    expect(journalCss).toContain('--reader-covered-fade-background: var(--reader-covered-fade-adaptive-background);');
    expect(journalCss).toContain('--admin-window-background-color: var(--reader-window-background-color);');

    expect(editorialCss).toContain("/* Reader preset role aliases (editorial) */");
    expect(editorialCss).toContain('[data-theme="dark"] {');
    expect(editorialCss).toContain('--reader-gallery-overlay-background: var(--reader-overlay-strong-scrim-color);');
    expect(editorialCss).toContain('--admin-chrome-active-control-background-color: var(--reader-chrome-active-control-background-color);');

    expect(adminCss).toContain('[data-theme="dark"] {');
    expect(adminCss).toContain('--admin-support-control-background-color: var(--reader-support-control-background-color);');
    expect(adminCss).toContain('--admin-feedback-title-color: var(--reader-feedback-title-color);');
    expect(adminCss).not.toContain('Reader preset role aliases (journal)');
    expect(adminCss).not.toContain('Reader preset role aliases (editorial)');
  });

  it('resolves concrete layout fallbacks to emitted token names instead of camel-cased alias refs', () => {
    const editorial = getReaderPresetSettings('editorial');

    const css = buildThemeTokensCss({
      ...editorial.data,
      activePresetId: editorial.activePresetId,
      recipes: editorial.recipes,
    });

    expect(css).toContain('--reader-page-background-color: var(--color1-100);');
    expect(css).toContain('--reader-page-border-color: var(--color1-200);');
    expect(css).toContain('--reader-media-frame-background-color: var(--color1-200);');
    expect(css).not.toContain('var(--layout-background1Color)');
    expect(css).not.toContain('var(--layout-background2Color)');
    expect(css).not.toContain('var(--layout-border1Color)');
  });

  it('resolves semantic overlay contrast fallbacks to emitted values instead of raw token refs', () => {
    const editorial = getReaderPresetSettings('editorial');

    const css = buildThemeTokensCss({
      ...editorial.data,
      activePresetId: editorial.activePresetId,
      recipes: editorial.recipes,
    });

    expect(css).toContain('--reader-overlay-contrast-text-color: var(--color1-100);');
    expect(css).toContain('--reader-story-overlay-title-color: var(--reader-overlay-contrast-text-color);');
    expect(css).not.toContain('--reader-overlay-contrast-text-color: component/button/solid/textColor;');
  });

  it('keeps the shipped fallback document on the current role map instead of legacy alias fields', () => {
    const readerRecipes = (baseTheme as { reader?: { recipes?: Record<string, Record<string, unknown>> } }).reader?.recipes;

    expect(readerRecipes?.typography).not.toHaveProperty('chromeTitle');
    expect(readerRecipes?.typography).not.toHaveProperty('chromeLabel');
    expect(readerRecipes?.typography).not.toHaveProperty('chromeHint');
    expect(readerRecipes?.typography).not.toHaveProperty('fieldControl');

    expect(readerRecipes?.surfaces).not.toHaveProperty('windowPanel');

    expect(readerRecipes?.controls).not.toHaveProperty('fieldControl');
    expect(readerRecipes?.controls).not.toHaveProperty('fieldControlStrong');
    expect(readerRecipes?.controls).not.toHaveProperty('chromeFilterChip');

    expect(readerRecipes?.overlays).not.toHaveProperty('card');
    expect(readerRecipes?.overlays).not.toHaveProperty('cardStrong');
    expect(readerRecipes?.overlays).not.toHaveProperty('lightbox');
  });

  it('normalizes legacy flat theme data into scoped reader/admin settings with admin fallback intact', () => {
    const flat = {
      ...baseTheme.reader.data,
      activePresetId: 'journal',
      recipes: {
        ...baseTheme.reader.recipes,
        overlays: {
          ...baseTheme.reader.recipes.overlays,
          coveredFade: {
            background: 'gradient/bottomOverlayStrong',
            text: 'semantic/reader/overlay-contrast-text',
            border: 'semantic/reader/overlay-border',
          },
        },
      },
    };

    const normalized = normalizeThemeDocument(flat);

    expect(normalized.version).toBe(2);
    expect(normalized.reader.activePresetId).toBe('journal');
    expect(normalized.reader.recipes?.overlays.coveredFade.background).toBe('gradient/bottomOverlayStrong');
    expect(normalized.admin.activePresetId).toBe('admin');
    expect(normalized.admin.data.layout.background1Color).toBeDefined();
  });

  it('falls back to the default admin scope when a persisted admin payload is incomplete', () => {
    const persistedLike = {
      version: 2,
      reader: {
        data: baseTheme.reader.data,
        activePresetId: 'editorial',
        recipes: baseTheme.reader.recipes,
      },
      admin: {
        data: {
          palette: [],
          themeColors: [],
          typography: {},
          spacing: {},
          borders: {},
          shadows: {},
          zIndex: {},
          layout: {},
          components: {},
          states: {},
          gradients: {},
        },
        activePresetId: 'custom',
      },
    };

    const normalized = normalizeThemeDocument(persistedLike);

    expect(normalized.reader.activePresetId).toBe('editorial');
    expect(normalized.admin.activePresetId).toBe('admin');
    expect(normalized.admin.data.layout.background1Color).toBeDefined();
    expect(normalized.admin.data.themeColors.length).toBeGreaterThan(0);
  });

  it('persists the normalized scoped document shape without dropping scoped metadata', () => {
    const normalized = normalizeThemeDocument(baseTheme);
    const persisted = toPersistedThemeDocument(normalized);

    expect(persisted.version).toBe(2);
    expect(persisted.reader.activePresetId).toBe(normalized.reader.activePresetId);
    expect(persisted.admin.activePresetId).toBe(normalized.admin.activePresetId);
    expect(persisted.reader.recipes?.overlays.coveredFade.background).toBe('semantic/reader/covered-fade');
    expect(persisted.admin.data.layout.background1Color).toBe(normalized.admin.data.layout.background1Color);
  });
});
