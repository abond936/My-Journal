import { promises as fs } from 'fs';
import * as path from 'path';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getDefaultScopedThemeDocument } from '@/lib/theme/themePresets';
import type {
  BorderTokens,
  ComponentTokens,
  GradientTokens,
  LayoutTokens,
  PersistedThemeDocumentData,
  ReaderThemeRecipes,
  ResolvedScopedThemeDocumentData,
  ShadowTokens,
  SpacingTokens,
  StateTokens,
  StructuredThemeData,
  TypographyTokens,
  ZIndexTokens,
} from '@/lib/types/theme';
import {
  isPersistedThemeDocument,
  isThemeDataViable,
  normalizeThemeDocument,
  toPersistedThemeDocument,
  type PersistedThemeData,
} from '@/lib/services/theme/themeDocumentService';

const THEME_FIRESTORE_COLLECTION = 'app_settings';
const THEME_FIRESTORE_DOC = 'theme';

function getEmptyThemeData(): StructuredThemeData {
  return {
    palette: [],
    themeColors: [],
    typography: {} as TypographyTokens,
    spacing: {} as SpacingTokens,
    borders: {} as BorderTokens,
    shadows: {} as ShadowTokens,
    zIndex: {} as ZIndexTokens,
    layout: {} as LayoutTokens,
    components: {} as ComponentTokens,
    states: {} as StateTokens,
    gradients: {} as GradientTokens,
  };
}

async function readThemeJsonFile(): Promise<unknown> {
  const jsonPath = path.join(process.cwd(), 'theme-data.json');
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  return JSON.parse(jsonContent);
}

function coerceStructuredThemeData(
  data: unknown
): StructuredThemeData & { activePresetId?: string; recipes?: ReaderThemeRecipes } {
  const normalized = normalizeThemeDocument(data);
  return {
    ...normalized.reader.data,
    activePresetId: normalized.reader.activePresetId,
    recipes: normalized.reader.recipes,
  };
}

/** Reads Reader theme data from the JSON fallback. */
export async function getThemeData(): Promise<StructuredThemeData> {
  try {
    return coerceStructuredThemeData(await readThemeJsonFile());
  } catch (error) {
    console.error('Failed to read theme JSON file:', error);
    return getEmptyThemeData();
  }
}

export async function getPersistedThemeDocumentFromJson(): Promise<PersistedThemeDocumentData> {
  try {
    return toPersistedThemeDocument(normalizeThemeDocument(await readThemeJsonFile()));
  } catch (error) {
    console.error('Failed to read persisted theme JSON document:', error);
    return toPersistedThemeDocument(getDefaultScopedThemeDocument());
  }
}

/** Theme for SSR: Firestore `app_settings/theme` when present and complete, else JSON fallback. */
export async function getResolvedScopedThemeDocument(): Promise<ResolvedScopedThemeDocumentData> {
  const fromFile = normalizeThemeDocument(await getPersistedThemeDocumentFromJson());
  try {
    getAdminApp();
    const db = getFirestore();
    const snap = await db.collection(THEME_FIRESTORE_COLLECTION).doc(THEME_FIRESTORE_DOC).get();
    if (snap.exists) {
      const row = snap.data();
      const data = row?.data as PersistedThemeData | undefined;
      if (isPersistedThemeDocument(data)) return normalizeThemeDocument(data);
      if (isThemeDataViable(data as StructuredThemeData | undefined)) {
        return normalizeThemeDocument(data as StructuredThemeData);
      }
      if ((data as StructuredThemeData | undefined)?.palette?.length) {
        console.warn(
          '[theme] Firestore app_settings/theme is incomplete; using theme-data.json. Re-save from Theme admin or run npm run seed:theme-firestore.'
        );
      }
    }
  } catch (error) {
    console.warn('[theme] Firestore load failed; falling back to theme-data.json:', error);
  }
  return fromFile;
}

export async function getResolvedThemeData(): Promise<
  StructuredThemeData & { activePresetId?: string; recipes?: ReaderThemeRecipes }
> {
  const scoped = await getResolvedScopedThemeDocument();
  return {
    ...scoped.reader.data,
    activePresetId: scoped.reader.activePresetId,
    recipes: scoped.reader.recipes,
  };
}

async function persistThemeToFirestore(themeData: PersistedThemeData): Promise<void> {
  getAdminApp();
  const db = getFirestore();
  await db.collection(THEME_FIRESTORE_COLLECTION).doc(THEME_FIRESTORE_DOC).set({
    data: themeData,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function syncThemeFromJsonToFirestore(): Promise<void> {
  const data = await getPersistedThemeDocumentFromJson();
  if (!data.reader.data.palette?.length) {
    throw new Error('theme-data.json has no reader palette; cannot sync to Firestore');
  }
  await persistThemeToFirestore(data);
}

async function writeThemeBackupFile(themeData: PersistedThemeDocumentData): Promise<void> {
  const jsonPath = process.env.NODE_ENV === 'development'
    ? path.join(process.cwd(), '.next', 'theme-data.backup.json')
    : path.join(process.cwd(), 'theme-data.json');
  const temporaryJsonPath = `${jsonPath}.tmp`;
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(temporaryJsonPath, JSON.stringify(themeData, null, 2), 'utf-8');
  await fs.rename(temporaryJsonPath, jsonPath);
}

export type ThemeSaveResult = {
  firestoreSaved: true;
  backupSaved: boolean;
  backupError?: string;
};

/** Writes Firestore first, then updates the recoverable JSON backup best-effort. */
export async function saveThemeData(
  themeData: PersistedThemeDocumentData
): Promise<ThemeSaveResult> {
  await persistThemeToFirestore(themeData);
  try {
    await writeThemeBackupFile(themeData);
    console.log('Theme saved to Firestore; theme-data.json backup updated.');
    return { firestoreSaved: true, backupSaved: true };
  } catch (backupError) {
    console.warn('[theme] Firestore save succeeded, but theme-data.json backup write failed:', backupError);
    return {
      firestoreSaved: true,
      backupSaved: false,
      backupError: backupError instanceof Error ? backupError.message : String(backupError),
    };
  }
}
