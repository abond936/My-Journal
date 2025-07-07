# Project Overview

**Purpose** 
A personal journaling application combining text and media into cards (stories, galleries, Q&A's, quotes or callouts), with dimensional heirarchical tagging for flexible content consumption.  

**Primary Users**
The primary users are the author (admin) creating the content and his family consuming it, primarily on mobile, but tablet and desktop..

**Current State**
- Core functionality exists
- Some architectural elements still required
- Further functional buildout and testing required.

**Roadmap**
- Rationalize/harden tag, card, media management
- Rationalize/build out content navigation/presentation.

Legend:
- ✅ Implemented
- 🟡 Operational
- ⭕ Planned - Priority: 1, 2, 3
- ❓ Open Question

## **Technical**
=====================================

**Key Architectural Decisions**
- Strict client-server, separation of concerns
  - Server-side validation with Zod schemas
  - Client-side state management with React providers
  - Firebase Admin SDK for server operations
- CSS modules for styling
- TypeScript throughout
- Consumption and Administration separated.
- Data Model (Cards → Tags → Media)
- Cards (primary content)
  - Contain text and media, combining legacy entries and albums
  - Presentation varied with type and styling
- Tags (hierarchical organization)
  - Dimensional and heirarchical, parent/child relationship
  - Tags denormalized into cards for query performance
  - Server-side filtering to avoid Firestore limitations  
- Media (assets)
  - Imported from external sources to db for stability.
  - Referenced in cards by id, hydrated on demand
  - Processed with Sharp

✅
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

⭕2 - Hosting: Netlify (primary), with Vercel as backup

**Backup**
✅ 
- Scripts
  - codebase - `src/lib/scripts/utils/backup-codebase.ts` -> OneDrive .zip file
  - database - `src/lib/scripts/backup-database.ts` -> JSON file
- Scheduled 
  - `src/lib/scripts/utils/setup-backup-task.ps1`  Windows Scheduled Task at 1am daily
  - `src/lib/scripts/setup-database-backup-task.ps1` Windows Scheduled Task at 2am daily
- Github backup - `.github/workflows/backup.yml` automatic backup on every push to the `main` branch. This backup is stored as a workflow artifact for 7 days, providing an off-site copy.
- Cleanup 
  - codebase - stored 7 days
  - database - Automatically cleans up local backups > 5 days.
- Recovery 
  - codebase Unzip the file to restore the complete project, run `npm install` to reinstall all dependencies.
  - `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/restore-database.ts "C:\\Path\\To\\Your\\Backup\\file.json"`

⭕2 - Update backup scripts and automation

## **APPLICATION**
================================
- The application is separated into 'content' and 'administration' with the core components wrapped in navigation and providers.

### **Application Structure**
- Providers - The core layouts are wrapped in providers
  - AuthProvider - Handles authentication state using NextAuth.js
  - TagProvider - Manages tag data and operations globally
  - CardProvider - Manages card data, filtering, and pagination
- Layouts 
- AppShell: Main layout wrapper providing navigation and structure
- ViewLayout: Handles the main (content) interface
- AdminLayout: Manages the admin interface

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

### **Data Models**
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

### **Home Page**
- Application opens to the home page for login

✅
- Login

### **Top Navigation**
- Top navigation toggles content and admin for the administrator 

✅ 
- content - Available to users and admin
- admin - Available only to admin
- theme toggle

### **Left Sidebar Navigation**
- Left sidebar provides a tabbed table of contents and multi-tag selection for card filtering.

✅ 
Heirarchical Tag Display: `GlobalSidebar.tsx` and `TagTree.tsx` 
Slide in/out on mobile
⭕2 Filtering
    - add sort by when, asc/dec
    - increase indention
⭕2 Table of Contents - Add a curated table of contents, essentially pre-built filters.

### **Content Page**
- After login, the app defaults to the content page `CardFeed.tsx` and `ContentCard.tsx` displaying:

✅ 
Grid View
  - Responsive grid-based layout
  - Three display modes/styles
    - Static - Display only
    ⭕2 Inline - expands/collapses in place
    - Navigate - Links to dedicated card view page   
  - Infinite scroll pagination - IntersectionObserver
  ⭕2 Fix ghost/error layout issues
⭕2 Search - Add search

### **View Card**
- Clicking a `navigate`card navigates to card detail page `src/app/view/[id]/CardDetailPage.tsx` conditionally rendering card components
- `src/app/view/[id]/page.tsx` is executed on the server. Inside this page component, the `getCardData` function calls `getCardById(id)` from `src/lib/services/cardService.ts` to fetch the main card's data from Firestore. 
If the card has children (`childrenIds`), it then calls `getCardsByIds` to fetch them.
- The fetched `card` and `children` objects are passed as props to the client component `<CardDetailPage />`.
-  The `CardDetailPage` component (`src/components/view/CardDetailPage.tsx`) receives the data and is responsible for rendering the final view in the browser. 

✅ 
- Conditional Render - Render page based on components.
  - Title - Render first
  - Subtitle - If present, render next
  - Cover image - If present, render next
  - Content - If present, render using TipTapRenderer.
  ⭕2 Gallery - If present, render grid, (design)
  ⭕2 Children - If present, render next.
⭕3 User Interaction - add user interaction - Like, comment, sharelink

## **Administration**
=======================================
- Top navigation 'Admin' button navigates to Adminsitration, admin-only CRUD/Bulk editing of cards, tags, media and other resources.
`src/app/admin/layout.tsx`

✅
- navigation to Cards, Tags, Media

### **Card System**
=======================================
- The Card is the central data entity of the application
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
- Search by title - ⭕2 - Improve css - Remove blue box
- Filter by Status and Type - `CardProvider` uses the `selectedFilterTagIds` to query `filterTags` map.
- Bulk Operations - `BulkEditTagsModal.tsx` 
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
Add new - `/admin/card-admin/new`
Edit - `src/app/admin/card-admin/[id]/CardAdminClientPage.tsx`
`src/components/admin/card-admin/CardForm.tsx`) is rendered, wrapped in a `CardFormProvider` to manage form state.
✅
- Title, Subtitle
- Excerpt - ⭕2 Default excerpt to first x characters, with override
- Type - `story`, `gallery`, `qa`, `quote`, `callout`
- Status - `draft`, `published`
- displayMode - `static`, `inline`, `navigate`
- Cover Image
  - `CoverPhotoContainer` and `PhotoPicker` to select/upload image.
  - Image used for preview card and view page header.
  - Paste/Drag - ⭕2 - Fix Paste/Drag to upload image.
  - Stores references, not the images.
  - Adjusts and stores objectPosition
  - No caption
