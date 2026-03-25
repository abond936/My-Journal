# Project Overview

Legend:
- ✅ Implemented
- ⭕ Planned - Priority: 1, 2, 3
- ❓ Open Question

### Document Governance
- Project.md is the canonical project document for author and AI.
- When proposing changes: summarize what changed, where, and why.
- Author reviews and can reject or redirect.

### Product Direction & Collaboration
- **Author** provides direction, constraints, and priorities. Does not specify implementation details.
- **AI/Engineering** proposes how to build, designs flows, and recommends technical approaches.
- **Product scope (current):** Stage 1 = author + family, with an eye toward commercialization. Import = local filesystem now; architecture must support other sources (e.g., Google Photos) with the same UX patterns. Feel = Apple/Google Photos–like operation; differentiate with "electronic journal" aesthetic. Phase = workspace + navigation first; mobile polish later; app must remain mobilizable (responsive).

**Vision** 
The concept of this app is to provide a way to combine one's photos and stories into an interactive 'journal'-- a storytelling platform that allows curated or freeform discovery. The idea was inspired by hard copy journals and wanting integrate images in a combination journal-album, and in a way that most efficiently leverages the images that one has. 

Photo apps like Apple and Google are very efficient interfaces, and they have album capability, but they are limited in integrating text and organizing the albums themselves. These apps provide for tagging, but it is freeform and can quickly devolve into a disorganized mess.

This app seeks to leverage the photo repository and provide a story-telling overlay, either curated or freeform, via a dimensional and heirarchical tag system.

A limitation is that it is difficult to use the Apple/Google photos apps as repositories, making import an undesirable necessity. 
❓Unless that is wrong. I recently saw something about the API that made it seem that it might be easier on Google than I thought.

The market for this beyond the author's use would be journalers, memory keepers, families. Some import friction may be acceptable for curated storytelling.

**Primary Users**
The primary users are the author (admin) creating the content and his family consuming it, primarily on mobile, but tablet and desktop.
- ⭕3 - Limit access to curated cards for other than the author.

**Current State**
- Core functionality exists
- Some architectural elements still required
- Further functional buildout and QA required.

**Strategic Direction** 
The original strategy was completely card centric.
- Flow: Create card → Add cover → Add gallery → Add content → Add tags
- Images imported on-the-fly when assigned. Images imported but subsequently unassigned were flagged.
- Media status: `temporary` until assigned, `active` when referenced.
Card centricity became problematic, so we switched to a card and image centric approach.
- **Standalone Story Journal** – Current path. Users import/copy images; full control. 
- **Photo App Overlay** – Add organizational layer (cards, text, tags) on top of Apple Photos or Google Photos; 
❓images still imported for now, but would prefer them to stay in place if archtecturally possible.

- Two entry paths:
    1. **Folder -> Card:** Import folder as card and images concurrently; assign any tags from folder name/metadata; edit after. 
    2. **Import, then assign:** User imports images in bulk with any tags from metadata. Those images go into the bank unassigned. User then creates cards and assigns from the bank.

### What Stays the Same
- Cards reference media by ID: `coverImageId`, `galleryMedia[].mediaId`, `contentMedia[]`
- Cover, gallery, inline content — same assignment model
- Tags, dimensions, collections — same structure

### What Simplifies
- ⭕- Drop `temporary`/`active` status for media. Everything imported is in the bank.
- ⭕- Add "where assigned" (or equivalent) for visibility; unassigned is normal, not an error. ❓Does this not already exist?

## **Content Strategy Principles**

### **1. Narrative Control**
- Collections provide curated storytelling
- Order and Parent/child relationships maintain story flow
- Manual ordering ensures narrative coherence

### **2. Organic Discovery**
- Tag-based filtering enables natural exploration (and aggregation for card creation)
- Random content encourages serendipitous discovery
- Dimensional tagging (who, what, when, where, reflection) provides multiple entry points

### **3. Content Flexibility**
- Any card can serve multiple purposes
- Display modes adapt to content characteristics
- Swiss Army Knife approach maximizes content utility

### **4. User Experience Consistency**
- Cross-device navigation patterns
- Consistent discovery mechanisms
- Predictable interaction patterns

### **5. Scalability**
- Performance optimization for large content libraries
- Efficient content indexing and retrieval
- Caching strategies for improved performance

### **Content Architecture**
- **Swiss Army Knife Cards:** Any card can be content, collection, or both
- **Predetermined Display Modes:** Inline (short text/few images) vs Navigate (long text/many images)
- **Manual Control:** All content mixing and display logic controlled by user

### **Navigation System**
- **Dimension Tabs:** All | Who | What | When | Where | Reflection | Collections
- **Tab Persistence:** Remembers active dimension across page refreshes
- **Collections Tab:** Lists cards with children, grouped by dimension (who/what/when/where/reflection)
- **Collection Ordering:** Manual drag & drop for TOC curation -⭕2 Table of Contents: drag & drop ordering for collections
-⭕2 - Implement collection metadata (child counts)
-⭕2 - Create admin interface for collection curation

### **Content Discovery Strategy**
- **Bottom of Every Card:** Children + 3 filtered + 3 random exploration
- **Hierarchical + Organic:** Maintains narrative flow while encouraging discovery
- **Contextual Filtering:** Active tab controls what "filtered" means

### **User Experience Flow**
- **Main Feed:** Mixed content types with inline galleries and horizontal story slides
- **Story Detail:** Inline galleries with cross-device navigation
- **Infinite Flow:** Seamless transitions between related content
- **Mobile-First:** Touch scrolling, responsive design, news feed feel [❓ Do we want news feed or grid?]

### **Content Types & Display**
- **Stories:** Navigate mode (full articles)
- **Galleries:** Inline (≤5 images) or Navigate (>5 images) [View page needs image grid]
- **Questions:** Navigate 
- **Quotes** Always inline
- **Collections:** Any card with children becomes a collection

### **Key Innovation**
- **Dual Navigation:** Curated collections for narrative control + tag filtering [of images and cards] for organic discovery
- **Exploration Balance:** Children maintain story flow, random content encourages discovery

## **Technical**
=====================================

#### **1. Dual Card/Images Visual Workspace**
For Images - A dedicated workspace that surfaces all imported media in a **grid/masonry** layout--filterable. From there: multi-select → "Create card from selection" (gallery), "Add to existing card", "Assign tags". Flow: Browse grid → Select images → "Create gallery card" → Card created with selection as gallery, first image as cover (editable) → Minimal form (title, type) → Save draft → Refine later.
❓Have been looking at Google Photos interface.
  - On desktop
    - Minimal top menu - Add, Help, Settings, Account
    - Left sidebar 
      - Separates albums from images. We need to do the same.
      - Tags are fixed as people, places
      - Other irrelevant selections for us.
    On Mobile
      - Minimal top menu - New (Album, Collage, ... and Import from other sources)
      - Bottom menu
        - Photos, Collections, Create, Ask

### **Friction Points**
1. ~~No single visual workspace for images—split between local (PhotoPicker) and Firestore~~ — Card `PhotoPicker` now includes **Library**; Media Admin remains the full admin surface.
2. Creating cards from images requires many steps: Card Admin → New → form → PhotoPicker
3. Media Admin is table-centric, not visual
4. No "images → card" path: e.g., select images → create gallery card → pick cover
5. Bulk tag editing is card-centric and list-based, not image-centric or visual

### **Strategic Direction**

#### **Media Admin as Visual Workspace**
-⭕2 - Add a **grid view** (masonry) toggle alongside the table. Multi-select with actions: "Create card from selection", "Add to card". 
- ✅ **"Unassigned" / "Assigned"** filter in Media Admin (`assignment` query + seek pagination; see Implementation Summary item 9).

#### **3. Import + Assign Flow**
During import (PhotoPicker or bulk import): 

-⭕2 -Add **Create card from this batch"** as a first-class option. After import, prompt: "Create gallery card?" → Yes → Card with all imported images in gallery, first as cover. 
**Folder-based import:** "Create card from folder" → Import entire folder → Card with folder name as title, all images in gallery.❓We have an Import Folder option that does this. Could/should it be made generic so that any import gets this path?

⭕2 Add - **Progressive Disclosure for Card Creation**
**Quick add:** Select images → Create card (title only, or title + type) → Save as draft. Refinement later. Lowers the barrier to get images into cards. ❓Is this not the same as import batch or folder? Further edit will likely always be required. Create in Draft mode for later editing.

- ✅ **Unified Picker (card modal):** `PhotoPicker` tabs **This PC** (local import) | **Library** (`GET /api/media`, reuse Firestore media, no re-upload). Future: Google Photos as an additional tab/source.

⭕2 Add - **Bridge Content and Admin**
An "Organize" mode or view that feels like the content feed but with organize actions (create card, add to card, tag). Reduces the sense of switching between two apps. **Update:** No separate “organize feed” for now. **Desktop admin** + full card edit carries authoring; tagging is streamlined in the **tag picker modals** and **Tag Management** (see Item 11 note in Implementation Summary).

