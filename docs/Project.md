# PROJECT OVERVIEW

Legend:
- ✅ Implemented
- ⭕ Planned - Priority: 1, 2, 3
- ❓ Open Question

## Document Governance
- Project.md is the canonical project document for author and AI.
- When making changes: summarize what changed, where, and why.
- Author reviews and can reject or redirect.

## Development Roles
**Author** provides direction, constraints, and priorities. Does not specify implementation details.
**AI/Engineering** proposes how to build, designs flows, and recommends technical approaches.

**Vision** 
The product concept is to provide a way to combine one's photos and stories into an interactive 'journal'-- a storytelling platform that allows curated or freeform discovery. The idea was inspired by hard copy journals and wanting integrate images in a combination journal-album, and in a way that most efficiently leverages one's images and videos. 

Photo apps like Apple and Google are very efficient interfaces, and they have album creation and freeform tagging capability, but they are limited in integrating text and organizing the images and albums, and can quickly devolve into a disorganized mess.

This app seeks to leverage multiple photo repositories and provide a story-telling overlay, either curated or freeform, via a dimensional and heirarchical tag system.

The market for this beyond the author's use would be journalers, memory keepers, families. Some import friction may be acceptable for curated storytelling.

**Current State**
- Core functionality exists
- Some architectural elements still required
- Further functional buildout and QA required.

**Primary Users**
The primary users are the author (admin) creating the content and his family consuming it, primarily on mobile, but also on tablet and desktop.

**Strategic Direction** 
**Story Journal** – Users create journal from media.
**Photo Organization App** – Users manage media using dimensional/heirarchical tag structure. 
- Two entry paths:
    1. **Import -> Card** User imports from source as card and images concurrently; assign any tags from folder name/metadata; edit after. 
    2. **Import - Bank, then -> Card** User imports images in bulk with any tags from metadata. Those images go into the bank unassigned. User then creates cards and assigns from the bank.

## **Content Strategy Principles**

**1. Narrative Control**
- Collections provide curated storytelling
- Order and Parent/child relationships maintain story flow
- Manual ordering ensures narrative coherence

**2. Organic Discovery**
- Tag-based filtering enables natural exploration (and aggregation for card creation)
- Random content encourages serendipitous discovery
- Dimensional tagging (who, what, when, where, reflection) provides multiple entry points

**3. Content Flexibility**
- Any card can serve multiple purposes
- Display modes adapt to content characteristics
- Swiss Army Knife approach maximizes content utility

**4. User Experience Consistency**
- Cross-device navigation patterns
- Consistent discovery mechanisms
- Predictable interaction patterns

**5. Scalability**
- Performance optimization for large content libraries
- Efficient content indexing and retrieval
- Caching strategies for improved performance

### **Content Architecture**
- **Swiss Army Knife Cards:** Any card can be content, collection, or both
- **Predetermined Display Modes:** Inline (short text/few images) vs Navigate (long text/many images)
- **Manual Control:** All content mixing and display logic controlled by user

### **Content Discovery Strategy**
- **Bottom of Every Card:** Children + 3 filtered + 3 random exploration
- **Hierarchical + Organic:** Maintains narrative flow while encouraging discovery
- **Contextual Filtering:** Active tab controls what "filtered" means

### **User Experience Flow**
- **Main Feed:** Mixed content types with inline galleries and horizontal story slides
- **Story Detail:** Inline galleries with cross-device navigation
- **Infinite Flow:** Seamless transitions between related content
- **Mobile-First:** Touch scrolling, responsive design, news feed feel

### **Content Types & Display**
- **Stories:** Navigate mode (full articles)
- **Galleries:** Inline (≤5 images) or Navigate (>5 images) [View page needs image grid]
- **Questions:** Static (short answer) or Navigate (long answer)
- **Quotes:** Always inline (compact static)
- **Callouts:** Always inline (compact static)
- **Collections:** Any card with children becomes a collection

### **Key Innovation**
- **Dual Navigation:** Curated collections for narrative control + tag filtering [of images and cards] for organic discovery
- **Exploration Balance:** Children maintain story flow, random content encourages discovery

## **Key Architectural Decisions**
- Strict client-server, separation of concerns
  - Server-side validation with Zod schemas
  - Client-side state management with React providers
  - Firebase Admin SDK for server operations
- CSS modules for styling
  - Theme (centralized CSS)
