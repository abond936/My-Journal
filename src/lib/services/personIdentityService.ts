import { getAdminApp } from '@/lib/config/firebase/admin';
import { resolvePersonIdentity, type ResolvedPersonIdentity } from '@/lib/utils/personIdentity';

const PEOPLE = 'people';
const TAGS = 'tags';

/** Reads canonical identity from a Who tag and legacy profile data only as compatibility. */
export async function getPersonIdentity(personTagId: string): Promise<ResolvedPersonIdentity> {
  const firestore = getAdminApp().firestore();
  const tagSnap = await firestore.collection(TAGS).doc(personTagId).get();
  if (!tagSnap.exists) {
    throw new Error('Person identity tag does not exist.');
  }

  const [sameIdProfile, linkedProfiles] = await Promise.all([
    firestore.collection(PEOPLE).doc(personTagId).get(),
    firestore.collection(PEOPLE).where('linkedWhoTagId', '==', personTagId).get(),
  ]);
  const profiles = new Map<string, unknown>();
  if (sameIdProfile.exists) {
    profiles.set(sameIdProfile.id, { docId: sameIdProfile.id, ...sameIdProfile.data() });
  }
  linkedProfiles.docs.forEach((doc) => {
    profiles.set(doc.id, { docId: doc.id, ...doc.data() });
  });

  return resolvePersonIdentity(
    { docId: tagSnap.id, ...tagSnap.data() },
    [...profiles.values()]
  );
}