### **Key Architectural Decisions**
- Strict client-server, separation of concerns
  - Server-side validation with Zod schemas
  - Client-side state management with React providers
  - Firebase Admin SDK for server operations
- CSS modules for styling
- TypeScript throughout
- Consumption and Administration separated ❓Being reviewed.
- Data Model (Cards → Tags → Media)
- Cards (primary content)
  - Contain text and media, combining legacy entries and albums
  - Presentation varied per type and styling
- Tags (hierarchical organization)
  - Dimensional and heirarchical, parent/child relationship
  - Tags denormalized into cards for query performance
  - Server-side filtering to avoid Firestore limitations  
- Media (assets)
  - Imported from external sources to db for stability.❓Being reviewed.
  - Referenced in cards by id, hydrated on demand
  - Processed with Sharp
  - Also a mode of discovery.
- Theme (centralized CSS)

#### **Frontend**
✅
  - Next.js 15 App Router
  - React 19
  - TypeScript
  - CSS Modules
  - `@tiptap/react` rich text editing
  - PhotoPicker for media selection
  - GalleryManager for galleries
  - `next/image`- image Optimization
  - `@dnd-kit/core` - dragndrop 
  - Swiper for galleries
  - `zod` - schema validation

#### **Backend**
✅
  - Auth.js with Firebase adapter
  - `firebase-admin` SDK for server-side operations
  - Zod for data validation
  - Next.js API Routes
  - Application wrapped in AuthProvider
  - All API routes secured at the edge
  - Role-based access control
  - Session persistence
  - **Journal access:** Firestore `journal_users` (bcrypt passwords), NextAuth Credentials; admin APIs `/api/admin/journal-users`; seed `npm run seed:journal-users`; legacy env login when no row exists for that username (see rollout plan below).
  - **Question bank (MVP):** Firestore `questions`, `questionService.ts`, admin APIs `/api/admin/questions` and `/api/admin/questions/[id]` (incl. `create-card`); card delete unlinks IDs from questions in `cardService`.

**Auth rollout plan (agreed)**
- During build/content phase, keep using current env-based login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) so work can continue without user provisioning.
- At go-live prep, run `npm run seed:journal-users` once to create the single admin in Firestore (`journal_users`) when that collection is empty.
- After seed, manage access in Admin > Users (`/admin/journal-users`): create viewer accounts, set/reset passwords, enable/disable access.
- Operating rule: one admin (author), all other accounts are viewers.
- Share access by sending site URL + username/password directly to each viewer.

⭕2 - Comment code
⭕2 - Cleanup directory
⭕2 - Address ESLint violations (~100+; build uses ignoreDuringBuilds; run `npm run lint` locally)
⭕2 - QA app
⭕2 - Host app (Netlify/Vercel)

#### **Scripting**
 - `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json`
 - Key scripts: `npm run reconcile:media-cards` (diagnose/fix card-media), `npm run cleanup:media` (validate refs, activate media), `npm run diagnose:cover` (cover image by card title), `npm run remove:legacy-cover` (remove embedded coverImage from cards) 

**Firebase Setup**
- Credentials live in `.env`: `FIREBASE_SERVICE_ACCOUNT_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`, `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`, `FIREBASE_STORAGE_BUCKET_URL`
- Scripts must load `.env` before importing Firebase. Use `-r dotenv/config` (and `DOTENV_CONFIG_PATH=.env` if needed) so env vars are available when `admin.ts` initializes

**Import Folder as Card**
- Requires `ONEDRIVE_ROOT_FOLDER` in `.env` (server filesystem path)
- `IMPORT_FOLDER_MAX_IMAGES` (default 50): max images per folder to avoid serverless timeout. Increase for self-hosted.

#### **Backup**
✅ 
- OneDrive - Windows Scheduled Task at 2am daily, auto awake pc, cleared >5 days, `npm run backup:database`
- Github - On every push, for 7 days
⭕2 - Ensure operational

## **APPLICATION**
================================
The application is separated into 'content' and 'administration' with the core components wrapped in navigation and providers. ❓Being reviewed.

### **Application Structure**
- Providers - The core layouts are wrapped in providers
  - AuthProvider - Handles authentication state using NextAuth.js
  - TagProvider - Manages tag data and operations globally
  - CardProvider - Manages card data, filtering, and pagination
- Layouts 
  - AppShell: Main layout wrapper providing navigation and structure
  - ViewLayout: Handles the main (content) interface
  - AdminLayout: Manages the admin interface
  ❓Is this suitable/ideal for mobile?

### **Directory Structure**
 `src/app/`  Next.js App Router
   `api/` API route handlers
   `admin/` content management interface
   `view/` content consumption interface
   `layout.tsx`  root layout, which includes global providers

 `src/components/` Reusable React components
   `common/` Generic components used across the app 
   `view/` Components specific to the content viewing experience
   `admin/` Components specific for the admin interface 

 `src/lib/` Core application logic, types, and utilities
   `services/` business logic
   `types/` Zod schemas and TypeScript type definitions
   `hooks/` Reusable client-side React hooks
   `utils/` General utility functions (e.g., date formatting, tag manipulation)

⭕2 - Revisit bifurcation - Emulate mobile apps where default is Content and Admin is accessed through account or settings or other backdoor method.

### **Data Models**
✅ 
- `src/lib/types/` *read directly - fully commented*
- Zod schemas for all data types
- Single source of truth
- Server-side and client-side validation
- Type checking with TypeScript
  - `Card` - `src/lib/types/card.ts` - Central data entity in the application, containing content, metadata, and references to tags and other cards.
  - `Tag` - `src/lib/types/tag.ts` - Structure for dimensional and hierarchical tags used for organizing and filtering cards.
  - `Media` - `src/lib/types/photo.ts` - Media assets (image, video) stored in Firebase Storage, including metadata like dimensions and paths.

## **Data Architecture**

### Data Model: What Stays, What Changes (from DataStrategyAssessment)

#### Media Collection (images)
| Aspect | Original Assumption | New Reality | Assessment |
|--------|---------------------|-------------|------------|
| **Existence** | Created when assigned to card | Exists before cards; bulk import | Schema is fine. Volume and lifecycle differ. |
| **status** | temporary → active on assignment | All imported = ? | Need policy: unassigned media status; or drop status if everything is "in bank." |
| **storageUrl** | Refreshed at card hydration | Media Admin, grid views, pickers need URLs | Any view that lists media needs fresh URLs. Card hydration isn't the only consumer. |
| **storagePath** | Canonical for signed URL gen | Same | No change. |
| **Orphaned media** | Exception; cleanup removes | Expected; "Unassigned" is a first-class filter | Queries for "not in any card" become core, not edge case. |

#### Cards Collection
| Aspect | Original Assumption | New Reality | Assessment |
|--------|---------------------|-------------|------------|
| **References** | coverImageId, galleryMedia, contentMedia | Same—reference by ID | Model still valid. Cards point at media; media can exist without cards. |
| **Creation path** | Card form → PhotoPicker (import) | Card form or "from selection" → pick from existing media | UI/flow change. Data model: assignment, not creation. |
| **coverImage** | Hydrated from coverImageId | Same | No change. Transient, hydrated at read. |
| **Legacy embedded coverImage** | Migration/seed wrote it | Should not exist in new flow | Clean up. Canonical: ID only. |

#### Relationship Direction
- **Original:** Card "owns" its media (import on assign).
- **New:** Media exists independently; cards reference it.
- **Same storage:** coverImageId, galleryMedia[].mediaId, contentMedia. Only the lifecycle and workflow differ.

### Gaps for the New Strategy
- **Media Display URLs:** ✅ Public URLs. Card hydration, Media API, and createMediaAsset set storageUrl from storagePath. No expiration or refresh.
- **"Unassigned" Query:** ✅ Uses `referencedByCardIds` on media + `GET /api/media?assignment=unassigned|assigned` (sequential scan; see `mediaAssignmentSeek.ts`).
- **Media Status Semantics:** Original: temporary/active. New: all in bank. ⭕ Retire or redefine?
- **Picker: Local vs Already Imported:** ⭕ Add "Already imported" (Firestore) mode—no import, just assign.
- **Create Card from Selection:** Flow works; data model same. No new fields.

### Schema Recommendations
- **Media:** Keep docId, filename, width, height, storagePath, source, sourcePath. storageUrl: refresh when returned for display. status: define or retire. Optional: referencedByCards for unassigned filter.
- **Cards:** Canonical shape—coverImageId, coverImageFocalPoint, galleryMedia, contentMedia. No embedded media. ✅ Run `npm run remove:legacy-cover` to clean legacy embedded coverImage.
- **Assignment:** No schema change. Cover, gallery, content use IDs. Changes are workflow and supporting queries.