- TypeScript throughout
- Consumption and Administration separated 
- Data Model (Cards → Tags → Media)
-   Cards (primary content)
    - Contain text and media, combining legacy entries and albums
    - Presentation varied per type and styling
  - Tags (hierarchical organization)
    - Dimensional and heirarchical, parent/child relationship
    - Tags denormalized into cards for query performance
    - Server-side filtering to avoid Firestore limitations 
  - Users
    - Admin and Viewer
  - Media (assets)
    - Imported from external sources to db for stability.
    - Referenced in cards by id, hydrated on demand
    - Processed with Sharp
    - Also a mode of discovery.

## **TECHNICAL**

### **Frontend**
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

### **Backend**
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

### **Scripting**
✅ 
**Syntax**
 - `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json`

**Firebase Setup**
- Credentials live in `.env`: `FIREBASE_SERVICE_ACCOUNT_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`, `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`, `FIREBASE_STORAGE_BUCKET_URL`
- Scripts must load `.env` before importing Firebase. Use `-r dotenv/config` (and `DOTENV_CONFIG_PATH=.env` if needed) so env vars are available when `admin.ts` initializes

**Import Folder as Card**
- Requires `ONEDRIVE_ROOT_FOLDER` in `.env` (server filesystem path)
- `IMPORT_FOLDER_MAX_IMAGES` (default 50): max images per folder to avoid serverless timeout. Increase for self-hosted.

### **Backup**
✅ 
- OneDrive - Windows Scheduled Task at 2am daily, auto awake pc, cleared >5 days, `npm run backup:database`
- Github - On every push, for 7 days
⭕2 - Ensure operational

## **APPLICATION**
The application is separated into 'content' and 'administration' with the core components wrapped in navigation and providers.

### **Application Structure**
✅ 
- Layouts 
  - AppShell: Main layout wrapper providing navigation and structure
  - ViewLayout: Handles the main (content) interface
  - AdminLayout: Manages the admin interface
- Providers - The core layouts are wrapped in providers
  - AuthProvider - Handles authentication state using NextAuth.js
  - TagProvider - Manages tag data and operations globally
  - CardProvider - Manages card data, filtering, and pagination

### **Directory Structure**
✅ 
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

### **Data Models**
✅ 
- `src/lib/types/` *read directly - fully commented*
- Zod schemas for all data types
- Single source of truth
- Server-side and client-side validation
- Type checking with TypeScript

### **Home Page**
- Application opens to the home page for login
✅
- Login
- SVG Logo
⭕3 - Reduce logo to icon for corner placement on mobile.

### **Navigation**

**Mobile-First, Deskstop-Second**
- Touch-optimized scrolling and navigation
- Responsive design that works on all devices
- Natural thumb scrolling for galleries and menu options.
- Clean, uncluttered interface
- **Detection, not selection:** Layout adapts automatically by screen size (CSS media queries / matchMedia). No user toggle.
- **Desktop (e.g., ≥768px):** Sidebar, top nav, hover interactions. No bottom bar.
- **Mobile (e.g., <768px):** 

**Seamless Content Flow**
- Infinite story progression
- Contextual related content
- Smooth transitions between stories
- No jarring navigation interruptions

**Flexible Content Consumption**
- Single Control Panel
- Multiple ways to discover content
- Curated narrative paths
- Organic exploration opportunities
- Personalized reading experiences

**Top Navigation**
- Minimal top navigation

✅ 
**Hamburger**
- content - Available to users and admin
- admin - Available only to admin
- theme toggle

**Left Navigation**
- Left sidebar provides dimension tabs and tag selection for card filtering.
- **Mobile (decision):** Keep this **left sidebar / drawer** pattern for filters on small screens for now—no bottom navigation bar.

✅ 
- **Card Type** - 
- **Dimension tabs** All | Who | What | When | Where | Reflection | Collections
- **Tab Persistence:** Remembers active dimension across page refreshes
- **Collections tab** Cards with children, grouped by dimension (who/what/when/where/reflection), sorted A–Z
- **Search Tags** - Search tags 
⭕2 - Fix Search tags -- not working
- **Hierarchical Tag Tree** `GlobalSidebar.tsx` and `TagTree.tsx`- Content filtered by card type and active dimension
- **Sort by** - Sort filtered content Random | Oldest | Newest

- ⭕2 - Create drag & drop TOC for ordering collections (manual order; primary mechanism for curated narrative sequencing).
- ⭕3 - Tune type/tag filter UX on mobile — **layout reference:** `--header-height` 60px; mobile filter drawer `--sidebar-width-mobile` 250px (`theme.css`). Hamburger panel: full width minus horizontal padding. **Bottom navigation:** parked—not planned for now.
- ⭕2 - Implement collection metadata (child counts)
- ⭕2 - Create admin interface for collection curation
- ⭕2 - Provide tree in chron order (Year / Month / What) for browsing.

