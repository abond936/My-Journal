# Project Overview

**Purpose** - A personal journaling application combining text and media into cards (stories, galleries, Q&A's, quotes or callouts), with dimensional heirarchical tagging for flexible content consumption.  

**Primary Users** -The primary users are the author (admin) creating the content and his family consuming it.

**Current State** - Core functionality exists, some architectural elements still pending and further functional buildout and testing required.

**Critical Context for AI Assistants**: This is a maturing, complex application. Prefer extending existing solutions over new implementationsBefore suggesting changes, understand the existing patterns and architectural decisions. The codebase is the source of truth for implementation details.

**Roadmap**
- Rationalize harden tag system
- Implement table of contents



Legend:
- ✅ Implemented
- 🟡 Operational
- ⭕ Planned - Priority: 1 - next, 2 - on hold
- ❓ Open Question

## **Technical**
=====================================

**Key Design Decisions**
- Architecture
  - Strict client-server, separation of concerns
- Consumption and Administration separated.
- Data Model (Cards → Tags → Media)
- Cards (primary content)
  - Contain text and media, combining legacy entries and albums.
  - Presentation varied with type and styling.
- Tags (hierarchical organization)
  - Dimensional and heirarchical, parent/child relationship
  - Multi-select for greatest effectiveness.
  - Tags denormalized into cards for query performance
  - Server-side filtering to avoid Firestore limitations  
- Media (assets)
  - Imported from external sources for stability.
  - Media stored in db, referenced in cards by id, and hydrated on demand
  - Media processing pipeline with Sharp

**Architectural Patterns to Follow**
- Server-side validation with Zod schemas
- Client-side state management with React providers
- Firebase Admin SDK for server operations
- CSS Modules for styling
- TypeScript throughout

**Frontend**
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

**Backend**
  - Auth.js with Firebase adapter
  - `firebase-admin` SDK for server-side operations
  - Zod for data validation
  - Next.js API Routes
  - Application wrapped in AuthProvider
  - All API routes secured at the edge
  - Role-based access control
  - Session persistence

⭕
2 - Hosting: Netlify (primary), with Vercel as backup
2 - Add user management interface
2 - Implement more granular permissions


**Backup**
✅ 
- Scripts
    codebase - `src/lib/scripts/utils/backup-codebase.ts` a OneDrive .zip file
    database - `src/lib/scripts/backup-database.ts` a single, timestamped JSON file.
- Scheduled 
  - `src/lib/scripts/utils/setup-backup-task.ps1`  Windows Scheduled Task to run at 1am daily
  - `src/lib/scripts/setup-database-backup-task.ps1` Windows Scheduled Task to run 2am daily
- Github backup - `.github/workflows/backup.yml`) automatica backup on every push to the `main` branch. This backup is stored as a workflow artifact for 7 days, providing an off-site copy.
- Cleanup 
  codebase - stored 7 days
  database - Automatically cleans up local backups > 5 days.
- Recovery 
  - codebase Unzip the file to restore the complete project, run `npm install` to reinstall all dependencies.
  - `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/restore-database.ts "C:\\Path\\To\\Your\\Backup\\file.json"`

⭕
2 - Update backup scripts and automation

**Database** (Firestore)
✅ 
- cards collection (primary content store)
- media collection (asset metadata)
- tags collection (hierarchical organization)
- albums (legacy)
- entries (legacy)

⭕
2 - Remove legacy collections (entries/albums)

**Data Models**
✅ 
- `src/lib/types/` *read directly - fully commented*
- Zod schemas for all data types
- Single source of truth
- Server-side validation
- Client-side validation
- Type checking with TypeScript
  - `Card` - `src/lib/types/card.ts` - Central data entity in the application, containing content, metadata, and references to tags and other cards.
  - `Tag` - `src/lib/types/tag.ts` - Structure for dimensional and hierarchical tags used for organizing and filtering cards.
  - `Media` - `src/lib/types/photo.ts` - Media assets (image, video) stored in Firebase Storage, including metadata like dimensions and paths.

⭕
2 - Do comprehensive assessment and update

**APPLICATION**
================================
The application is bifuracted into 'viewing' and 'administration' with the core components wrapped in navigation and providers.

**Application Structure**
- Providers - The core layouts are wrapped in providers
  - AuthProvider: Handles authentication state using NextAuth.js
  - TagProvider: Manages tag data and operations globally
  - CardProvider: Manages card data, filtering, and pagination