### Architecture Decisions to Make
1. ~~**URL refresh policy:**~~ ✅ **Resolved:** Use permanent public URLs. `getPublicStorageUrl(storagePath)` in card hydration, Media API, and `createMediaAsset`. No signed URLs.
2. ~~**Unassigned filter:**~~ ✅ **Resolved:** Denormalized `referencedByCardIds` + seek scan in Media API for unassigned/assigned.
3. **Media status:** Keep and redefine, or retire?
4. **Legacy cleanup:** Remove embedded coverImage from cards; backfill media metadata.

### Media Collection (images)
- **Firebase Storage:** `images/{docId}-{filename}`
- **Firestore `media` collection:** One doc per image
- **Schema:** docId, filename, width, height, storagePath, storageUrl, source, sourcePath, caption, objectPosition, createdAt, updatedAt, referencedByCardIds (optional)
- **storageUrl:** Permanent public URL (format: `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media`). Set from `storagePath` at card hydration and in Media API. No expiration or refresh. Requires Firebase Storage rules for public read (see below).
- **referencedByCardIds:** Denormalized array of card IDs that reference this media. Maintained on createCard, updateCard. Used for delete (remove refs from cards, then delete) and unassigned filter. Lazy backfill for legacy media.
- **No temporary/active.** All imported media is in the bank. Track **where assigned** (cover, gallery, content) for filtering; unassigned is valid.

#### Firebase Storage Rules (required for public URLs)

Images are served via permanent public URLs. Configure Storage rules in **Firebase Console → Storage → Rules** so `images/` is readable by unauthenticated users:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Adjust `allow write` if you use different auth requirements. No `storage.rules` file in this repo—rules are managed in the Console.

### Cards Collection
- **References only:** coverImageId, coverImageFocalPoint, galleryMedia, contentMedia. No embedded media objects.
- **coverImage:** Transient — hydrated from media at read time. Never stored on card.
- **Legacy cleanup:** ✅ Run `npm run remove:legacy-cover -- --diagnose` then `--fix` to remove embedded coverImage. Canonical shape is ID references only.

### Assignment Model 
Use -> Stored On Card -> Notes 
- Cover -> coverImageId, coverImageFocalPoint -> Single image
- Gallery -> galleryMedia[] -> { mediaId, caption, order, objectPosition }  
- Inline (rich text) -> contentMedia[]  -> IDs extracted from HTML; content has data-media-id 

## **Navigation** 

## **User Experience Goals**

### **Responsive Strategy**
- **Detection, not selection:** Layout adapts automatically by screen size (CSS media queries / matchMedia). No user toggle.
- **Desktop (e.g., ≥768px):** Sidebar, top nav, hover interactions. No bottom bar.
- **Mobile (e.g., <768px):** Bottom navigation for primary actions. Sidebar/dimensions in sheet or overlay. ⭕2 Polish deferred.
- **Mobilizable:** Components and layout are responsive now; mobile-specific UX (bottom nav, touch targets) comes in a later phase.

### **Mobile-First News Feed**
- Touch-optimized scrolling and navigation
- Responsive design that works on all devices
- Natural thumb scrolling for galleries and menu options.
- Clean, uncluttered interface

### **Seamless Content Flow**
- Infinite story progression
- Contextual related content
- Smooth transitions between stories
- No jarring navigation interruptions

### **Flexible Content Consumption**
- Multiple ways to discover content
- Curated narrative paths
- Organic exploration opportunities
- Personalized reading experiences

### **Home Page**
- Application opens to the home page for login
⭕2 - Change app feel to Google Photos

✅
- Login
- SVG Logo
⭕2 - Reduce logo to icon for corner placement on mobile.
⭕2 - Move app to 
### **Navigation**
⭕ 1 - Needs to be mobile first
        - slideout sidebar ❓Should this move to bottom for mobile ease?
        - minimal top menu
        - bottom menu that expands upward

### **Top Navigation**
- Top navigation toggles content and admin 

✅ 
- content - Available to users and admin
- admin - Available only to admin
- theme toggle
⭕1 - Content-first: Content as default view. Admin and Theme behind single menu (user icon or equivalent). See Product Direction.

### **Left Sidebar Navigation**
- Left sidebar provides dimension tabs and tag selection for card filtering.
⭕2 - Resolve sidebar hide button overlaying 'Explore' title on sidebar.
⭕2 - Explore using bottom buttons for mobile.

✅ 
- Dimension tabs: All | Who | What | When | Where | Reflection | Collections
- Collections tab: Cards with children, grouped by dimension (who/what/when/where/reflection), sorted A–Z
- Hierarchical Tag Display: `GlobalSidebar.tsx` and `TagTree.tsx`
- Discovery filtered by card type and active dimension
- Slide in/out on mobile
⭕2 Filtering: sort by when asc/desc
⭕2 Table of Contents: drag & drop ordering for collections

### **Content Page**
- After login, the app defaults to the content page `CardFeed.tsx` and `ContentCard.tsx` displaying:

✅ 
- Grid View
  - Responsive grid-based layout
  - 3 display modes/styles
    - Static - Display only (Question, Quote)
    - Inline - Swipes left/right (Gallery <5 images)
    - Navigate - Links to dedicated card view page (Story, Gallery) 
  - 4 card types:
    1. Story Card - Story with related images--cover, inline, and/or gallery.
      - Title - Bottom
      - Overlay
    2. Gallery Card - Images with limited text (captions)
      - Title - Top
      - Excerpt
      - Inline expansion
      ⭕2 - Horizontal Image slider 1/5
    3. Question Card - Questions from family.
      - Background - Question Mark
      - Static if answer is short, otherwise Navigate (Becomes a type of story card).
      ⭕2 - Get questions from Word doc, card games on Amazon
    4. Quote Card - Favorite quotes
      ⭕2 - Get quotes from Dad book, Notion quotes, Grandfather book

- Random cards
  - 3 related, 3 unrelated
  - After story/gallery
  - In feed

- Search Tags
  ⭕2 -Search not working

### **View Card**
- Clicking a `navigate`card navigates to card detail page `src/app/view/[id]/CardDetailPage.tsx` conditionally rendering card components
- `src/app/view/[id]/page.tsx` is executed on the server, calls `getCardData` which calls `getCardById(id)` from `cardService.ts` to fetch the main card's data from Firestore. 
If the card has `childrenIds`, it calls `getCardsByIds` to fetch them.
- The fetched `card` and `children` are passed as props to client component `CardDetailPage` rendering the final view. 

✅ 
- Conditional Render - Render page based on components.
  - Title - Render first
  - Subtitle - If present, render next
  - Cover image - If present, render next
  - Content - If present, render using TipTapRenderer.
  - Gallery - If present, render swiper
    ⭕2 - Change to grid?
  - Children - If present, render
  - Explore more... ⭕2 - Reduce font
  - Related - Display 3 random from filter  ⭕2 - Reduce box size
  - Explore - Display 3 random outside filter  ⭕2 - Reduce box size
⭕3 User Interaction - add user interaction - Like, comment, sharelink

## **Administration**
=======================================
- Top navigation `Admin` button navigates to Adminsitration, admin-only CRUD/Bulk editing of cards, tags, media, theme, maintenance.
`src/app/admin/layout.tsx`

✅
- navigation to Cards, Media, Tags, Questions, Theme, Users, Maintenance
⭕2 - Separate Content/Admin is awkward. 
⭕2 - Maintenance scripts are not helpful.

### **Card System**
=======================================
- All business logic on the server-side (`cardService`) 
- The data model is denormalized to support complex filtering

**Card Data Model**
✅ 
- Collection - `cards`
- Schema - `src/lib/types/cards.ts`
⭕2 Child Strategy - not fully defined. 
    - Nest cards to contain related stories. 
    - Nesting allows ordering, as opposed to filtering that does not (other than time)
    - Assign with modal filter with selection
    - Drag and drop ordering
    - Bulk assign possible?
    - If a parent card is deleted, the children just don't belong anymore--no issue.

**Card Management** 
- List, create, edit, bulk actions
`/app/admin/card-admin/` 

✅ 
- Search by title ⭕2 - Can this work as type? Also, move to right of "All Types" filter.
- Filter by Status and Type - `CardProvider` uses the `selectedFilterTagIds` to query `filterTags` map.
- Bulk Operations - `BulkEditTagsModal.tsx` — union of tags on selected cards, stable fetch key, tag-only API does not touch content.
- CoverIcon, Title, Type, Status
- Tags - Root tags by dimension
- Content - y/n
- Gallery -  #
- Children - #
- Actions
  - Edit button
  - Delete button 
  - Add button - `AdminFAB.tsx` 
- Pagination - Load more... 