### **Content Page**
- After login, the app defaults to the content page `CardFeed.tsx` and `ContentCard.tsx` displaying:
✅ 
- **Grid View**
  - Responsive grid-based layout
  - 3 display modes/styles
    - Static - Display only (Quote, Callout; Question when the answer is short)
    - Inline - Swipes left/right (Gallery <5 images)
    - Navigate - Dedicated card view (Story, Gallery; longer Question answers). On mobile, prefer horizontal swipe to open full content while the feed scrolls vertically (fewer open/close taps).
  - 5 card types:
    1. Story Card - Story with related images--cover, inline, and/or gallery.
      - Title - Bottom
      - Overlay
    2. Gallery Card - Images with limited text (captions)
      - Title - Top
      - Excerpt
      - Inline expansion
      ⭕2 - Implement Horizontal Image slider 1/5
    3. Question Card - Questions as if from family.
      - **No cover image:** large question-mark watermark as background; question text overlaid with readable contrast.
      - **With cover image:** hero is the cover only — no watermark.
      - Static if the answer is short; Navigate when the answer is long (story-like reading).
      - Short questions may still be embedded in other narrative content where appropriate (optional pattern; not limited to this type).
      ⭕2 - Get questions from Word doc, card games on Amazon
    4. Quote Card - Favorite quotes
      - Compact static tile; do not place the quote in the normal title band (same header-slot rule as Callout).
      ⭕2 - Devise Quote Card format
      ⭕2 - Get quotes from Dad book, Notion quotes, Grandfather book
    5. Callout Card - Summary bullet points on a topic.
      - Short title plus bullet list composed in the cover/hero region (not the normal title band).
      ⭕2 - Devise Callout Card format


### View Page 
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
  - Gallery - If present, render **mosaic** on view page (decision). *(Feed/cards: horizontal swipe; see Content Page.)*
  - Children - If present, render
  - Explore more... — **Explore More** group heading uses a smaller type scale than Related/Similar; **3** tiles, size unchanged.
  - Related - Display **3** random from filter
  - Explore - Display **3** random outside filter
  - **Parked:** Like, comment, sharelink — out of scope until revisited.

## ADMINISTRATION
- Top hamburger navigation `Admin` button navigates to Administration, admin-only CRUD/Bulk editing of cards, tags, media, questions, theme, users.
`src/app/admin/layout.tsx`

✅
- Navigation to Cards, Media, Tags, Questions, Theme, Users
  - **`package.json` scripts (keep):** Use for **migrations, reconciliation, one-off repairs, and emergencies** (e.g. `reconcile:media-cards`, `regenerate:storage-urls`, backfills). **Routine authoring** should not *depend* on them once in-app integrity is solid—they backstop drift. **Reference:** `docs/NPM-SCRIPTS.md`. ⭕2 - Prune obsolete dev-only scripts after review.
  **Gallery presentation (decision)**  
  - **Feed / content cards:** multi-image galleries use **horizontal swipe**.  
  - **View page:** **mosaic** for gallery.  
  - **Card edit:** **mosaic** for gallery manager (align with Apple/Google Photos–style browsing).
  - ⭕2 - Implement view-page gallery mosaic (replace swiper-only if needed).
  - ⭕2 - Implement card-edit gallery **mosaic** layout in admin.

**Card Titling**
- **Decision:** Keep current titling pattern (placement/overlay behavior as implemented).
- **Parked:** Smaller title/headline fonts on feed + view — defer.

### Card Management
- All business logic on the server-side (`cardService`) 
- The data model is denormalized to support complex filtering

**Card Data Model**
✅ 
- Collection - `cards`
- Schema - `src/lib/types/cards.ts`
  **Assignment Model** Use -> Stored On Card -> Notes 
  - Cover -> coverImageId, coverImageFocalPoint -> Single image
  - Gallery -> galleryMedia[] -> { mediaId, caption, order, objectPosition }  
  - Inline (rich text) -> contentMedia[]  -> IDs extracted from HTML; content has data-media-id 
  **References only:** coverImageId, coverImageFocalPoint, galleryMedia, contentMedia. No embedded media objects.
- **coverImage:** Transient — hydrated from media at read time. Never stored on card.
⭕2 **Collections / ordering (decision):** **TOC drag-and-drop** ordering of cards is the primary mechanism for curated narrative. Parent/child (`childrenIds`) expectations were never fully settled—reconcile or simplify that model **after** TOC exists. **Order:** **manual only** (from TOC). *(If a parent card is deleted, prior note: children simply no longer have that parent—no cascade required unless product says otherwise.)*