- Layouts - Layout handle 
- AppShell: Main layout wrapper providing navigation and structure
- ViewLayout: Handles the main viewing experience
- AdminLayout: Manages the admin interface

**Directory Structure**
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
   `types/` Zod schemas and TypeScript type definitions. Well-commented, data model's primary documentation
   `hooks/` Reusable client-side React hooks
   `utils/` General utility functions (e.g., date formatting, tag manipulation)

**Home Page**
- Application opens to the home page for login.

✅
- Logo
- Cloud images
- Welcome message
- Login

⭕
2 - Add image(s) of me from various stages

**AppShell**
- After login, the app opens to the Appshell which provides top and left sidebar navigation.

**Top Navigation**
- Top navigation toggles content and admin for the administrator and defaults to content for a user. 

✅ 
- logo
- content - Available to users and admin
- admin - Only available to administrator
- theme toggle

⭕
2 - make admin available to users for settings only
2 - make logo svg and background transparent

**Left Sidebar Navigation**
- Left sidebar provides a tabbed table of contents and multi-tag selection for card filtering.

✅ 
Hierarchical Tag Display: `GlobalSidebar.tsx` and `TagTree.tsx` display the full, browseable hierarchy of tags, grouped by dimension with expand/collapse functionality.
⭕2 Filtering - Flesh out filtering
      - include number of cards (x) - requires cloud function
      - add orderBy options
      - increase indention
      - make slide in/out on mobile
⭕2 Table of Contents - Add a curated table of contents, essentially pre-built filters.
⭕2 Search - add title & content search

**Content Page**
- After login, the app defaults to the content page `CardFeed.tsx` and `ContentCard.tsx` displaying:
  - Tabbed left sidebar w/table of contents and tag filter
  - Grid of cards 
  - No editing or admin controls for regular users

✅ Grid View
    - Responsive grid-based layout
    - Three display modes
        - Static - Display only
        ⭕2 Inline - expands/collapses in place
        - Navigate - Links to dedicated card view page
    - Styled by card type    
    - Infinite scroll pagination - IntersectionObserver
    - Tag-based filtering
    - Optimized image loading
    ⭕2 Fix ghost/error layout issues
    ⭕2 Add Search 

**View Card**
- Clicking a `navigate`card navigates to card detail page
`src/app/view/[id]/CardDetailPage.tsx` conditionally rendering card components

`src/app/view/[id]/page.tsx` is executed on the server. Inside this page component, the `getCardData` function calls `getCardById(id)` from `src/lib/services/cardService.ts` to fetch the main card's data from Firestore. 
If the card has children (`childrenIds`), it then calls `getCardsByIds` to fetch them.

**Props Passing**: The fetched `card` and `children` objects are passed as props to the client component `<CardDetailPage />`.

**Client-Side Render**: The `CardDetailPage` component (`src/components/view/CardDetailPage.tsx`) receives the data and is responsible for rendering the final view in the browser. It does not need to fetch this data itself.

✅ 
- Conditional Render - Render page based on components.
  - Title - Render first
  - Subtitle - If present, render next
  - Cover image - If present, render next
  - Content - If present, render using TipTapRenderer.
  ⭕2 Gallery - If present, render grid, (design)
  ⭕2 Children - If present, render next.
⭕2 User Interaction - add user interaction - Like, comment, sharelink

##**Theme System**
✅
- light/dark fixed theme
- limited styling throughout

⭕ 
2 - MSN Layout - add MSN-style layout and theme
    2 - home
    2 - content page
    2 - cards by type
    2 - admin pages
    2 - make fully customizable - add to Settings

## **Administration**
=======================================
- Top navigation 'Admin' button navigates to Adminsitration, admin-only CRUD/Bulk editing of cards, tags, and other resources.
`src/app/admin/layout.tsx`

✅
- navigation
- end points secured

⭕ 
2 - fix page scrolling under navigation bar

### **Card System**
=======================================
- The Card is the central data entity of the application
- All business logic on the server-side (`cardService`) 
- The data model is denormalized to efficiently support complex relationships (with tags and media)

**Card Data Model**
✅ 
- Collection - `cards` collection stores all card documents.
- Schema - `src/lib/types/cards.ts`
⭕2 Child Strategy - The strategy for managing child cards is not fully defined. 
    - The idea behind having a nested card was to be able to accomodate the conceived World & Politics, Father sections, where a card can contain related stories. 
    Filtering related cards and select/order them for inclusion. By modal within a card or in bulk assign children in card management. 
    - When a parent card is deleted, their children are orphaned.

