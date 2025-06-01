// Set up environment variables before any imports
process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID = 'test-project-id';
process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = 'test-private-key';
process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL = 'test@example.com';

// Mock Firebase Admin before any imports
jest.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn(),
    doc: jest.fn(),
  };
  
  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
    },
    firestore: jest.fn(() => mockFirestore),
  };
});

import { adminDb } from '@/lib/config/firebase/admin';
import admin from 'firebase-admin';

describe('Firebase Admin Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('adminDb should be defined', () => {
    expect(adminDb).toBeDefined();
  });

  test('adminDb should have collection method', () => {
    expect(adminDb.collection).toBeDefined();
  });

  test('adminDb should have doc method', () => {
    expect(adminDb.doc).toBeDefined();
  });

  test('Firebase Admin should be initialized with correct config', () => {
    expect(admin.initializeApp).toHaveBeenCalledWith({
      credential: expect.any(Object),
    });
  });

  test('Firebase Admin credential should be created with environment variables', () => {
    expect(admin.credential.cert).toHaveBeenCalledWith({
      projectId: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID,
      privateKey: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY,
      clientEmail: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    });
  });
}); 