**Grid and Table Views** 
- List, create, edit, bulk actions
`/app/admin/card-admin/` 

✅ 
- Search by title 
⭕2 - Can Search by Title work as typed w/o 'enter'? Also, move to right of "All Types" filter.
- Filter by Status and Type - `CardProvider` uses the `selectedFilterTagIds` to query `filterTags` map.
- Bulk Operations - `BulkEditTagsModal.tsx` — union of tags on selected cards, stable fetch key, tag-only API does not touch content.
**Grid View**
- Click to edit
- Pagination
- ⭕2 - Show tags as overlay on cards in admin?
**Table View**
- Pagination - Load more... 
**Add Button** - `AdminFAB.tsx` 

**Card New/Edit** 
New - `/admin/card-admin/new`
Edit - `src/app/admin/card-admin/[id]/CardAdminClientPage.tsx`
`CardForm.tsx` is rendered, wrapped in `CardFormProvider` to manage form state.
✅
- Title, Subtitle
- Excerpt -
  - **Decision:** Default **empty**. Optional **checkbox** to enable auto-excerpt; when enabled, admin enters **character count** (first *N* chars). Manual override still allowed when present.
  - ⭕2 - Implement excerpt UI/logic per above (empty default, checkbox + N, override).
- Type - `story`, `gallery`, `qa`, `quote`, `callout`
- Status - `draft`, `published`
- displayMode - `static`, `inline`, `navigate`
- Cover Image
  - `CoverPhotoContainer` and `PhotoPicker` to select/upload image.
  - Image used for preview card and view page header.
  - Paste/Drag — cover: `CoverPhotoContainer` (outer focus target + dropzone, clipboard `files` + `items`); body: `RichTextEditor` / TipTap (`clipboardImage.ts` helper). `POST /api/images/browser`.
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
    - Tag Filter - `Card.filterTags` - Derived from **card-assigned** tags (and tag-tree ancestors) for querying—not from automatic merge of image tags (target; see Tag Management).
- Gallery
    - Uses `GalleryManager` and `PhotoPicker` for multi-image selection.
    - Drag n drop order
    - Stores gallery as `galleryMedia[]` (`mediaId`, `order`, optional per-slot `caption` / `objectPosition`; omitted fields inherit from the media doc).

    **Import Folder as Card** – `ImportFolderModal`, folder tree picker, normalization (yEdited→xNormalized), duplicate detection (overwrite/cancel).
    **Caption and Focal** - Inherit from media by default; optional per-slot override in the gallery edit modal.
- Children - Search only (not useful) -
  - **Parked:** Children linking modal — defer until TOC/collection strategy is settled.
- Actions
  - Delete - Delete card, remove tags/recalc, remove from any parents, remove related media
  - Cancel - Abandon any outstanding edits and return to list. 
  - Save - Save card, save tags/recalc, add media
  ⭕1- Fix exit edit page – Pressing Cancel to leave is awkward; Use Back.

### **Media Management**

**Conceptual Architecture**
- Source media reside in various *external sources* --local, OneDrive, Google, Apple, etc.
  - Current implementation sources from *local drive* (mirrored from OneDrive)
- **Video (parked):** Not in scope for now. **When unparked:** support on **cover**, **inline (body)**, and **gallery** like stills—as far as product parity allows. **Size / “normalization”** (typical approach): **server-side transcoding** (e.g. FFmpeg) to a max resolution/bitrate and web-friendly format—same *class* of work as image normalization; not automatic in-app today.
- Media are imported (picker or paste/drop) and assigned to fields in cards
- The *generic service layer* to external sources provides:
  - Connecton
  - Read and present media
  - Browse and select media
  - Import and *sharp* process the media to firebase
      - prepare *metadata* 
      - return `mediaId` to card for storage and object for immediate display
  - Optimize performance through `next/image`, caching, auto-sizing and lazy loading.
- Images served to content via Firebase ID/URLs

✅
  - Unassigned/Assigned Filter in Media Admin `assignment` query + seek pagination
  - Media delete behavior: card references are checked and cleaned up as part of media deletion flow.

- **Tagging (target):** Same tag assignment mechanism as cards (shared modal); **bulk** tagging in Media admin is the primary workflow. No tag inheritance to or from cards. Planned work is tracked under **Tag Management** (⭕1).

**Media Data Model**
- Collection - `media`
- Schema  - `src/lib/types/photo.ts`
- Local Drive Integration 
- Photopicker Integration
- `imageImportService.ts`
- Sharp image processing  
- Metadata extraction
- Error handling
- `next/image`

