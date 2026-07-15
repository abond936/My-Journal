import { getAdminApp } from '@/lib/config/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  authorSettingsSchema,
  DEFAULT_AUTHOR_SETTINGS,
  normalizeAuthorSettings,
  type AuthorSettings,
  type GalleryTagInheritanceToggles,
  type TagSet0Status,
} from '@/lib/types/authorSettings';

const COLLECTION = 'app_settings';
const DOC_ID = 'author';

export async function getAuthorSettings(): Promise<AuthorSettings> {
  const firestore = getAdminApp().firestore();
  const snap = await firestore.collection(COLLECTION).doc(DOC_ID).get();
  if (!snap.exists) {
    return { ...DEFAULT_AUTHOR_SETTINGS };
  }
  return normalizeAuthorSettings(snap.data());
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
    galleryTagInheritanceConfigured: true,
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

export async function updateArchivePerspectivePersonId(
  archivePerspectivePersonId: string | undefined
): Promise<AuthorSettings> {
  const firestore = getAdminApp().firestore();
  if (archivePerspectivePersonId) {
    const person = await firestore.collection('people').doc(archivePerspectivePersonId).get();
    if (!person.exists) throw new Error('Archive perspective person does not exist.');
    if (person.data()?.kind === 'nonhuman') {
      throw new Error('Archive perspective must be a human identity.');
    }
  }
  const ref = firestore.collection(COLLECTION).doc(DOC_ID);
  const current = await getAuthorSettings();
  const next: AuthorSettings = { ...current };
  if (archivePerspectivePersonId) {
    next.archivePerspectivePersonId = archivePerspectivePersonId;
  } else {
    delete next.archivePerspectivePersonId;
  }
  await ref.set(
    {
      galleryTagInheritance: next.galleryTagInheritance,
      galleryTagInheritanceConfigured: next.galleryTagInheritanceConfigured,
      ...(next.tagSet0 ? { tagSet0: next.tagSet0 } : {}),
      archivePerspectivePersonId: archivePerspectivePersonId ?? FieldValue.delete(),
    },
    { merge: true }
  );
  return next;
}