**Card New/Edit** 
New - `/admin/card-admin/new`
Edit - `src/app/admin/card-admin/[id]/CardAdminClientPage.tsx`
`CardForm.tsx` is rendered, wrapped in `CardFormProvider` to manage form state.
✅
- Title, Subtitle
- Excerpt - ⭕2 Default excerpt to first x characters, with override
- Type - `story`, `gallery`, `qa`, `quote`, `callout`
- Status - `draft`, `published`
- displayMode - `static`, `inline`, `navigate`
- Cover Image
  - `CoverPhotoContainer` and `PhotoPicker` to select/upload image.
  - Image used for preview card and view page header.
  - ✅ Paste/Drag — cover: `CoverPhotoContainer` (outer focus target + dropzone, clipboard `files` + `items`); body: `RichTextEditor` / TipTap (`clipboardImage.ts` helper). `POST /api/images/browser`.
  - Stores references, not the images.
  - Adjusts and stores objectPosition
  - No caption
- Content
  - Rich text editing - `TipTap`
  - Inline embedded images, stores string array of `docId` only
  - Rest of content held in HTML
  - Captions default to media object with override stored in card `figure`
- Tags
  - `MacroTagSelector`- Modal Selector
  - Tag Selection - `Card.tags` - Stores the tags directly assigned by the user
  - Denormalization - On card save, `cardService` uses `tagService.ts` to calc/save derived tag data onto `Card`.
    - Tag Filter - `Card.filterTags` - Map of all inherited tags for efficient querying.
- Gallery
    - Uses `GalleryManager` and `PhotoPicker` for multi-image selection.
    - Drag n drop order
    - Stores gallery as `galleryMedia[]` (`mediaId`, `order`, optional per-slot `caption` / `objectPosition`; omitted fields inherit from the media doc).
    ✅ Import Folder as Card – `ImportFolderModal`, folder tree picker, normalization (yEdited→xNormalized), duplicate detection (overwrite/cancel).
    ✅ Caption and focal: inherit from media by default; optional per-slot override in the gallery edit modal (see Item 12 note).
- Children - Search only (not useful) - ⭕2 - Develop linking modal
- Actions
  - Delete - Delete card, remove tags/recalc, remove from any parents, remove related media
  - Cancel - Abandon any outstanding edits and return to list. 
  - Save - Save card, save tags/recalc, add media

## 6. IMAGE LIFECYCLE & TECHNICAL FLOWS

[Source] → [Import] → [Firebase Storage + Firestore] → [API Hydration] → [Client Display]

### Import Entry Points
- `imageImportService.ts` — central import (PhotoPicker, paste/drop, local drive)
- Creates Media doc in Firestore, uploads to Firebase Storage
- **Folder Import**: `importFolderAsCard()` — normalize (yEdited→xNormalized), import via `importFromLocalDrive`, build gallery + cover

### Hydration (cardService.ts)
| Mode       | Hydrates                                       | Use Case                          |
|------------|------------------------------------------------|-----------------------------------|
| full       | coverImage, galleryMedia[].media, contentMedia | Content feed, search, card detail |
| cover-only | coverImage only                                | Admin list (thumbnails)           |

### Display
- `JournalImage` — next/image with unoptimized (avoids 403 from Firebase)
- `getDisplayUrl(photo)` — storageUrl → url → transparent pixel fallback
- **Cover aspect ratios:** Edit/view 4:3; feed thumbnail 1:1
- **Focal point:** Pixel coords {x, y}; converted to object-position per aspect ratio

### Pre-Import Scripts (Local Filesystem)
- `create-photo-folders.bat` — xNormalized, yEdited, zOriginals
- `normalize-images.bat` / `npm run normalize:images` — optimize, extract metadata to JSON, convert to WebP
- `extract-metadata-improved.bat` — metadata only
- See `METADATA_EXTRACTION_README.md` and `normalize-images-README.md`

### Media-Card Reconciliation
When cards and media get out of sync, use reconciliation scripts. See MediaCardReconciliation.md. Run `npm run reconcile:media-cards -- --diagnose`.

### Checklist for Mass Import
- [ ] Media schema stable; all Media docs have `storageUrl`
- [ ] Hydration correct for each view (full vs cover-only)
- [ ] `getDisplayUrl` handles missing/invalid URLs (transparent pixel)
- [ ] Existing media backfill: `npm run backfill:media-metadata`

### Known Gaps
- **Legacy media:** Older docs may use `url` instead of `storageUrl`; `getDisplayUrl` falls back
- **Storage URL:** Permanent public URL. Set from storagePath during card hydration and Media API. Requires Firebase Storage rules for public read.
- **Content images:** Hydrated via `hydrateContentImageSrc`; TipTap content uses media IDs in HTML

## 8. ECOSYSTEM TRACES (Add/Change/Delete)

### Cover Image
- **Add:** CoverPhotoContainer → upload/select → onChange(media) → Save → updateCard with coverImageId
- **Change:** Same path; replace or adjust focal point
- **Remove:** onChange(null) → coverImageId: null in payload. Direct update after transaction (transaction writes had persistence issues). Must also clear any legacy embedded coverImage from document.

### Gallery
- **Add:** GalleryManager/PhotoPicker → select → onUpdate → Save → updateCard with galleryMedia
- **Remove:** Filter from galleryMedia, Save
- **Folder import:** ImportFolderModal → importFolderAsCard → createCard with gallery + cover

### Content (Inline Images)
- **Add:** RichTextEditor insertImage → TipTap FigureWithImage → data-media-id in HTML → extractMediaFromContent
- **Remove:** Delete from editor → HTML updated → server re-extracts contentMedia
- **Note:** Server always overwrites contentMedia from extractMediaFromContent(content). Bulk tag update sends { tags } only — content omitted — and currently wipes contentMedia. **Bug:** Preserve contentMedia when content is omitted.

### Card Deletion
- Decrements tag counts, removes from parents' childrenIds, deleteMediaAsset for each, deletes card, then Storage cleanup

### Media Deletion (via Media Admin)
- **Bug:** Deletes media doc and Storage file but does NOT update cards. Orphaned references created. Should query cards, block or update references before delete.

### **Tag System**
===========================================
- All cards [and images] are assigned multiple, dimensional, and heirarchical tags to enable flexible filtering. 
- All business logic on the server-side in `tagService` 

**Tag Data Model**
✅ 
- Collection - `tags` canonical tag data
- Schema - `src/lib/types/tag.ts`

- Tags are dimensional and heirarchical
    - dimensional
      - who
      - what
      - when
      - where
      - reflection
    - hierarchical
      - Parents
        - Father
        - Mother
      - Children
        - Son 
        - Daughter

**Tag Administration**
`/app/admin/tag-admin/page.tsx`

✅ 
- Hierarchical View - The page renders all tags in a tree structure using `TagAdminList`
- Drag-and-Drop Reordering/Reparenting - `SortableTag.tsx`
- Inline editing - `TagAdminRow.tsx`
  - OnDelete - User choice of children being promoted or cascade deleted
  - OnMove - Updates parent and order and recalcs tag card counts
⭕2 - Can Tags be edited on the Card/Image?

**Card-Level vs Image-Level Tags** ⭕2 Add and integrate image tags.
- Tags currently reside at the card level only; no per-image tags.
- **Need:** In gallery cards, different images may feature different people. WHO varies most at the image level. A family album card might have images of Mom+Kids, Dad+Grandma, or just the dog—card-level WHO loses that granularity.
- **Roll-up (image → card):**
  - **WHO only** – Union of people across all images rolls up to the card. Card's WHO = "who appears in this album."
  - WHAT, WHEN, WHERE do *not* roll up—multiple images would mean multiple moments/places; rolling up would be noisy and incoherent.
- **Roll-down (card → image):**
  - Card's WHAT, WHEN, WHERE can roll down as defaults for each image.
  - Card's WHO can roll down as default; images may override with image-specific WHO.
- **Filtering:** "Show cards with Mom" = card WHO contains Mom **or** any image-level WHO contains Mom.
- ⭕2 - Add **Face Recognition**
- Options:
  - **Cloud APIs:** Azure Face, AWS Rekognition, Google Cloud Vision (detection; recognition requires custom face DB). Integrate to suggest/auto-populate WHO at image level; faces map to person tags.
  - **Client-side:** face-api.js (TensorFlow.js). Runs in browser, no uploads; lower accuracy than cloud.
  - **Apple/Google Photos:** Native face recognition; would require overlay integration to leverage.

**People Hierarchy (WHO dimension)** ⭕3
- See `RelationshipImputation.md` – derive family relationships from minimal primitives (`parent_of`, `spouse_of`).
- Store only primitives; compute uncle, cousin, step-parent, etc. via inference rules.
- Maps to WHO dimension; supports "photos of Grandma" or "stories about Mom's side."
#### Relationship Imputation from Core Primitives
##### 4. Half-siblings

- **half_sibling_of(A, B)** ↔ share exactly one parent (intersection of parent sets non-empty, but not both parents)

##### 5. In-laws (optional, also derivable)

- **parent_in_law_of** ↔ parent of spouse
- **sibling_in_law_of** ↔ sibling of spouse
- etc

##### Practical Model

**Stored edges:**