⭕1 - Clean up orphaned media (100+). Can leave them if normalized. Else, delete and re-import normalized.
Does deleting media check for card refernced?

**Normalization**
  Organize, normalize, edit images pre-import
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

  **Media Data Model**
  Collection: `media`
  Schema: `src/lib/types/photo.ts` ⭕3 Rename `src/lib/types/photo.ts` 'media.ts' throughout
  **Firebase Storage:** `images/{docId}-{filename}`
  **Firestore `media` collection:** One doc per image
  **storageUrl:** Permanent public URL (format: `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media`). Set from `storagePath` at card hydration and in Media API. No expiration or refresh. Requires Firebase Storage rules for public read (see below).
  **referencedByCardIds:** Denormalized array of card IDs that reference this media. Maintained on createCard, updateCard. Used for delete (remove refs from cards, then delete) and unassigned filter. Lazy backfill for legacy media.
  **No temporary/active.** All imported media is in the bank. Track **where assigned** (cover, gallery, content) for filtering; unassigned is valid.
  **Media Display URLs:** Public URLs. Card hydration, Media API, and createMediaAsset set storageUrl from storagePath. No expiration or refresh.
  **"Unassigned" Query:** - Uses `referencedByCardIds` on media + `GET /api/media?assignment=unassigned|assigned` (sequential scan; see `mediaAssignmentSeek.ts`).
  **Firebase Console → Storage → Rules** - (required for public URLs)
    Adjust `allow write` if you use different auth requirements. No `storage.rules` file in this repo—rules are managed in the Console.

  **Media Workflow**

  [Source] → [Import] → [Firebase Storage + Firestore] → [API Hydration] → [Client Display]

  **Import Entry Points**
  - `imageImportService.ts` — central import (PhotoPicker, paste/drop, local drive)
  - Creates Media doc in Firestore, uploads to Firebase Storage
  - Folder Import -  `importFolderAsCard()` — normalize (yEdited→xNormalized), import via `importFromLocalDrive`, build gallery + cover

  **Display**
  - `JournalImage` — next/image with unoptimized (avoids 403 from Firebase)
  - `getDisplayUrl(photo)` — storageUrl → url → transparent pixel fallback
  - **Cover aspect ratios:** Edit/view 4:3; feed thumbnail 1:1
  - **Focal point:** Pixel coords {x, y}; converted to object-position per aspect ratio

  **Pre-Import Scripts** (Local Filesystem)
  - `create-photo-folders.bat` — xNormalized, yEdited, zOriginals
  - `normalize-images.bat` / `npm run normalize:images` — optimize, extract metadata to JSON, convert to WebP
  - `extract-metadata-improved.bat` — metadata only
  - See `METADATA_EXTRACTION_README.md` and `normalize-images-README.md`

  **Media-Card Reconciliation**
  When cards and media get out of sync, use reconciliation scripts. See MediaCardReconciliation.md. Run `npm run reconcile:media-cards -- --diagnose`.
  ⭕2 - Design media-card flow so they don't get out of sync.
  ⭕2 - Reconcile/Update Image/Card relationships/data integrity.
  ⭕2 - Drop `temporary`/`active` status for media. Everything imported is in the bank.

### Tag Management
- All cards are assigned multiple, dimensional, and heirarchical tags to enable flexible filtering. 
- All business logic on the server-side in `tagService` 

**Tag Data Model**
- Collection - `tags`
- Schema - `src/lib/types/tag.ts`
- Tags are dimensional and heirarchical
    - dimensional - who, what, when...
    - hierarchical - Parents: Father, Mother; Children: Son, Daughter

**Tag Administration**
`/app/admin/tag-admin/page.tsx`

✅ 
- Hierarchical View - The page renders all tags in a 5-column tree structure using `TagAdminList`
- Drag-and-Drop Reordering/Reparenting - `SortableTag.tsx`
- Inline editing - `TagAdminRow.tsx`
  - OnDelete - User choice of children being promoted or cascade deleted
  - OnMove - Updates parent and order and recalcs tag card counts
- Tags on the Fly – **edit tag** and **bulk tag** modals: create root or child tags per dimension (`TagPickerDimensionColumn`, `POST /api/tags`). 

