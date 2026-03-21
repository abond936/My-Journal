# Project Overview

**Purpose** 
A personal journaling application combining text and media into cards with dimensional heirarchical tagging for flexible content consumption.  

**Primary Users**
The primary users are the author (admin) creating the content and his family consuming it, primarily on mobile, but tablet and desktop.

**Current State**
- Core functionality exists
- Some architectural elements still required
- Further functional buildout and QA required.

**Roadmap**

- Rationalize/build out content navigation/presentation.

Legend:
- ✅ Implemented
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
- Consumption and Administration separated
- Data Model (Cards → Tags → Media)
- Cards (primary content)
  - Contain text and media, combining legacy entries and albums
  - Presentation varied per type and styling
- Tags (hierarchical organization)
  - Dimensional and heirarchical, parent/child relationship
  - Tags denormalized into cards for query performance
  - Server-side filtering to avoid Firestore limitations  
- Media (assets)
  - Imported from external sources to db for stability.
  - Referenced in cards by id, hydrated on demand
  - Processed with Sharp
- Theme (centralized CSS)

**Frontend**
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

**Backend**
✅
  - Auth.js with Firebase adapter
  - `firebase-admin` SDK for server-side operations
  - Zod for data validation
  - Next.js API Routes
  - Application wrapped in AuthProvider
  - All API routes secured at the edge
  - Role-based access control
  - Session persistence

⭕2 - Comment code
⭕2 - Cleanup directory
⭕2 - Address ESLint violations (~100+; build uses ignoreDuringBuilds; run `npm run lint` locally)
⭕2 - QA app
⭕2 - Host app (Netlify/Vercel)

**Scripting**
 - `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json` 
`
**Backup**
✅ 
- OneDrive - Windows Scheduled Task at 2am daily, auto awake pc, cleared >5 days, `npm run backup:database`
- Github - On every push, for 7 days

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
- Server-side and client-side validation
- Type checking with TypeScript
  - `Card` - `src/lib/types/card.ts` - Central data entity in the application, containing content, metadata, and references to tags and other cards.
  - `Tag` - `src/lib/types/tag.ts` - Structure for dimensional and hierarchical tags used for organizing and filtering cards.
  - `Media` - `src/lib/types/photo.ts` - Media assets (image, video) stored in Firebase Storage, including metadata like dimensions and paths.

### **Home Page**
- Application opens to the home page for login

✅
- Login
- SVG Logo

### **Top Navigation**
- Top navigation toggles content and admin 

✅ 
- content - Available to users and admin
- admin - Available only to admin
- theme toggle

### **Left Sidebar Navigation**
- Left sidebar provides dimension tabs and tag selection for card filtering.

✅ 
- Dimension tabs: All | Who | What | When | Where | Reflection | Collections
- Collections tab: Cards with children, grouped by dimension (who/what/when/where/reflection), sorted A–Z
- Hierarchical Tag Display: `GlobalSidebar.tsx` and `TagTree.tsx`
- Discovery filtered by card type and active dimension
- Slide in/out on mobile
⭕2 Filtering: sort by when asc/desc, increase indentation
⭕2 Table of Contents: drag & drop ordering for collections

### **Content Page**
- After login, the app defaults to the content page `CardFeed.tsx` and `ContentCard.tsx` displaying:

✅ 
- Grid View
  - Responsive grid-based layout
  - 3 display modes/styles
    - Static - Display only (Question, Quote)
    - Inline - Expands/collapses in place ()
    - Navigate - Links to dedicated card view page (story, Gallery) 
  - 4 card types:
    - Story Card
      - Title - Bottom ⭕2 - Increase font size
      - Overlay

    - Gallery Card
      - Title - Top
      - Excerpt
      - Inline expansion
      ⭕2 - Horizontal Image slider 1/5
        - Edit pics, normalize, upload
        - Mom first

    - Question Card
      - Background
      - Question Mark

    - Quote Card
      - Dad book
      - Notion quotes
      - Grandfather book

- Random cards
  - 3 related
  - 3 unrelated
  - After story/gallery
  - In feed

    ⭕2 - Box w/ 3 titles (stories, galleries, questions)
        - by dimension
          - who, what, when, where - colored tag - 3 stories (book), 3 galleries (negative/grid), 3 questions (?), 3 quotes (")
        - by type 
          - story, gallery, question, quote, colored tag - who (person), what(landscape/cube), when(calendar), where (pin)
⭕2 - Search - Add search

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
  - Related - Display 3 random from filter  ⭕2 - Change box size
  - Explore - Display 3 random outside filter  ⭕2 -Change box size
⭕3 User Interaction - add user interaction - Like, comment, sharelink

## **Administration**
=======================================
- Top navigation `Admin` button navigates to Adminsitration, admin-only CRUD/Bulk editing of cards, tags, media and other resources.
`src/app/admin/layout.tsx`

✅
- navigation to Cards, Tags, Media, Theme

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
- Search by title 
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
  - Paste/Drag - ⭕1 - Fix Paste/Drag to upload image.
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
    - Stores gallery as an array of `docId`s.
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
- All business logic on the server-side in `tagService` 

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
  - OnMove - Updates parent and order and recalcs tag card counts

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
- Admin page
- MSN Layout style

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
- Error handling
- `next/image`
⭕1 objectPosition for preview card view?

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
⭕2 - Batch upload images to cards. 
