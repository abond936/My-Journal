# Firebase Configuration and Database Access

## Overview
This document outlines the correct patterns for accessing Firebase in the My Journal application. The application uses two different Firebase SDKs for different purposes.

## Two Types of Database Access

1. **Client-Side Access** (`src/lib/config/firebase.ts`):
   - Used for browser/client-side operations
   - Uses `firebase/firestore` package
   - Exports `db` instance
   - Used in React components and client-side hooks
   - Requires `NEXT_PUBLIC_` environment variables

2. **Server-Side/Admin Access** (`src/lib/config/firebase/admin.ts`):
   - Used for server-side operations and scripts
   - Uses `firebase-admin` package
   - Exports `adminDb` instance
   - Used in API routes and scripts
   - Requires service account credentials

## Correct Usage Patterns

### For Client-Side Components:
```typescript
import { db } from '@/lib/config/firebase';
import { collection, doc, getDoc, query, orderBy, where } from 'firebase/firestore';

// Basic document access
const entryRef = doc(db, 'entries', id);
const entrySnap = await getDoc(entryRef);

// Query with filters and ordering
const tagsRef = collection(db, 'tags');
const tagsQuery = query(
  tagsRef,
  where('dimension', '==', 'who'),
  orderBy('name')
);
const tagsSnap = await getDocs(tagsQuery);
```

### For Server-Side/Admin Operations:
```typescript
import { adminDb } from '@/lib/config/firebase/admin';

// Basic document access
const entryRef = adminDb.collection('entries').doc(id);
const entrySnap = await entryRef.get();

// Query with filters
const entriesRef = adminDb.collection('entries');
const entriesQuery = entriesRef
  .where('status', '==', 'published')
  .orderBy('createdAt', 'desc')
  .limit(10);
const entriesSnap = await entriesQuery.get();
```

## Key Points:
1. Never mix client and admin SDKs
2. Use client SDK (`firebase/firestore`) for React components
3. Use admin SDK (`firebase-admin`) for scripts and server operations
4. The admin SDK has a different API structure (e.g., `collection().doc()` vs `doc()`)
5. Both SDKs are already properly configured in the project
6. Client SDK supports real-time updates with `onSnapshot`
7. Admin SDK supports batch operations and transactions

## Environment Variables

### Client-Side Variables (NEXT_PUBLIC_)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

### Admin SDK Variables
```
FIREBASE_SERVICE_ACCOUNT_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY  # Must be properly formatted with newlines
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL
```

## Common Mistakes to Avoid
1. Using client SDK in server-side code
2. Using admin SDK in client-side code
3. Mixing SDK APIs (e.g., using client-style `doc()` with admin SDK)
4. Not handling the different API structures between SDKs
5. Not using the correct environment variables for each SDK
6. Not properly formatting the service account private key (needs `replace(/\\n/g, '\n')`)
7. Not handling real-time updates correctly in client components
8. Not using batch operations for multiple writes in admin operations 