**Card tags vs image (media) tags** 
- **Same mechanism:** Assign tags to a card and assign tags to a **media** document using the **same** flow and data shape as cards (shared tag-assignment modal, e.g. `MacroTagSelector` pattern). Use the same dimensional/hierarchical tag library; **no** special-case fields in the product model unless legacy migration requires it temporarily.
- **No inheritance:** Tags do **not** copy from card to image or from image to card. Each record’s tags stand alone. Discovery: filter **cards** by the card’s tags; filter **images** (e.g. in the media bank or a future image browser) by each image’s tags.
- **Authoring intent (human, not automatic):** You may still choose a **story-level** tag set on the card (what the post is about) and **frame-level** tags on images (who/what/when/where for that photo)—but nothing syncs unless you tag it yourself.
- **Bulk:** **Bulk tagging in Media admin** is a high priority (multi-select + apply tags)—more day-to-day value than bulk on cards.
- **Current code note:** Today, gallery editing can persist `whoTagIds` on media and server logic can merge image WHO into **card** derived tags; that contradicts this model and should be **removed once media uses full parallel tagging**.
  ⭕1 - Media tagging: parallel to cards (shared modal, same storage/derivation pattern as cards); bulk apply in Media admin; **stop** merging image tags into card `filterTags` / dimensional tags on save; migrate off `whoTagIds`-only paths.
- ⭕2 - Add Face Recognition
- Options:
  - **Cloud APIs:** Azure Face, AWS Rekognition, Google Cloud Vision (detection; recognition requires custom face DB). Integrate to suggest/auto-populate WHO at image level; faces map to person tags.
  - **Client-side:** face-api.js (TensorFlow.js). Runs in browser, no uploads; lower accuracy than cloud.
  - **Apple/Google Photos:** Native face recognition; would require overlay integration to leverage.

**People Hierarchy (WHO dimension)** 
⭕3 - Make who tagging generic using imputed relationship.
- **Strategy note:** Kinship imputation is a large surface (graph storage, validation, remarriage/step edges, UX for “how is X related to Y?”). It pays off most for a **dense private family archive** where labels like cousin/step-parent are used often. **Defer** until parallel media tagging and bulk Media-admin tagging UX are in place unless a concrete workflow needs it sooner. If the product later supports **multi-household or shared-group** archives, the *idea* of “primitives + inferred edges” often generalizes (membership, roles, households)—but treat that as a **separate design pass**; do not assume the family graph schema drops in unchanged.
- Derive family relationships from minimal primitives (`parent_of`, `spouse_of`).
- Store only primitives; compute uncle, cousin, step-parent, etc. via inference rules.
- Maps to WHO dimension; supports "photos of Grandma" or "stories about Mom's side."
  **half_sibling_of(A, B)** ↔ share exactly one parent (intersection of parent sets non-empty, but not both parents)
  **In-Laws** - optional, also derivable
  - **parent_in_law_of** ↔ parent of spouse
  - **sibling_in_law_of** ↔ sibling of spouse
  - etc

  **Stored edges:**
  1. `parent_of(personId, childId)` — optionally with `type`: biological, adoptive, step, social
  2. `spouse_of(personId, personId)` — optionally with dates, status (current, divorced, widowed)

  **Step-parents:** Two approaches:
  - **Option A (implicit):** Robin parent_of Wesley; Mark spouse_of Robin; Mark is *not* parent_of Wesley → infer Mark step_parent_of Wesley.
  - **Option B (explicit):** Add `parent_of(Mark, Wesley, type: 'step')` for clarity, but spouse_of still validates consistency.

  **Edge Cases to Handle**
  - Multiple paths - George→Bob→Alan via two routes: pick “primary” path or show all (e.g., “grandfather and also …”)
  Gender for labels - Store gender if you want “uncle” vs “aunt”, “nephew” vs “niece”
  Adoptive vs biological - Add `type` to `parent_of` 
  Divorce/remarriage - `spouse_of` with status; step relationships may change over time
  Unknown parent - Allow null; some relationships (e.g., half-sibling) may be undetermined 
  Cycles - Validate on write to avoid parent_of cycles 

  **Optional Refinements**
  - **biological_parent_of** - When genetic/legal ancestry differs from social parent 
  - **partner_of** - Distinguish from spouse (e.g., long-term partner, ex-spouse) 
  - **domestic_partner_of** - For specific legal/social categories 

  **Implementation Options**
  - **On-demand:** When asking “How is X related to Y?”, run inference once.
  - **Materialized:** Periodically or on change, precompute and store inferred relationships.
  - **Path-based:** Store only paths (e.g., through parent_of), then classify the path as “grandparent”, “uncle”, “cousin”, etc.

  **Example: Full Derivation Chain**
  - George parent_of Bob, Bob parent_of Alan → **George grandparent_of Alan**
  - William child_of Alan, Scot sibling_of Alan → **Scot uncle_of William**, **William nephew_of Scot**
  - Steven child_of Scot → **William cousin_of Steven**
  - Mark spouse_of Robin, Robin parent_of Wesley, ¬Mark parent_of Wesley → **Mark step_parent_of Wesley**