**Card Management** 
- List, create, edit, bulk actions
`/app/admin/card-admin/` 

✅ 
- Search by title
  ⭕2 - Improve css - Move statuses and types to the right to make room for blue box
  ⭕2 - add content to search
- Filter by Status and Type - `CardProvider` uses the `selectedFilterTagIds` to query for cards that contain any of the selected tags in their `filterTags` map.
- Bulk Operations - `BulkTagEditorModal.tsx` 
  ⭕2 - Organize on 2 lines
  ⭕2 - Add type
- Card list
  - CoverIcon - Thumbnail version of coverImage
  - Title
  - Type
  - Status
  - Tags
    ⭕2 - Change to either hasTags? # or who #, what #, when #, where #, reflection #
  ⭕2 - Content - hasContent? y/n
  ⭕2 - Gallery - hasGallery? #
  ⭕2 - Children - has Children #
-Actions
  - Edit button
  - Delete button
      ⭕2 - Check logic of warning. Doesn't seem correct
  - Add button- `AdminFAB.tsx` 
- Pagination - Load more... 

⭕2 - Implement sorting options
⭕2 - Restore inline editing
⭕2 - Add Drag n Drop parent/order functionality ??Feasible, lots of cards unless filtered??

**Card New/Edit** 
Add new - `/admin/card-admin/new`
Edit - `src/app/admin/card-admin/[id]/CardAdminClientPage.tsx`
`src/components/admin/card-admin/CardForm.tsx`) is rendered, wrapped in a `CardFormProvider` to manage form state.
✅
- Title 
- Subtitle
- Excerpt  
  ⭕2 Default excerpt to first x characters, with override
- Type - `story`, `gallery`, `qa`, `quote`, `callout`
- Status - `draft`, `published`
- Cover Image
  - `CoverPhotoContainer` and `PhotoPicker` to select/upload image.
  - Image used for preview card and view page header.
  - Paste/Drag to upload image.
  - Stores reference, not the image.
  - Adjust and stores objectPosition
  - No caption
- Content
  - Rich text editing - TipTap
  - Inline embedded images, store id only
  - Rest of content held in HTML
  - Captions default to media object with override stored in card.

- Tags
  - `MacroTagSelector`(Tag Component) Modal Selector:
  - Tag Selection - `Card.tags` - Stores the tags directly assigned by the user.
  - Denormalization - On card save, `cardService` uses `tagDataAccess.ts` to calculate and save derived tag data onto the `Card` document.
    - Tag Inheritance - `Card.inheritedTags` - Flattened array of direct and ancestor tags (e.g., "Paris" -> "France" -> "Europe").
    - Tag Filter - `Card.filterTags`: Stores a map object (`{ "tagId": true, ... }`) of all inherited tags, optimized for fast Firestore `where` queries.

- Gallery
    - Uses `GalleryManager` and `PhotoPicker` for multi-image selection.
    - Drag n drop order
    - Stores gallery as an array of media IDs.
    - Defaults to media object caption with 'overwrite'.
    ⭕2 - Fix caption, focal point editing
    ⭕2 - Batch upload gallery cards by script

- Children
  - Search only (not useful)
    ⭕2 - Develop linking modal

- Delete - Delete card and related media
- Cancel - Abandon any outstanding edits and return to list
    ⭕2 - Add warning if edits.
- Save
  - New - the form data is sent via a `POST` request to the API endpoint at `/api/cards/`. The route handler at `src/app/api/cards/route.ts` receives the request. It validates the incoming data against the `cardSchema` from Zod, then calls `createCard` from `src/lib/services/cardService.ts` to write the new document to Firestore.
  - Edit - the form data is sent via a `PATCH` request to the API endpoint at `/api/cards`. The route handler at `src/app/api/cards/route.ts` receives the request. It validates the incoming data against the `cardSchema` from Zod, then calls `updateCard` from `src/lib/services/cardService.ts` to update the  document to Firestore.

⭕2 - Rationalize card services/api's

### **Tag System**
===========================================
- All cards are assigned multiple, dimensional, and heirarchical tags to enable flexible filtering. 

**Tag Data Model**
✅ 
- Collection - `tags` canonical tag data
- Schema - `src/lib/types/tag.ts`

⭕1 Validation - Implement zod validation
⭕1 Error Handling: API routes should use `try...catch` blocks to handle errors from services gracefully, returning appropriate HTTP status codes (e.g., 400, 404, 500) and logging the error server-side for troubleshooting.

**Tag Administration**
`/app/admin/tag-admin/page.tsx`

