import { getAdminApp } from '@/lib/config/firebase/admin';
import {
  authorSettingsSchema,
  DEFAULT_AUTHOR_SETTINGS,
  type AuthorSettings,
  type GalleryTagInheritanceToggles,
  type TagSet0Status,
} from '@/lib/types/authorSettings';

const COLLECTION = 'app_settings';
const DOC_ID = 'author';

function normalizeSettings(raw: unknown): AuthorSettings {
  const parsed = authorSettingsSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return { ...DEFAULT_AUTHOR_SETTINGS };
}

export async function getAuthorSettings(): Promise<AuthorSettings> {
  const firestore = getAdminApp().firestore();
  const snap = await firestore.collection(COLLECTION).doc(DOC_ID).get();
  if (!snap.exists) {
    return { ...DEFAULT_AUTHOR_SETTINGS };
  }
  return normalizeSettings(snap.data());
}

export async function updateGalleryTagInheritanceToggles(
  toggles: GalleryTagInheritanceToggles
): Promise<AuthorSettings> {
  const parsed = authorSettingsSchema.shape.galleryTagInheritance.parse(toggles);
  const firestore = getAdminApp().firestore();
  const ref = firestore.collection(COLLECTION).doc(DOC_ID);
  const current = await getAuthorSettings();
  const next: AuthorSettings = {
    ...current,
    galleryTagInheritance: parsed,
  };
  await ref.set(next, { merge: true });
  return next;
}

export async function updateTagSet0Status(status: TagSet0Status): Promise<AuthorSettings> {
  const parsed = authorSettingsSchema.shape.tagSet0.parse(status);
  const firestore = getAdminApp().firestore();
  const ref = firestore.collection(COLLECTION).doc(DOC_ID);
  const current = await getAuthorSettings();
  const next: AuthorSettings = {
    ...current,
    tagSet0: parsed,
  };
  await ref.set(next, { merge: true });
  return next;
}
