// Mock Firebase client before any imports
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

// Create a mock Timestamp class
class MockTimestamp {
  constructor(private date: Date) {}
  toDate() { return this.date; }
  static fromDate(date: Date) { return new MockTimestamp(date); }
}

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
  })),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  Timestamp: MockTimestamp,
}));

import { 
  getAllEntries, 
  getEntry, 
  createEntry, 
  updateEntry, 
  deleteEntry 
} from '@/lib/services/entryService';
import { Entry } from '@/lib/types/entry';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/config/firebase';

// Mock the Firebase client initialization
jest.mock('@/lib/config/firebase', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
  },
}));

describe('Entry Service', () => {
  const mockDate = new Date('2025-06-01T13:26:14.001Z');
  const mockEntry: Omit<Entry, 'id'> = {
    title: 'Test Entry',
    content: 'Test Content',
    tags: ['test'],
    type: 'story',
    status: 'draft',
    createdAt: mockDate,
    updatedAt: mockDate,
    date: mockDate,
    inheritedTags: ['test'],
    media: [],
    visibility: 'private',
  };

  const mockEntryWithId: Entry = {
    id: 'test-id',
    ...mockEntry,
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createEntry', () => {
    it('should create a new entry', async () => {
      // Mock the addDoc function to return a document reference
      (addDoc as jest.Mock).mockResolvedValueOnce({ id: 'test-id' });

      const result = await createEntry(mockEntry);

      expect(addDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          title: mockEntry.title,
          content: mockEntry.content,
          tags: mockEntry.tags,
          createdAt: expect.any(MockTimestamp),
          updatedAt: expect.any(MockTimestamp),
          date: expect.any(MockTimestamp),
        })
      );

      expect(result).toEqual(expect.objectContaining({
        id: 'test-id',
        title: mockEntry.title,
        content: mockEntry.content,
        createdAt: mockDate,
        updatedAt: mockDate,
        date: mockDate,
      }));
    });
  });

  describe('getEntry', () => {
    it('should retrieve an entry by id', async () => {
      // Mock the getDoc function to return a document snapshot
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        id: 'test-id',
        data: () => ({
          ...mockEntry,
          createdAt: Timestamp.fromDate(mockDate),
          updatedAt: Timestamp.fromDate(mockDate),
          date: Timestamp.fromDate(mockDate),
        }),
      });

      const result = await getEntry('test-id');

      expect(getDoc).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual(expect.objectContaining({
        id: 'test-id',
        title: mockEntry.title,
        content: mockEntry.content,
        createdAt: mockDate,
        updatedAt: mockDate,
        date: mockDate,
      }));
    });

    it('should return null for non-existent entry', async () => {
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => false,
      });

      const result = await getEntry('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateEntry', () => {
    it('should update an existing entry', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated Content',
      };

      const result = await updateEntry('test-id', updateData);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          title: updateData.title,
          content: updateData.content,
          updatedAt: expect.any(MockTimestamp),
        })
      );

      expect(result).toEqual(expect.objectContaining({
        id: 'test-id',
        ...updateData,
        updatedAt: expect.any(Date),
      }));
    });
  });

  describe('deleteEntry', () => {
    it('should delete an entry', async () => {
      await deleteEntry('test-id');

      expect(deleteDoc).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('getAllEntries', () => {
    it('should retrieve all entries with default options', async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({
        docs: [{
          id: 'test-id',
          data: () => ({
            ...mockEntry,
            createdAt: Timestamp.fromDate(mockDate),
            updatedAt: Timestamp.fromDate(mockDate),
            date: Timestamp.fromDate(mockDate),
          }),
        }],
      });

      const result = await getAllEntries();

      expect(getDocs).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'test-id',
        title: mockEntry.title,
        content: mockEntry.content,
        createdAt: mockDate,
        updatedAt: mockDate,
        date: mockDate,
      }));
    });

    it('should filter entries by tag', async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({
        docs: [{
          id: 'test-id',
          data: () => ({
            ...mockEntry,
            createdAt: Timestamp.fromDate(mockDate),
            updatedAt: Timestamp.fromDate(mockDate),
            date: Timestamp.fromDate(mockDate),
          }),
        }],
      });

      const result = await getAllEntries({ tag: 'test' });

      expect(getDocs).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('test');
    });
  });
}); 