### Question Management
- Questions are prompts for stories.

✅ 
- Admin UI: `/admin/question-admin`
- APIs (admin-only): `GET/POST /api/admin/questions`, `PATCH/DELETE /api/admin/questions/[id]`, link card `POST`, unlink `PUT`; `POST .../create-card` creates a draft `qa` or `story` card from the prompt and links usage
- List/filter in UI: text, tags (substring), used vs unused
- Manual link/unlink to existing card IDs; **Create card** for new drafts
- **Cleanup:** deleting a card removes its id from every question’s `usedByCardIds` (and refreshes `usageCount`)

**Post-MVP (still open)**
⭕3 - Answer workflow beyond cards, analytics, templates, validation, viewer feedback, auto-grouping

  **Questions Data model**
  - Collection: `questions`
  - Schema: `src/lib/types/question.ts`
  - Service: `src/lib/services/questionService.ts`

  **Questions Admin Workflow**
  - List/filter questions: by text, tags, and used/unused.
  - Create/edit questions.
  - "Create card from question" action:
    - Creates a new card prefilled from `prompt` (default type `qa` or `story` as chosen in UI).
    - Adds card ID to `usedByCardIds` and updates `usageCount`.
  - Manual link/unlink between question and card (for existing stories already in DB).

  **Questions Rules**
  - A question may map to zero, one, or many cards.
  - "Used" means `usedByCardIds.length > 0`.
  - If a linked card is deleted, remove that ID from `usedByCardIds` (cleanup hook or maintenance script).
  - No automatic grouping in MVP; use tags for organization first.

  **Questions Out of scope (post-MVP)**
  - Auto-clustering/grouping of short questions.

### **User Management**

✅ 
- Collection: `journal_users`
- Schema: `src/lib/auth/journalUsersFirestore.ts`
- `authorize` in `authOptions.ts` (DB first, legacy env only when no row for that username)
- Admin **Users** tab → `/admin/journal-users`; APIs `/api/admin/journal-users`, `/api/admin/journal-users/[id]`
- Viewers only from UI/API; single admin rule; seed script `npm run seed:journal-users`
- Login redirect: `/?callbackUrl=/admin` supported in `Home.tsx` (wrapped in `Suspense` on the home page)

### **Theme Management**
- Themes customizable.

✅
- Light/Dark toggle
- Admin page
- MSN Layout style


### Gallery Style Management
- Gallery styles are selectable styles for gallery cards

✅
- None

⭕3 - Devise preconfigured card styles for selection
  

## IMPLEMENTATION SUMMARY

Use this section as a concise strategy + execution tracker.

### Implementation plan (phased build order)

| Phase | Focus | Outcomes |
|-------|--------|----------|
| **A — Hygiene & reader UX** | Admin shell, small view fixes | Maintenance admin page removed; scripts documented in `docs/NPM-SCRIPTS.md`; sticky Back on card view; “Explore More” group heading sized down |
| **B — Media + tags** | Parallel media tagging, stop card merge | `media.tags` / derivation like cards; bulk tag in Media admin; remove `whoTagIds` → card `filterTags` merge |
| **C — Galleries** | Mosaic | View-page gallery mosaic; card-edit gallery mosaic (`GalleryManager`) |
| **D — Narrative** | TOC | Drag-and-drop TOC ordering for collections (manual order); then reconcile `childrenIds` vs TOC |
| **E — Card admin polish** | Excerpt UX, search | Excerpt: empty default + checkbox + N chars; live search title; optional tag overlays |
| **F — Tech / ship** | Lint, QA, host | ESLint cleanup, deploy target, operational hardening |

Work in phase order unless a task is blocking daily authoring—then pull it forward.

✅ Recently delivered capabilities
- Unified picker in card modal (`This PC` + `Library`).
- Media assignment filters in admin (`Assigned` / `Unassigned`).
- Gallery caption/focal behavior aligned to media defaults with optional card-level override.
- Admin/tag workflow improvements (desktop admin gate, improved tag creation/reparenting UX).
- Admin **Maintenance** tab removed; maintenance APIs + npm scripts retained — see **`docs/NPM-SCRIPTS.md`**.
- Card view: **sticky Back** control; discovery block **Explore More** subsection title uses reduced type scale vs other group headings.