1. `parent_of(personId, childId)` — optionally with `type`: biological, adoptive, step, social
2. `spouse_of(personId, personId)` — optionally with dates, status (current, divorced, widowed)

**Step-parents:** Two approaches:

- **Option A (implicit):** Robin parent_of Wesley; Mark spouse_of Robin; Mark is *not* parent_of Wesley → infer Mark step_parent_of Wesley.
- **Option B (explicit):** Add `parent_of(Mark, Wesley, type: 'step')` for clarity, but spouse_of still validates consistency.

##### Edge Cases to Handle

| Issue | Handling |
|-------|----------|
| Multiple paths | George→Bob→Alan via two routes: pick “primary” path or show all (e.g., “grandfather and also …”) |
| Gender for labels | Store gender if you want “uncle” vs “aunt”, “nephew” vs “niece” |
| Adoptive vs biological | Add `type` to `parent_of` |
| Divorce/remarriage | `spouse_of` with status; step relationships may change over time |
| Same-sex parents | Model works: two parents, both `parent_of` the same child |
| Unknown parent | Allow null; some relationships (e.g., half-sibling) may be undetermined |
| Cycles | Validate on write to avoid parent_of cycles |

##### Optional Refinements

| Primitive | Purpose |
|-----------|---------|
| **biological_parent_of** | When genetic/legal ancestry differs from social parent |
| **partner_of** | Distinguish from spouse (e.g., long-term partner, ex-spouse) |
| **domestic_partner_of** | For specific legal/social categories |

##### Implementation Options

- **On-demand:** When asking “How is X related to Y?”, run inference once.
- **Materialized:** Periodically or on change, precompute and store inferred relationships.
- **Path-based:** Store only paths (e.g., through parent_of), then classify the path as “grandparent”, “uncle”, “cousin”, etc.

##### Example: Full Derivation Chain

- George parent_of Bob, Bob parent_of Alan → **George grandparent_of Alan**
- William child_of Alan, Scot sibling_of Alan → **Scot uncle_of William**, **William nephew_of Scot**
- Steven child_of Scot → **William cousin_of Steven**
- Mark spouse_of Robin, Robin parent_of Wesley, ¬Mark parent_of Wesley → **Mark step_parent_of Wesley**

⭕2 **Visual tagging:** Select images and assign tags in bulk (see Media Admin / card workflows).

### **Question Management**
- Questions are prompts for stories.

✅ **MVP (implemented)**
- Firestore collection `questions`; types in `src/lib/types/question.ts`, service in `src/lib/services/questionService.ts`
- Admin UI: **Admin → Questions** → `/admin/question-admin`
- APIs (admin-only): `GET/POST /api/admin/questions`, `PATCH/DELETE /api/admin/questions/[id]`, link card `POST`, unlink `PUT`; `POST .../create-card` creates a draft `qa` or `story` card from the prompt and links usage
- List/filter in UI: text, tags (substring), used vs unused
- Manual link/unlink to existing card IDs; **Create card** for new drafts
- **Cleanup:** deleting a card removes its id from every question’s `usedByCardIds` (and refreshes `usageCount`)

⭕3 **Post-MVP (still open)**
- Answer workflow beyond cards, analytics, templates, validation, viewer feedback, auto-grouping

❓ *(Historical; MVP resolved below)*
- Selecting a question creates a card — **yes** via Create card + `create-card` route.
- Existing stories: use **Link card** with the card’s doc id.
- Card deleted — **handled** in `deleteCard` + `unlinkCardFromAllQuestions`.
- Group short questions — **no** in MVP; use question `tags` first.

#### MVP Question Management (proposed and approved)

**Goal**
- Keep this lightweight: maintain a reusable question bank and track whether a question has already been used to produce a story/QA card.

**Scope (MVP)**
- Single admin authors/manages questions.
- Viewers do not manage questions directly.
- Questions can be linked to cards to mark usage.

**Data model (MVP)**
- Collection: `questions`
- Fields:
  - `prompt` (string, required)
  - `prompt_lowercase` (string, indexed/search helper)
  - `tags` (string[]; optional)
  - `usedByCardIds` (string[]; optional)
  - `usageCount` (number; derived/convenience)
  - `createdAt`, `updatedAt` (number timestamps)

**Admin workflow (MVP)**
- List/filter questions: by text, tags, and used/unused.
- Create/edit questions.
- "Create card from question" action:
  - Creates a new card prefilled from `prompt` (default type `qa` or `story` as chosen in UI).
  - Adds card ID to `usedByCardIds` and updates `usageCount`.
- Manual link/unlink between question and card (for existing stories already in DB).

**Rules**
- A question may map to zero, one, or many cards.
- "Used" means `usedByCardIds.length > 0`.
- If a linked card is deleted, remove that ID from `usedByCardIds` (cleanup hook or maintenance script).
- No automatic grouping in MVP; use tags for organization first.

**Out of scope (post-MVP)**
- Viewer submissions/feedback flows.
- Rich analytics dashboard.
- Advanced answer validation/scoring.
- Auto-clustering/grouping of short questions.

### **Gallery Style Management**
- Gallery styles are selectable styles for gallery cards

✅
- None

⭕3 - Devise preconfigured card styles for selection
  
### **Theme Management**
- Themes customizable.

✅
- Light/Dark toggle
- Admin page
- MSN Layout style

### **User Management**

✅ **Journal users (implemented)**
- Firestore `journal_users`; `src/lib/auth/journalUsersFirestore.ts`; `authorize` in `authOptions.ts` (DB first, legacy env only when no row for that username)
- Admin **Users** tab → `/admin/journal-users`; APIs `/api/admin/journal-users`, `/api/admin/journal-users/[id]`
- Viewers only from UI/API; single admin rule; seed script `npm run seed:journal-users`
- Login redirect: `/?callbackUrl=/admin` supported in `Home.tsx` (wrapped in `Suspense` on the home page)

### **Image Management**
=======================================
#### **Conceptual Architecture**
- Source images reside in various *external sources* --local, OneDrive, Google, Apple, etc.
  - Current implementation sources from *local drive* (mirrored from OneDrive)
- Images are imported (picker or paste/drop) and assigned to fields in cards
- The *generic service layer* to external sources provides:
  - Connecton
  - Read and present media
  - Browse and select media
  - Import and *sharp* process the media to firebase
      - prepare *metadata* 
      - mark 'temporary'
      - return `mediaId` to card for storage and object for immediate display
  - Optimize performance through `next/image`, caching, auto-sizing and lazy loading.
- Images served to content via Firebase ID/URLs

#### **Media Data Model**
✅
- Collection - `media`
- Schema  - `src/lib/types/photo.ts`
- Local Drive Integration 
- Photopicker Integration
- `imageImportService.ts`
- Sharp image processing  
- Metadata extraction
- Error handling
- `next/image`
⭕1 objectPosition for preview card view?

#### **Media-Card Reconciliation** ✅
- ⭕ - Clean up orphaned media (100+). Can leave them if normalized. Else, delete and re-import normalized.


**Normalization**
⭕1 Organize, normalize, edit images pre-import
    - 3 directories - zOriginals, yEdited, xNormalized
    - Move originals to zOriginals
    - Copy originals to yEdited
    - Edit (GIMP - Crop, clean, Topaz - sharpen) as needed 
    - Import and have script 
      - normalize yEdited to xNormalized
      - extract metadata to json
      - sharpen
      - lighting
      - convert to webP
⭕2 - Batch upload images to cards or bank

## **Other Ideas & UX Improvements**
=======================================
*(In no particular order)*

**Tags**
- ✅ Add tags on the fly – **Done** in **Edit Tags** (card form) and **bulk tag** modals: create root or child tags per dimension (`TagPickerDimensionColumn`, `POST /api/tags`). Tag Admin remains for hierarchy, reorder, and reparent.

**Editing**
- ⭕ Edit from card view – Edit everything directly from the content/card view, not only from Admin.
- ⭕ Exit edit page – Pressing Cancel to leave is awkward; consider alternative (e.g. Back, X, or auto-save with "Done").

**Navigation**
- ⭕ Chronological tree – Provide tree in chron order (Year / Month / What) for browsing.
- ⭕ Back button – When view page is scrolled down and back up, Back button doesn't fully display. Consider sticky/fixed so it doesn't scroll with page (always visible for exit).

**Content View**
- ⭕ Alternate content view (mosaic) – Emulate Apple/Google Photos mosaic layout.
- ⭕ Gallery display – On mobile, galleries scroll left-right. In page view, images may not fit containers well. Mosaic may be better for page view to see all images; keep swipe for feed/cards.
- ⭕ Discover More – Reduce font size (currently larger than Gallery title, equal to page title). Reduce tile size? Reduce count to 2?

**Card Titling**
- ⭕ Reconsider titling – Some cards include dates (Aquarium 2018, Aquarium 2008), some do not (Appalachian State). Consistent approach? Show tags as overlay on cards?