✅ 
- Hierarchical View: The page renders all tags in a tree structure `TagTreeView`
- Drag-and-Drop Reordering/Reparenting: `SortableTag.tsx`
  - OnMove, the `parentId` and `path` array of the moved tag are updated and script updates the `path` array for all *descendant tags* of the moved tag.
  - OnDelete - User choice of children being promoted or cascade deleted
  ❓ When tags are moved/renamed, what is the update strategy for the denormalized inheritedTags and filterTags on thousands of existing cards? (e.g., On next card write? Or a one-time bulk update script?)
  - Inline editing `TagAdminRow.tsx`
⭕2 Dimension Assignment: Currently, a tag's `dimension` (`who`, `what`, `when`, etc.) is a string field that must be set manually in Firestore. An admin UI should be created to manage this.
- Bulk Editing - `BulkTagEditorModal.tsx`
  ⭕2 - Any need for this? Possibly delete, but not that necessary.
- Add button - 
  ⭕2 Fix inline editing

**Tag Filtering**
- Both card content and admin are filtered by tag selection.

✅ 
- State Management - `TagProvider` fetches all tags and provides the tag tree and filter state to the application.
- Multi-Select - Users can select multiple tags. (`CardProvider` then uses the `selectedFilterTagIds` to query for cards that contain any of the selected tags in their `filterTags` map.)
- Server-side - Filtering logic is executed on the server to avoid Firestore's query limitations.
- Cache - Tag hierarchy UI display is sourced from a single cached JSON object in Firestore `cache/tagTree`, initiated once on startup and automatically updated by a serverless Cloud Function whenever a tag is changed to ensure fast-loading UI with minimal reads.
- Group Tags by Dimension - The service receives tag IDs, fetches their definitions, and groups them by dimension (e.g., 'who', 'what').
- Intra-Dimension "OR" Logic - For each dimension, it fetches all card IDs that match *any* of the selected tags in that group.
- Inter-Dimension "AND" Logic - It then calculates the *intersection* of the results from each dimension to get the final list of card IDs that match all criteria.
- Pagination - It paginates over this final list of IDs to return the requested page of cards.

❓2 - Are query optimization or alternative data-loading strategies needed?

**Question Management**
- Questions are prompts for stories.

✅
- None

⭕3
- Question collection
- Question listing and filtering
- Question creation and editing
- Answer management
- Basic analytics
- Advanced analytics
- Question templates
- Answer validation
- User feedback
- Tagged?
- Grouped?

❓ 
- Selecting a question from list creates a card
- Many questions are already part of stories
  - Create those stories in the db
  - Mark as selected
  - If deleted, remove from 'used'
- Do we group short questions?

**Gallery Style Management**
- Gallery styles are selectable styles for gallery cards

✅
- None

⭕
2 - Devise preconfigured card styles for selection
  ❓- expose style selection on view card or set on edit card?

**Theme Management**
- Themes customizable.

✅
- Light/Dark toggle

⭕
2 - MSN Layout style
2 - UI management


### **IMAGE INTEGRATION**
=======================================
Conceptual Architecture:
- Source images reside in various *external sources* --(local, OneDrive, Google, Appple, etc.)
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
  - Optimize performance through next/image, caching and lazy loading.
- Images served to content via Firebase ID/URLs
- Images sized on the fly `'next/image`
- OnSave
  - update media doc to 'active'
- OnRemove/OnCancel/OnDelete
  - delete media doc 

**Media Data Model**

✅
- Collection - `media`
- Schema  - `src/lib/types/photo.ts`

⭕2 - Error Handling - If import fails, provide error and options. Accept imported or none?
- Firebase storage for asset management
- Local Drive Integration
- Photopicker Integration
- `imageImportService.ts`
- Sharp image processing
    ⭕2 - face detection
    ⭕2 - smart crop
- Metadata extraction
- Unique ID generation
- Error handling
⭕2 Implement `next/image`

**Normalization**
⭕1 Organize, normalize, edit images pre-import
    - Create directories - zOriginals, staged, final
    - Move originals to zOriginals
    - Batch normalize
      - upscale
      - sharpen
      - white balance
      - color balance?
      - auto contrast
      - gamma correction
      - convert format - webP or optimized JPEG
    - Move to final
    - Edit and move to final
    - Restore and replace as needed.
⭕2 - Batch clean images from testing before production
⭕2 - Batch upload images to cards. 
        - Extract metadata for caption, tags(?)
        - aspect ratio
