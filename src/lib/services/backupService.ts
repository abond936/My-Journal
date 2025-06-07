import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/config/firebase';
import { Entry } from '@/lib/types/entry';

export const backupEntry = async (entry: Entry): Promise<void> => {
  const backupRef = doc(db, 'entry_backups', `${entry.id}_${Date.now()}`);
  await setDoc(backupRef, {
    ...entry,
    backedUpAt: Timestamp.fromDate(new Date()),
    originalId: entry.id
  });
};

export const backupEntryBeforeUpdate = async (entryId: string, currentEntry: Entry): Promise<void> => {
  try {
    await backupEntry(currentEntry);
  } catch (error) {
    console.error('Failed to create backup:', error);
    // Don't throw the error - we want the update to proceed even if backup fails
  }
}; 