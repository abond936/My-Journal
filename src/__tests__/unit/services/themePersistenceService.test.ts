process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID = 'test-project-id';
process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = 'test-private-key';
process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL = 'test@example.com';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
  },
}));

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: jest.fn(() => 'server-timestamp') },
  getFirestore: jest.fn(),
}));

import baseTheme from '../../../../theme-data.json';
import { normalizeThemeDocument, toPersistedThemeDocument } from '@/lib/services/theme/themeDocumentService';
import {
  getResolvedScopedThemeDocument,
  saveThemeData,
} from '@/lib/services/theme/themePersistenceService';

const { promises: fsPromises } = jest.requireMock('fs') as {
  promises: Record<'readFile' | 'mkdir' | 'writeFile' | 'rename', jest.Mock>;
};
const { getFirestore } = jest.requireMock('firebase-admin/firestore') as {
  getFirestore: jest.Mock;
};
const { readFile, mkdir, writeFile, rename } = fsPromises;
const firestoreSet = jest.fn();
const firestoreGet = jest.fn();

describe('Theme persistence boundary', () => {
  const persisted = toPersistedThemeDocument(normalizeThemeDocument(baseTheme));

  beforeEach(() => {
    jest.clearAllMocks();
    readFile.mockResolvedValue(JSON.stringify(persisted));
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
    rename.mockResolvedValue(undefined);
    firestoreSet.mockResolvedValue(undefined);
    firestoreGet.mockResolvedValue({ exists: false, data: () => undefined });
    getFirestore.mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ get: firestoreGet, set: firestoreSet })),
      })),
    });
  });

  it('saves Firestore before completing the atomic JSON backup', async () => {
    const result = await saveThemeData(persisted);

    expect(result).toEqual({ firestoreSaved: true, backupSaved: true });
    expect(firestoreSet).toHaveBeenCalledWith({
      data: persisted,
      updatedAt: 'server-timestamp',
    });
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/theme-data(?:\.backup)?\.json\.tmp$/),
      JSON.stringify(persisted, null, 2),
      'utf-8'
    );
    expect(rename).toHaveBeenCalledTimes(1);
    expect(firestoreSet.mock.invocationCallOrder[0]).toBeLessThan(writeFile.mock.invocationCallOrder[0]);
  });

  it('reports a backup failure without hiding the successful Firestore save', async () => {
    writeFile.mockRejectedValueOnce(new Error('backup unavailable'));

    await expect(saveThemeData(persisted)).resolves.toEqual({
      firestoreSaved: true,
      backupSaved: false,
      backupError: 'backup unavailable',
    });
    expect(firestoreSet).toHaveBeenCalledTimes(1);
  });

  it('uses the normalized JSON document when Firestore has no Theme document', async () => {
    await expect(getResolvedScopedThemeDocument()).resolves.toEqual(normalizeThemeDocument(persisted));
    expect(readFile).toHaveBeenCalledTimes(1);
  });
});