## 9. KNOWN BUGS & ISSUES

| # | Bug | Severity |
|---|-----|----------|
| 1 | ~~Cover removal not persisting (legacy embedded coverImage; hydration doesn't clear when ID null)~~ | ✅ Fixed: hydration clears coverImage when coverImageId falsy; update uses FieldValue.delete() |
| 2 | ~~Bulk tag update clears contentMedia~~ | ✅ Fixed: preserve contentMedia when content omitted |
| 3 | ~~Media delete leaves orphaned card references~~ | ✅ Fixed: referencedByCardIds on media; delete removes refs from cards (Option B) |

### Data Flow: Card Edit → Firestore (from DataFlowAssessment)

**Problem:** Cover image removal does not persist to Firestore despite PATCH returning 200.

**Full Data Path:**

**1. Load (Firestore → Form)**
```
Firestore (cards/...)
  → GET /api/cards/[id]
  → getCardById() → docSnap.data() → _hydrateCards()
  → Response with card (include coverImage)
  → SWR cache (key: /api/cards/[id])
  → CardAdminClientPage: card = useSWR data
  → CardFormProvider: initialCard = card
  → Form state: merged from initialCard (coverImageId, coverImage)
```

**2. Edit (User removes cover)**
```
CoverPhotoContainer: handleRemovePhoto() → onChange(null)
  → CardForm: handleCoverImageChange(null)
  → CardFormProvider: updateCoverImage(null)
  → formState.cardData: { coverImageId: null, coverImage: null, coverImageFocalPoint: undefined }
```

**3. Save (Form → Firestore)**
```
CardForm: handleSubmit() → handleSave()
  → validateForm(dataToSave)
  → dehydrateCardForSave(dataToSave) → payload
  → onSave(payload) = CardAdminClientPage.handleSave
  → fetch PATCH /api/cards/[id] { body: JSON.stringify(payload) }
```

**4. API (PATCH handler)** → body = await request.json() → validatedData = cardUpdateSchema.parse(body) → updateCard(id, validatedData)

**5. updateCard (cardService)** → updatePayload → validatedUpdate → cleanedUpdate → isClearingCover → transaction.update or direct update when clearing → getCardById → return updatedCard

**6. Response → Client** → mutateCard(savedData, false); globalMutate for list revalidation

**Caching / SWR:**
- List: CardProvider uses useSWRInfinite for /api/cards?*
- Edit page: useSWR for /api/cards/[id]
- After save: mutateCard(savedData, false) — do NOT revalidate the card
- List invalidation: globalMutate with revalidate: true
- Cache should not prevent the Firestore write; it only affects what the client displays.

**Simplification (if diagnostic script confirms Firestore accepts update):**
1. Bypass transaction for cover-only changes — direct docRef.update({ coverImageId: null }) outside full transaction.
2. Single source of truth — ensure form always sends complete card state on save, not a diff.
3. Audit all card write paths — ensure no other code overwrites the card between our write and user's view.

## 10. STABILITY & SCALE

### Completed
- Media API: count aggregation, cursor pagination
- cleanup-media: batch chunking (500 limit)
- Import Folder: per-folder limit, parallel imports
- PhotoPicker/useImageImport: chunked uploads
- bulkUpdateTags: chunked transactions
- deleteMultipleMedia: parallelized
- Paste/drag upload (cover + rich-text body): `getImageFileFromDataTransfer` in `clipboardImage.ts`

### Open
- Import Folder: requires filesystem (ONEDRIVE_ROOT_FOLDER); won't work on Vercel/Netlify as-is
- Large galleries: consider lazy-loading beyond first N
- Firestore indexes: verify composite indexes for media filters
- Backfill media metadata for legacy docs [may opt to delete and start over]

### Scripts Reference
See Section 7 for reconciliation scripts. Also: `npm run normalize:images`, `extract-metadata-improved.bat`.

## 11. FUTURE CONSIDERATIONS

### Card-Level vs Image-Level Tags
- WHO may vary at image level (gallery: different people per image). Roll-up to card; roll-down defaults.
- Face recognition options: Cloud APIs or client-side (face-api.js).

### Relationship Imputation (WHO dimension)
- Store primitives: `parent_of`, `spouse_of`
- Derive: grandparent, sibling, uncle, cousin, step-relations
- See RelationshipImputation.md for inference rules. Implement on-demand or materialized.

### Advanced
- Content recommendations, social sharing, export/backup
- Search, filtering, scalability

---

## 12. OPEN QUESTIONS & DECISIONS

1. **Selection vehicle:** PhotoPicker vs visual grid vs both — which is primary for "create from selection" and "add to card"?
2. **UI direction:** How far toward Apple/Google Photos style? Grid as default for media?
3. **Where assigned:** Denormalized field on media (`assignedToCard: boolean` or `assignmentType`) or computed at query time?
4. **Admin vs content:** When to allow direct editing from content view vs requiring Admin?
  **Resolved (current):** Admin authoring is **desktop-only** (`AdminDesktopOnlyGate`; admin links hidden below the nav breakpoint). **`/view` stays read-only** for structure; cards are edited in **Admin** (`/admin/card-admin/.../edit`). Full **inline story/body** editing on the content page is not planned until needs change.
5. **Navigation:** Keep dimension tabs or evolve?
6. **Project.md alignment:** Ongoing; Implementation Summary and open questions updated as direction firms (e.g. Item 11 / admin vs content).

---

## ECOSYSTEM TRACES (Detailed Flow Tables)

### 1. COVER IMAGE FLOW

### 1.1 ADD Cover Image

| Step | Location                | What Happens |
|------|----------|--------------|
| 1 | `CoverPhotoContainer.tsx`  | User drops/pastes/selects image → `uploadFile()` or `handlePhotoSelect()` |
| 2 | `fetch('/api/images/browser', POST)` | FormData with file |
| 3 | `api/images/browser/route.ts` | `importFromBuffer()` |
| 4 | `imageImportService.importFromBuffer()` | Creates Media via `createMediaAsset()` → Firestore `media` + Firebase Storage |
| 5 | Returns `{ mediaId, media }` |
| 6 | `CoverPhotoContainer` | `onChange(media, '50% 50%')` |
| 7 | `CardForm.handleCoverImageChange` | Computes focal point (pixel coords), calls `updateCoverImage(newCoverImage, focalPoint)` |
| 8 | `CardFormProvider.updateCoverImage` | Sets `coverImage`, `coverImageId`, `coverImageFocalPoint` in form state |
| 9 | User clicks Save | `handleSave` → `dehydrateCardForSave` → `onSave(payload)` |
| 10 | `CardAdminClientPage.handleSave` | `PATCH /api/cards/[id]` with payload |
| 11 | `cardService.updateCard()` | `'coverImageId' in cardData` → include in payload; activates media; updates media.objectPosition if focalPoint provided |
| 12 | Firestore | `transaction.update(docRef, cleanedUpdate)` |

**Status:** ✅ Flow is coherent. Media created, card updated, references stored.

---

### 1.2 CHANGE Cover Image (replace or adjust focal point)

| Step | Location | What Happens |
|------|----------|--------------|
| 1 | `CoverPhotoContainer` | User clicks "Change" → PhotoPicker → `onChange(newMedia)` or slider → `onChange(coverImage, newPosition)` |
| 2 | Same as ADD from step 6 onward | Focal point derived from %, stored as pixel coords |

**Status:** ✅ Same path as ADD; no extra logic for replace.

---

### 1.3 REMOVE Cover Image (bug: not persisting)

| Step | Location | What Happens |
|------|----------|--------------|
| 1 | `CoverPhotoContainer.handleRemovePhoto` | `onChange(null)` |
| 2 | `CardForm.handleCoverImageChange` | `updateCoverImage(null)` |
| 3 | `CardFormProvider.updateCoverImage` | `coverImageId: null`, `coverImage: null`, `coverImageFocalPoint: undefined` |
| 4 | User clicks Save | `dehydrateCardForSave` → `coverImageId: raw.coverImageId ?? null` → **payload has `coverImageId: null`** |
| 5 | `PATCH /api/cards/[id]` | Body includes `coverImageId: null` |
| 6 | `cardUpdateValidationSchema.parse(body)` | Zod accepts `null` (nullable) |
| 7 | `cardService.updateCard` | `'coverImageId' in cardData` → true; `updatePayload.coverImageId = null` |
| 8 | `removeUndefinedDeep(validatedUpdate)` | `null !== undefined` → **keeps `coverImageId: null`** |
| 9 | `isClearingCover = (coverImageId === null \|\| undefined)` | true |
| 10 | `cleanedUpdate.coverImageId = FieldValue.delete()` | Firestore delete sentinel |
| 11 | `transaction.update(docRef, cleanedUpdate)` | Should remove `coverImageId` and `coverImageFocalPoint` from document |

**Expected:** Cover removed in Firestore. **Observed:** Cover remains after save.

**Potential causes (no definitive code bug found):**
- **A. CardFormProvider re-sync:** `useEffect` only updates form when `docId` changes. After save on same card, form does *not* re-sync from `initialCard`. If `initialCard` later gets stale data (e.g. SWR revalidate race), the effect wouldn’t overwrite anyway because docId is same. **Low likelihood.**
- **B. Cover merge when null:** Initial state uses `...(initialCard.coverImageId != null && { coverImageId })`. When `coverImageId` is `null`, we do *not* spread it. If `initialCard` comes from a response that still has the old `coverImageId` (e.g. cache), and we ever re-merge, we could overwrite with the old value. But the main save path uses `formState.cardData` directly, which has `null`. **Unclear.**
- **C. Payload omission:** If `dehydrateCardForSave` or the request drops `coverImageId` when it’s `null`, the server would treat it as "omit" and not clear. `dehydrateCardForSave` sets `coverImageId: raw.coverImageId ?? null` unconditionally, so `null` should always be sent. **Verify in network tab.**
- **D. Firestore `FieldValue.delete()`:** Logic appears correct. **Verify in Firestore console** that the document actually loses `coverImageId` after save. [yes, it does.]
- **E. SWR / cache:** `mutateCard(savedData, true)` uses server response. If the response is built from a stale read or wrong card, UI could show old cover. **Check response body and Firestore state.**

**Recommended diagnostics:**
1. Network tab: confirm `PATCH` body contains `"coverImageId": null`.
2. Firestore console: after save, confirm card document has no `coverImageId` field.
3. Add logging in `updateCard` before `transaction.update`: log `isClearingCover` and `cleanedUpdate.coverImageId`.

---

## 2. GALLERY MEDIA FLOW

### 2.1 ADD Gallery Images

| Step | Location | What Happens |
|------|----------|--------------|
| 1 | `GalleryManager` or `PhotoPicker` | User selects images; import via `/api/images/browser` or local import |
| 2 | `GalleryManager.onUpdate` | `setField('galleryMedia', newGallery)` with hydrated items |
| 3 | Save | `dehydrateCardForSave` strips `media` from each item; sends `mediaId`, `order`, optional `caption`, optional `objectPosition` (**omit** = inherit **`media.caption`** / **`media.objectPosition`**) |
| 4 | `updateCard` | `'galleryMedia' in cardData` → includes; `dehydratedGalleryMedia`; activates all media |

**Status:** ✅ Flow is coherent.

### 2.2 REMOVE Gallery Image

| Step | Location | What Happens |
|------|----------|--------------|
| 1 | `GalleryManager` | `onUpdate(galleryMedia.filter(item => item.mediaId !== mediaId))` |
| 2 | Save | Payload has smaller `galleryMedia` array |
| 3 | `updateCard` | Replaces `galleryMedia` in Firestore |

**Status:** ✅ Removed items are no longer in the array. Media docs are **not** deleted when removed from gallery; they stay in `media` collection.

### 2.3 IMPORT FOLDER AS CARD

| Step | Location | What Happens |
|------|----------|--------------|
| 1 | `ImportFolderModal` | User picks folder; preview; confirm |
| 2 | `api/import/folder/route.ts` or batch | `importFolderAsCard()` |
| 3 | `importFolderAsCard` | Normalizes (yEdited→xNormalized), imports via `importFromLocalDrive`, builds `galleryMedia`, `coverImageId: firstMediaId` |
| 4 | `createCard` or `updateCard` | Card created/updated with gallery and cover |

**Status:** ✅ Flow is coherent; duplicate handling and metadata captions are in place.

## 3. CONTENT MEDIA (inline images in rich text)

### 3.1 ADD Content Image

| Step | Location | What Happens |
|------|----------|--------------|
| 1 | `RichTextEditor` | User adds image via `editorRef.insertImage(media)` |
| 2 | TipTap `FigureWithImage` | Inserts `<figure data-media-id="…">` into HTML |
| 3 | `handleContentChange` | `extractMediaFromContent(content)` → `updateContentMedia(mediaIds)` |
| 4 | Save | `content` has embedded media; `dehydrateCardForSave` uses `contentMedia` from `raw`; server re-derives from `extractMediaFromContent(sanitizedContent)` |

**Note:** Server **always** overwrites `contentMedia` from `extractMediaFromContent(content)` in `updateCard`. It does not use client `contentMedia` directly.

### 3.2 REMOVE Content Image

| Step | Location | What Happens |
|------|----------|--------------|
| 1 | User deletes image from editor | HTML no longer has that `<figure>` |
| 2 | `extractMediaFromContent` | Returns smaller list |
| 3 | `updateContentMedia` | Form state updated |
| 4 | Save | Server re-extracts from content; `contentMedia` updated |

**Status:** ✅ Driven by HTML content.

## 4. CARD DELETION

| Step | Location | What Happens |
|------|----------|--------------|
| 1 | `CardAdminClientPage.handleDelete` | `DELETE /api/cards/[id]` |
| 2 | `cardService.deleteCard` | Gets card; collects `coverImageId`, `galleryMedia[].mediaId`, `contentMedia` |
| 3 | Transaction | Decrements tag counts; removes card from parents’ `childrenIds`; `deleteMediaAsset(mediaId, transaction)` for each; deletes card doc |
| 4 | Post-transaction | Tries to delete files from Storage; falls back to `markStorageForLaterDeletion` |

**Status:** ✅ Card and its media are deleted; parents updated.

## 5. MEDIA DELETION (via Media Admin)

| Step | Location | What Happens |
|------|----------|--------------|
| 1 | Media Admin | `DELETE /api/images/[id]` |
| 2 | `deleteMediaAsset(mediaId)` | Deletes media doc and Storage file |
| 3 | **Cards** | **NOT UPDATED** – any card with `coverImageId`, `galleryMedia`, or `contentMedia` still references the deleted media |

**Status:** ❌ **BUG.** Orphaned references are created. Reconcile script can fix, but deletion should clear or warn about card references.

## 6. BULK TAG UPDATE

| Step | Location | What Happens |
|------|----------|--------------|
| 1 | `BulkEditTagsModal` | Fetches cards via `GET /api/cards/by-ids`; initial checkboxes = **union** of tags on all selected cards (not intersection—saving no longer drops tags that were only on some cards). Stable `cardIds` key avoids refetch when the parent passes a new array each render. |
| 2 | Save | `POST /api/cards/bulk-update-tags` with `{ cardIds, tags }` — **same tag array applied to every selected card** |
| 3 | Route | `updateCard(cardId, { tags })` for each card |
| 4 | `updateCard` | Payload is tag-only; **`content` / `contentMedia` are omitted** unless `content` is in `cardData`. `cardSchema.partial().parse` leaves other fields out of the Firestore update. |

**Status:** ✅ **OK.** Tag-only bulk updates do not clear body content or `contentMedia`. (Older docs incorrectly assumed `contentMedia` was always rewritten.)

## 7. FIELDS AND FIRESTORE

### Update semantics in `cardService.updateCard`

- **Present in payload:** Overwrites stored value.
- **`null`:** Treated as “clear”; uses `FieldValue.delete()` for cover.
- **Omitted:** Leave existing value unchanged.

### What is derived vs stored

| Field                             | Stored         | Derived |
|-----------------------------------|----------------|-------------------------------------------|
| `coverImageId`                    | Yes            | No                                        |
| `coverImageFocalPoint`            | Yes            | Derived from media when missing           |
| `coverImage`                      | No (transient) | Hydrated from media                       |
| `galleryMedia`                    | Yes (IDs + metadata) | `media` hydrated per item           |
| `contentMedia`                    | Yes            | Re-derived from `content` on every update |
| `filterTags`, `who`, `what`, etc. | Yes            | Recalculated from `tags` on save          |

## 8. BUGS SUMMARY

| # | Bug | Severity | Location |
|---|-----|----------|----------|
| 1 | ~~Cover removal not persisting~~ ✅ | Fixed | cardService: hydration + FieldValue.delete() |
| 2 | ~~Bulk tag update clears `contentMedia`~~ ✅ | Fixed | cardService: conditional contentMedia update |
| 3 | ~~Media delete leaves orphaned card references~~ ✅ | Fixed | referencedByCardIds + deleteMediaWithCardCleanup |

## 9. RECOMMENDED FIXES

### Fix 1: Bulk tag update – preserve contentMedia when content is omitted

In `cardService.updateCard`, only overwrite `contentMedia` when `content` is in the payload:

```ts
// Instead of always:
contentMedia: contentMediaIds,

// Use:
...('content' in cardData ? { contentMedia: contentMediaIds } : {}),
```

And ensure `content` is not overwritten when omitted (it currently is via `content: sanitizedContent` when undefined – should also be conditional).

### Fix 2: Media delete – update or block when cards reference media

Before deleting media:

1. Query cards where `coverImageId == mediaId` or `galleryMedia` or `contentMedia` contains it.
2. Option A: Block deletion if any card references it; return 409 with list of cards.
3. Option B: Update those cards to remove the reference, then delete media.

### Fix 3: Cover removal – add diagnostics

1. Log in `PATCH /api/cards/[id]`: `body.coverImageId`.
2. Log in `updateCard` before `transaction.update`: `isClearingCover`, `cleanedUpdate.coverImageId`.
3. In browser: Inspect `PATCH` request body for `coverImageId: null`.
4. In Firestore: Confirm card document after save.

## 10. PRE-BULK-IMPORT CHECKLIST

- [ ] Confirm cover removal persists (diagnostics above).
- [ ] Fix bulk tag update `contentMedia` wipe.
- [ ] Decide and implement media-delete behavior (block or update cards).
- [ ] Run `npm run reconcile:media-cards -- --diagnose` before and after bulk import.
- [ ] Validate `IMPORT_FOLDER_MAX_IMAGES` and folder import behavior for target volume.

---

## IMPLEMENTATION SUMMARY

*Consolidates todos from across this document in implementation order. Use legend: ✅ done, ⭕ planned (1=high, 2=medium, 3=low), ❓ open.*

### Phase A: Critical Fixes & Visual Workspace (current focus)

| Order | Item | Priority | See |
|-------|------|----------|-----|
| 1 | ✅ Fix cover removal not persisting | Done | cardService: hydration + FieldValue.delete() |
| 2 | ✅ Fix bulk tag update clearing contentMedia | Done | cardService: only overwrite contentMedia when content in payload |
| 3 | ✅ Fix media delete leaving orphaned card references | Done | referencedByCardIds + deleteMediaWithCardCleanup |
| 4 | ✅ Remove legacy embedded coverImage from card documents | Done | npm run remove:legacy-cover |
| 5 | ✅ Single visual workspace: grid/masonry, multi-select (Media + Cards admin) | Done | Media Admin, Card Admin |
| 6 | ✅ Create-from-selection: Select images → Create gallery card (1–2 clicks) | Done | Media Admin bulk actions |
| 7 | ✅ Content-first navigation: Content default; Admin/Theme behind user menu | Done | `Navigation.tsx`, `AppShell` |
| 8 | ✅ Fix Paste/Drag to upload image | Done | `CoverPhotoContainer`, `RichTextEditor`, `clipboardImage.ts` |

**Item 6 note:** Create-from-selection adds slots with **`mediaId` + `order` only** (no per-slot `caption`). Captions **inherit** from each media doc after the card is opened in the editor and gallery items are hydrated—same pattern as PhotoPicker.
**Item 7 note:** User menu closes on outside pointer-down and `Esc`. Logo uses `position: fixed` on desktop (viewport-left) so it does not shift with the explore sidebar.
**Item 9 note:** Unassigned/assigned uses **seek pagination** (forward `Next` only; no total count). Uses `referencedByCardIds` on media; legacy media without the field is treated as unassigned until backfilled or referenced.
**Item 9 polish (deferred, if needed):** (1) **Navigation:** Add true **Previous** for assignment seek mode (cursor stack or server support), and/or an explicit **“First page”** control so users are not limited to **Clear filters** to restart. (2) **Accuracy:** If old media docs skew the Unassigned list, run or extend a **backfill** so `referencedByCardIds` matches real card references (see maintenance / reconcile patterns).
**Item 10 note:** Library tab uses the same Media API as Media Admin (admin-only). **Google Photos** (or other sources) can be a third tab later; keep import paths behind a small **source** abstraction when adding OAuth/remotes.
**Item 10 polish (deferred):** Remember **This PC** folder-tree expansion across picker opens—for example persist expanded folder ids in `sessionStorage` (or similar) so users who use **Expand all** or open many branches do not have to redo that every time the modal opens. Clear or scope the key if the underlying folder tree identity changes.
**Item 11 note (closed — direction + workflow):** Original Item 11 (“inline tags, captions, stories from content/card view”) is **superseded** for now: no inline rich-text on **`/view`**; authors use **full card edit** in Admin. **Delivered in this arc:** **(1)** Admin **desktop-only** gate and nav hide on small viewports; **(2)** **Tag** picker modals—default **collapsed** dimension trees (`tagTreeExpansion.ts`, optional per-dimension depth), **create tag** (top-level or **+** child) in **Edit Tags** and **bulk** modals (`TagPickerDimensionColumn`, `MacroTagSelector` prefers `TagProvider` tags for collapsed summary); **(3)** **PhotoPicker** (This PC)—top-level folder expansion by default, **Expand all / Collapse all** (persistence still Item 10 polish); **(4)** Tag Management—**horizontal dimension columns**, tall scroll areas, **Shift-drag reparent** (keyboard + activator), **root reorder** scoped by dimension, empty-state per column; **(5)** `createTag`—require existing **parent** when `parentId` is set, **dimension** on roots, **sibling `order`** so new tags don’t jump to the top. **Item 14** (tags on the fly) is covered by the modals. Still open: content-view inline editing if ever revived.
**Item 12 note:** Gallery **caption** and **focal** share the same model: **media default → inherit → optional per-slot override**. Defaults live on the media doc (**`media.caption`**, **`media.objectPosition`**), editable in **Media Admin** (caption column + **Edit focal**); **`PATCH /api/images/[id]`** persists metadata. On the card, **`galleryMedia[].caption`** and **`galleryMedia[].objectPosition`** are **omitted** when the slot inherits; if present, they override for that card only. **Effective** display values use **`galleryObjectPosition.ts`**: `getEffectiveGalleryCaption` (key `caption` must exist on the slot for an override, including empty string to suppress visible caption while media still has text) and `getEffectiveGalleryObjectPosition`. Consumers include **`InlineGallery`**, **`SwipeableGallery`**, **`GalleryManager`** thumbnails, and **`V2ContentCard`** gallery preview. The gallery edit modal: typing in the caption field or moving focal sliders creates overrides; **Use media caption** / **Use media default** (focal) clears the slot field on save. **`dehydrateCardForSave`** / **`transformToCardUpdate`** omit inherited slots. **`updateCard`** no longer writes gallery caption edits back to the media document—Media Admin is the place to change the bank default.

### Phase B: Inline Editing & Picker

| Order | Item | Priority | See |
|-------|------|----------|-----|
| 9 | ✅ Unassigned filter (media not in cover/gallery/content) | Done | Media Admin “On cards”, `GET /api/media?assignment=`, `mediaAssignmentSeek.ts` |
| 10 | ✅ Unified Picker: Local + Library (Firestore) | Done | `PhotoPicker.tsx` (This PC | Library), `GalleryManager` order reindex on append |
| 11 | ✅ Admin / tag workflow (Item 11 scope closed) | Done | Item 11 note; desktop admin, picker + Tag Management UX; no inline body on `/view` |
| 12 | ✅ Gallery caption + focal (edit + view) | Done | Caption + focal: inherit from media when omitted on slot; per-slot override + reset in modal; `getEffectiveGalleryCaption`, `getEffectiveGalleryObjectPosition`, `parseObjectPositionPercent.ts`; `InlineGallery`, `SwipeableGallery`, feed preview |
| 13 | ✅ Fix BulkEditTagsModal bug | Done | Union (not intersection) initial tags; stable fetch key; doc corrected on `contentMedia` |
| 14 | ✅ Add tags on the fly (picker + bulk modal) | Done | `TagPickerDimensionColumn`, `/api/tags` POST; Tag Admin for structure |

### Phase C: Dimension Views, Mobile, Polish

**Item 15 (removed):** Alternate **Perspective** browse modes (sidebar Feed | Who | What | …) were **removed**; filtering via Explore + future **feed sort** (asc / desc / random) covers the same capability without a parallel UI.

| Order | Item | Priority | See |
|-------|------|----------|-----|
| 15 | *(open)* — e.g. feed sort (created asc/desc/random), mobile polish | 2 | Left Sidebar Navigation |
| 16 | Mobile: Bottom nav, dimension/tag sheet | 2 | Responsive Strategy, Navigation |
| 17 | Table of Contents: drag & drop for collections | 2 | Navigation System |
| 18 | Collection metadata (child counts), admin curation | 2 | Navigation System |
| 19 | Drop temporary/active media status; "where assigned" visibility | 2 | What Simplifies |
| 20 | Address ESLint, comment code, QA, host | 2 | Backend, Technical |

### Phase D: Later / Lower Priority

| Order | Item | Priority | See |
|-------|------|----------|-----|
| 21 | Image-level tags (WHO roll-up) | 2 | Tag System |
| 22 | Child strategy, linking modal | 2 | Card Data Model |
| 23 | Search (tags), sort by when | 2 | Content Page, Left Sidebar |
| 24 | Face recognition, Relationship imputation | 3 | Tag System |
| 25 | ✅ Question management (MVP), journal user management | Done | `/admin/question-admin`, `/admin/journal-users`, `questionService`, `journalUsersFirestore`, seed script |