Execution notes (material only)
- Media deletion should enforce data integrity by checking/removing card references.
- Assignment indexing (`referencedByCardIds`) is the key mechanism for assignment filtering and cleanup.
- Keep card references canonical (`coverImageId`, `galleryMedia`, `contentMedia`); no embedded cover objects.
- **Tags (target):** Media and cards use the **same** tagging mechanism; **no** automatic inheritance or merge between them. Card `filterTags` should eventually reflect **card-assigned tags only** (retire merging image-level tags into the card on save; today some image `whoTagIds` logic still merges—migrate off).

**Deferred — merge to `main` (note for later):** Active integration work has been pushed on branch **`feature/card-edit-foundation`** (`origin`). When ready for production/default branch, open a **PR** into `main` or merge locally and push—whichever matches the repo workflow. Confirm CI/build and env (Firebase, `AUTH_SECRET`, journal seed) before release.

---

## Planned (summary list)

*(Verbatim from body, grouped by source section.)*

### TECHNICAL
- ⭕2 - Comment code
- ⭕2 - Cleanup directory
- ⭕2 - Address ESLint violations (~100+; build uses ignoreDuringBuilds; run `npm run lint` locally)
- ⭕2 - QA app
- ⭕2 - Host app (Netlify/Vercel)
- ⭕2 - Ensure operational

### APPLICATION / Home Page
- ⭕3 - Reduce logo to icon for corner placement on mobile.

### APPLICATION / Navigation
- ⭕2 - Fix Search tags -- not working
- ⭕2 - Create drag & drop TOC for ordering collections (manual order; primary mechanism for curated narrative sequencing).
- ⭕3 - Tune type/tag filter UX on mobile — **layout reference:** `--header-height` 60px; mobile filter drawer `--sidebar-width-mobile` 250px (`theme.css`). Hamburger panel: full width minus horizontal padding. **Bottom navigation:** parked—not planned for now.
- ⭕2 - Implement collection metadata (child counts)
- ⭕2 - Create admin interface for collection curation
- ⭕2 - Provide tree in chron order (Year / Month / What) for browsing.

### APPLICATION / Content Page
- ⭕2 - Implement Horizontal Image slider 1/5
- ⭕2 - Get questions from Word doc, card games on Amazon
- ⭕2 - Devise Quote Card format
- ⭕2 - Get quotes from Dad book, Notion quotes, Grandfather book
- ⭕2 - Devise Callout Card format

### ADMINISTRATION
- ⭕2 - Prune obsolete dev-only scripts after review.
- ⭕2 - Implement view-page gallery mosaic (replace swiper-only if needed).
- ⭕2 - Implement card-edit gallery **mosaic** layout in admin.

### ADMINISTRATION / Card Management
- ⭕2 **Collections / ordering (decision):** **TOC drag-and-drop** ordering of cards is the primary mechanism for curated narrative. Parent/child (`childrenIds`) expectations were never fully settled—reconcile or simplify that model **after** TOC exists. **Order:** **manual only** (from TOC). *(If a parent card is deleted, prior note: children simply no longer have that parent—no cascade required unless product says otherwise.)*
- ⭕2 - Can Search by Title work as typed w/o 'enter'? Also, move to right of "All Types" filter.
- ⭕2 - Show tags as overlay on cards in admin?
- ⭕2 - Implement excerpt UI/logic per above (empty default, checkbox + N, override).
- ⭕1- Fix exit edit page – Pressing Cancel to leave is awkward; Use Back.

### ADMINISTRATION / Media Management
- ⭕1 - Clean up orphaned media (100+). Can leave them if normalized. Else, delete and re-import normalized.
- Schema: `src/lib/types/photo.ts` ⭕3 Rename `src/lib/types/photo.ts` 'media.ts' throughout
- ⭕2 - Design media-card flow so they don't get out of sync.
- ⭕2 - Reconcile/Update Image/Card relationships/data integrity.
- ⭕2 - Drop `temporary`/`active` status for media. Everything imported is in the bank.

### ADMINISTRATION / Tag Management
- ⭕1 - Media tagging: parallel to cards (shared modal, same storage/derivation pattern as cards); bulk apply in Media admin; **stop** merging image tags into card `filterTags` / dimensional tags on save; migrate off `whoTagIds`-only paths.
- ⭕2 - Add Face Recognition
- ⭕3 - Make who tagging generic using imputed relationship.

### ADMINISTRATION / Question Management
- ⭕3 - Answer workflow beyond cards, analytics, templates, validation, viewer feedback, auto-grouping

### Gallery Style Management
- ⭕3 - Devise preconfigured card styles for selection

## Open Questions (summary list)

*(Verbatim from body, grouped by source section.)*

- *(None in body right now — resolved or moved to planned items above.)*