- Content
  - Rich text editing - TipTap
  - Inline embedded images, store id only
  - Rest of content held in HTML
  - Captions default to media object with override stored in card `figure`
- Tags
  - `MacroTagSelector`- Modal Selector
  - Tag Selection - `Card.tags` - Stores the tags directly assigned by the user
  - Denormalization - On card save, `cardService` uses `tagService.ts` to calculate and save derived tag data onto the `Card` document.
    - Tag Inheritance - `Card.filterTags` - Map of all inherited tags for efficient querying (e.g., "Paris" -> "France" -> "Europe").
    - Tag Filter - `Card.filterTags`: Stores a map object (`{ "tagId": true, ... }`) of all inherited tags, optimized for fast Firestore `where` queries.
- Gallery
    - Uses `GalleryManager` and `PhotoPicker` for multi-image selection.
    - Drag n drop order
    - Stores gallery as an array of media IDs.
    ⭕2 - Default to media object caption with 'overwrite'.
    ⭕2 - Fix caption, focal point editing
    ⭕2 - Batch upload gallery cards by script
- Children - Search only (not useful) - ⭕2 - Develop linking modal
- Actions
  - Delete - Delete card, remove tags/recalc, remove from any parents, remove related media
  - Cancel - Abandon any outstanding edits and return to list. 
  - Save - Save card, save tags/recalc, add media

### **Tag System**
===========================================
- All cards are assigned multiple, dimensional, and heirarchical tags to enable flexible filtering. 
- All business logic on the server-side (`tagService`) 

**Tag Data Model**
✅ 
- Collection - `tags` canonical tag data
- Schema - `src/lib/types/tag.ts`

**Tag Administration**
`/app/admin/tag-admin/page.tsx`

✅ 
- Hierarchical View - The page renders all tags in a tree structure using `TagAdminList`
- Drag-and-Drop Reordering/Reparenting - `SortableTag.tsx`
- Inline editing - `TagAdminRow.tsx`
  - OnDelete - User choice of children being promoted or cascade deleted
  - OnMove - ⭕2 - cards update?


### **Question Management**
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

### **Gallery Style Management**
- Gallery styles are selectable styles for gallery cards

✅
- None

⭕3 - Devise preconfigured card styles for selection
  
### **Theme Management**
- Themes customizable.

✅
- Light/Dark toggle

⭕2 - MSN Layout style

### **User Management**

⭕3 - Add user management interface

### **Image Management**
=======================================

**Conceptual Architecture**
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

**Media Data Model**
✅
- Collection - `media`
- Schema  - `src/lib/types/photo.ts`

- Local Drive Integration 
- Photopicker Integration
- `imageImportService.ts`
- Sharp image processing  
- Metadata extraction
- Unique ID generation - ⭕2 Refactor to use docId
- Error handling
⭕2 Implement `next/image`
⭕2 objectPosition for preview card view?

**Normalization**
⭕1 Organize, normalize, edit images pre-import
    - 3 directories - zOriginals, yEdited, xNormalized
    - Move originals to zOriginals
    - Copy originals to yEdited
    - Edit (GIMP - Crop, clean, Topaz - sharpen) as needed 
    - Copy script to parent folder
    - Batch normalize to xNormalized
      - extract metadata to json
      - sharpen
      - lighting
      - convert to webP
⭕2 - Batch clean images from testing before production
⭕2 - Batch upload images to cards. 
