# Project Overview

A personal journaling application combining text and media in an immersive flexible and/or curated manner. 

A 'card' contains a story, gallery, quote, or question--made up of text and media and is:
- standalone or nested, containing an array of children, acting as a container of other cards. 
- assigned dimensional and heirarchical tags for flexible filtering. 
- presented in various ways

**Provider Layer
AuthProvider: Handles authentication state using NextAuth.js
TagProvider: Manages tag data and operations globally
CardProvider: Manages card data, filtering, and pagination
These providers are nested in the root layout for global state management

**Core Components
AppShell: Main layout wrapper providing navigation and structure
ViewLayout: Handles the main viewing experience
AdminLayout: Manages the admin interface

**Data Flow
Cards are fetched through the CardProvider using SWR
All data operations go through the /api routes

**Key Features
Infinite scrolling for card lists
Real-time filtering and search
Form state management for card editing
Image handling through Firebase Storage


Legend:
- ✅ Implemented
- 🟡 Operational
- ⭕ Planned - Priority: 1 - next, 2 - on hold
- ❓ Open Question

## **Technical Infrastructure**
=====================================
- This project adheres to a strict client-server, separation of concerns architecture

### **Technical Stack**
- Frontend
  ✅ 
  - Next.js App Router
  - React 18
  - TypeScript
  - CSS Modules
  - TipTap rich text editing
  - PhotoPicker for media selection
  - GalleryManager for galleries
  - Next.js Image Optimization
  - DragNDrop (dnd-kit)
  - Swiper for galleries
  - Zod for schema validation

- Backend
  ✅
  - Auth.js with Firebase adapter
  - Firebase (Firestore, Authentication, Storage)
  - Firebase Admin SDK for server-side operations
  - Zod for data validation
  - Next.js API Routes

- Media: 
  ✅
  - Local drive integration
  - Firebase Storage for asset management
  - Sharp for image processing
  - Efficient caching system

- Development Tools:
✅
  - Version Control: GitHub
  - ESLint for code quality
  - TypeScript for type safety
  - Jest/React Testing Library
  - CSS Modules for styling
  - Custom scripts for migration and backup

⭕
2 - Hosting: Netlify (primary), with Vercel as backup

### **Authentication**
✅
- Auth.js handles user sign-in and session management
- Firestore Adapter: User and session data stored in Firestore
- Application wrapped in AuthProvider
- All API routes secured at the edge
- Role-based access control
- Session persistence

⭕
2 - Add user management interface
2 - Implement more granular permissions

### **Codebase Backup**
✅
- Backup script - A Node.js script (`src/lib/scripts/utils/backup-codebase.ts`) creates a compressed `.zip` archive of the entire codebase on OneDrive.
- Files included - Uses `git ls-files` to efficiently and accurately gather all project files, respecting `.gitignore`.
- Scheduled backup - A PowerShell script (`src/lib/scripts/utils/setup-backup-task.ps1`) creates a Windows Scheduled Task to run the backup script daily at 1 AM for local backups.
- Github backup - A GitHub Actions workflow (`.github/workflows/backup.yml`) automatically creates a backup on every push to the `main` branch. This backup is stored as a workflow artifact for 7 days, providing an off-site copy.
- Cleanup - Automatically cleans up local backups older than 5 days.

⭕2 - Update backup scripts and automation

### **Data Backup (Firestore)**
✅ 
- Backup script - A Node.js script (`src/lib/scripts/backup-database.ts`) reads all documents from the `entries`, `albums`, `tags`, and `users` collections and saves them to a single, timestamped JSON file.
- Scheduled backup - A PowerShell script (`src/lib/scripts/setup-database-backup-task.ps1`) creates a Windows Scheduled Task to run the backup script daily at 2 AM.

⭕2 - Update backup scripts and automation

### **Recovery**
- This section outlines the procedures for recovering from a critical failure.

✅Codebase Recovery
This is a manual process:
- Locate the latest codebase backup file (e.g., `backup-....zip`) in the backup directory.
- Unzip the file. This will restore the complete project structure.
- Open a terminal in the restored project directory and run `npm install` to reinstall all dependencies.

✅Database Recovery
This is a deliberate, interactive process using the `restore-database.ts` script.
- Identify the JSON backup file you wish to restore (e.g., `firestore-backup-....json`).
- Run the restore script from the terminal, passing the full path to the backup file as an argument. Example:
```bash
    npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/restore-database.ts "C:\\Path\\To\\Your\\Backup\\file.json"
```
- The script will display the collections and document counts from the backup file and ask for confirmation.
- To proceed, you must type `restore` and press Enter. Any other input will cancel the operation.
- The script will then overwrite the existing database collections with the data from the backup file.

### **Database**
=======================================

#### **Firestore Structure**
✅ 
- cards collection (primary content store)
- media collection (asset metadata)
- tags collection (hierarchical organization)
- cache collection (performance optimization)
- users collection (authentication)

⭕2 - Remove legacy collections (entries/albums)

#### **Security Rules**
✅ 
- Data access rules
- Collection-level security
- Field-level security
- Rate limiting
- Security logging

⭕
2 - Implement more granular field-level security

#### **Data Validation**
✅ 
- Zod schemas for all data types
- Server-side validation
- Client-side validation
- Type checking with TypeScript
- Required field validation
- Format validation
- Cross-field validation

⭕
2 - Add more comprehensive error messages

## **Content Consumption**
======================================

### **Home Page**
✅
- Logo
- Cloud images
- Welcome message
- Login

⭕
2 - Add image(s) of me from various stages


### **Content Page**
- Opening View for all users.
- Focused on consuming content: viewing cards, galleries, and navigating via tags.
- No editing or admin controls.

✅ Grid View: CardFeed.tsx and ContentCard.tsx work together to display a grid of cards for browsing.
    - Responsive grid-based layout
    - Dynamic card sizing
    - Three display modes
      - Inline - expands/collapses in place
      - Navigate - Links to dedicated card view page
      - Static - Display only
    - Infinite scroll pagination
    - Uses IntersectionObserver to load more children as the user scrolls.
    - Tag-based filtering
    - Search functionality
    - Optimized image loading
⭕2 - Test `inline` mode - expands/collapses in place - may already exist
⭕2 - Test `static` - Display only
⭕2 - Style card types
⭕2 - Fix ghost/error layout issues

### **Card View**
`src/app/view/`

✅ Page - `[id]/CardDetailPage.tsx` provides the dedicated, full-page view for a single card, including children, gallery, and content.
⭕2 Conditional Render - Render page based on type and components.
      - Title - Render first
      - Subtitle - If present, render next
      - Cover image - If present, render next
      - Content - If present, render using TipTapRenderer.
      - Gallery - If present, render grid,
      - Children - If present, render next.
⭕2 User Interaction - add user interaction - Like, comment, sharelink

### **Theme System**
✅
- light/dark theme
- fixed schemes
- limited styling throughout

⭕ @ MSN Layout - add MSN-style layout and theme
    2 - home
    2 - content page
    2 - cards by type
    2 - admin pages
    2 - make fully customizable - add to Settings

### **Navigation Systems**
=====================================

### **Top Navigation**
- Top navigation toggles content and admin for the administrator and defaults to content for a user. 

✅ 
- logo
- content - aAvailable to users and admin
- admin - only available to administrator
- theme toggle

⭕
2 - make admin available to users for settings only
2 - make logo svg and background transparent
2 - remove 'lines'
2 - make consistent throughout

### **Curated Navigaton**
⭕
2 - create table of contents
2 - create tabbed sidebar - toc/tag

### **View Search**
⭕
2 - add basic title search - top of content
2 - add subtitle, status, content

## **Content Administration**
=======================================
- Admin-only features for managing cards, tags, and other resources.
- CRUD/Bulk editing operations for app elements
`src/app/admin/`
`layout.tsx`- Admin layout, navigation, and access control.

✅
- navigation
- card management
- tag management

⭕ 
2 - fix page scrolling under navigation bar
2 - add questions management - hold
2 - add themes management - hold
2 - add users management  hold

### **Card System**
=======================================

- The Card is the central data entity of the application
- All business logic on the server-side (cardService) 
- The data model is denormalized to efficiently support complex relationships (with tags and media)

#### **Data Model & Backend**
✅ Firestore Collection: `cards` collection stores all card documents.
✅ Atomic Writes: All card updates are performed within a Firestore writeBatch to ensure that updates to the card document and any related media documents either all succeed or all fail together, preventing data inconsistency.
⭕2 Child Strategy - The strategy for managing child cards is not fully defined. 
    - The idea behind having a nested card was to be able to accomodate the conceived World & Politics, Father sections, where a card can contain related stories. 
    - How are cards assigned? - Currently there is a search bar, but this is not going to suffice. What is needed is a filtering system to list the related cards and select/order them for inclusion. This could be done by modal within a card or in bulk assign children in card management. Perhaps this could be done like tag heirarchy and order. Filter on cards, then assign parent/order
    - When a parent card is deleted, their children are promoted.
⭕1 Data Validation: Implement Zod schemas on the POST /api/cards and PATCH /api/cards/[id] routes to validate all incoming data before it reaches the cardService.

#### **Card Management** 
- Card management (list, create, edit, bulk actions).
`/app/admin/card-admin/` 

✅ Comprehensive card list
✅ Card Creation & Editing: CardForm.tsx is the primary component for all card create/update operations.
✅ Rich Text Content: The form uses the Tiptap editor for the content field, allowing rich text formatting and inline image embedding.
✅ Bulk Operations: The BulkTagEditorModal.tsx component allows for applying tags to multiple selected cards at once.
✅CoverIcon - Thumbnail version of coverImage
✅ Cover Image: CoverPhotoContainer.tsx provides a UI for uploading and managing the card's cover image, including setting the focal point (objectPosition).
✅ Pagination - Load more... 
✅ Search - Advanced search functionality
✅ Filtering - Type/status filtering
✅ Bulk operations

⭕2 - Improve bulk operations
⭕2 - Add advanced filtering - other fields, displayMode
⭕2 - Implement sorting options
⭕2 - Test inline editing
⭕2 - Fix statistics
⭕2 - Tag management
⭕2 - Drag n Drop parent/order functionality

### **Card New/Edit** 
`src/app/admin/card-admin/[id]/CardAdminClientPage.tsx`
`CardForm.tsx`

✅Title
✅Subtitle
✅Excerpt - 
  ⭕2 Default excerpt to first x characters, with override

✅ Cover Image: 
  - Image used for preview card and view page header.
  - CoverPhotoContainer and PhotoPicker to select/upload an image.
  - Paste/Drag to upload image.
  - Stores reference, not the image.
  - Stores objectPosition, no caption

✅ Content field:
  - Rich text editing
  - Embedded images, id only
  - Rest of content held in HTML
  - Captions default to media object with override stored in card.

✅ Tag assignment:
  `MacroTagSelector`(Tag Component)
  - Modal Selector: `ExpandedView` allows users to select tags from the full dimensional hierarchy.
  - Collapsed View: When not editing, the component displays the selected tags, organized by dimension.
  ⭕2 Fix tag strategy
      - Fix prop/state mismatch
      - Fix incorrect dimension handling
      - Implement type safety
      - Fix Inconsistent data structure usage

✅ Gallery:
    - Uses GalleryManager and PhotoPicker for multi-image selection.
    - Stores gallery as an array of media IDs.
    - Defaults to media object caption with override stored in media object (overwrite)
    - Set caption, focal point

✅ Child card linking
    - Search only right now.
    ⭕2 - Develop linking strategy

⭕2 - Batch upload gallery cards



### **Tag System**
===========================================
- All cards are assigned multiple, dimensional, and heirarchical tags to enable flexible filtering. 
- Tags are  denormalized on each `Card` document for filtering. 

#### **1. Data Model & Backend**
✅ Firestore Collection - `tags` canonical tag data
⭕ 1 Structure: The current `dimension` model is flat. We need to decide if a more complex, multi-dimensional, or faceted tag structure is needed for the long term. This decision impacts almost every part of the tagging system.
⭕ Card type has dimensional arrays. Form state has flat tag array
✅ Denormalization - On card save, `cardService` uses `tagDataAccess.ts` to calculate and save derived tag data onto the `Card` document itself.
⭕2 Performance: `tagDataAccess.ts` currently fetches all tags from Firestore on every calculation. This should be optimized with a server-side cache to reduce Firestore reads during bulk updates.
✅ Storage - `Card.tags` - Stores only the tags directly assigned by the user.
✅ Inheritance - `Card.inheritedTags` - Flattened array of direct and ancestor tags (e.g., "Paris" -> "France" -> "Europe").
✅ Filter - `Card.filterTags`: Stores a map object (`{ "tagId": true, ... }`) of all inherited tags, optimized for fast Firestore `where` queries.
⭕1 API Route Validation: API routes (`/api/tags`) should use Zod schemas to validate incoming request bodies for create and update operations. This ensures required fields (like `name`) are present and data types are correct.
⭕1 Error Handling: API routes should use `try...catch` blocks to handle errors from services gracefully, returning appropriate HTTP status codes (e.g., 400, 404, 500) and logging the error server-side for troubleshooting.

#### **2. Tag Administration**
`/app/admin/tag-admin/`

✅ Hierarchical View: The `page.tsx` renders all tags in a tree structure `TagTreeView`
✅ Editing: Users can click to edit tag names inline (`TagAdminRow.tsx`).
✅ Drag-and-Drop Reordering/Reparenting: The UI (`SortableTag.tsx`) supports drag-and-drop to change tag order and parent-child relationships. 
  - OnMove, the `parentId` and `path` array of the moved tag are updated and script updates the `path` array for all *descendant tags* of the moved tag.
  - OnDelete - User choice of 1) children are promoted or 2) cascade deleted
  ❓ When tags are moved/renamed, what is the update strategy for the denormalized inheritedTags and filterTags on thousands of existing cards? (e.g., On next card write? Or a one-time bulk update script?)
⭕ 2 Dimension Assignment: Currently, a tag's `dimension` (`who`, `what`, `when`, etc.) is a string field that must be set manually in Firestore. An admin UI should be created to manage this.
✅ Bulk Editing: The `BulkTagEditorModal.tsx` reuses this logic to allow applying tags to multiple cards at once.
✅ Add child tags with a + button.

### **3. Tag Filtering**
- Primary user-facing feature for discovering content via tags.
- Filtering is Inter-dimensional "AND" and Intra-dimensional "OR"
`GlobalSidebar.tsx` and `TagTree.tsx`

✅ State Management: `TagProvider` fetches all tags and provides the tag tree and filter state to the application.
✅ Hierarchical Display: `TagTree.tsx` displays the full, browseable hierarchy of tags, grouped by dimension with expand/collapse functionality.
  ⭕2 - include number of cards (x) - requires cloud function
  ⭕2 - add orderBy options
  ⭕2 - increase indention
  ⭕2 - slide in/out on mobile
✅ Multi-Select Filtering: Users can select multiple tags. `CardProvider` then uses the `selectedFilterTagIds` to query for cards that contain any of the selected tags in their `filterTags` map.
✅ Filtering - Filtering logic is executed on the server to avoid Firestore's query limitations.
✅ Cache - Tag hierarchy UI display is sourced from a single cached JSON object in Firestore `cache/tagTree`, initiated once on startup and automatically updated by a serverless Cloud Function whenever a tag is changed to ensure fast-loading UI with minimal reads.
✅ Group Tags by Dimension - The service receives tag IDs, fetches their definitions, and groups them by dimension (e.g., 'who', 'what').
✅ Intra-Dimension "OR" Logic - For each dimension, it fetches all card IDs that match *any* of the selected tags in that group.
✅ Inter-Dimension "AND" Logic - It then calculates the *intersection* of the results from each dimension to get the final list of card IDs that match all criteria.
✅ Pagination - It paginates over this final list of IDs to return the requested page of cards.
✅ Security Model: Tag creation, modification, and deletion are restricted to authenticated users with an 'admin' role via the /api/tags endpoint.
❓2 - Are query optimization or alternative data-loading strategies needed?

### **Question Management**
- Questions are prompts for stories.

✅
- None

⭕ 2
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

⭕
2 - Preconfigured card styles for selection
2 - Custom card styles for selection

❓what are the variables that need to be included/decided on gallery styling

### **Theme Management**
- Themes customizable.

✅
- Light/Dark toggle

⭕
2 - UI management

❓ - what are the variables that need to be included/decided?

### **IMAGE INTEGRATION**
=======================================

Conceptual Architecture:
- Source images reside in various *external sources* --(local, OneDrive, Google, Appple, etc.)
  - Current implementation sources from *local drive* (mirrored from OneDrive)
- Images imported (picker or paste/drop) and assigned to fields in cards
- The app provides a *generic service layer* to external sources to:
  - Connect
  - Browse and select their content with PhotoPicker or accept paste/drop
  - Import the images to firebase, *sharp* process them, prepare *metadata* 
  - Return *ID* to card for storage and object for immediate display
    - Only context-secific image metadata is stored in the cards.
    - Media collection tracks metadata and relationships
  - Optimize performance through caching and lazy loading.
Flow:
- User browses local files through PhotoPicker or paste/drop
- Selected images uploaded to Firebase Storage
- Metadata stored in media collection
- Images served to content via Firebase ID/URLs
- Image import/processing happens on select.
  - Allows handling of select-save period.
  - Must delete if not saved to avoid orphans
- Image deletion happens on-demand. 
- User selects, 
  - onAdd, 
    - import
    - process - create id & metadata
      - mark 'temporary'
    - send id and object to display
  - OnSave
    - update doc to 'active'
  - OnRemove/OnCancel/OnDelete
    - delete media doc/object
- Images sized on the fly

✅**Data Model & Backend**

✅**Firebase**
- Collection - `media`
- Schema set
- Metadata management
- Access control
- Download URL generation
- Cache management
Base caption (optional) stored with media object (potentially from file metadata later)
Images have two states: 'temporary' (selected but not saved) and 'active'(saved)
Object Position Needs to be context-specific
Preview card (potentially different handling needed)
Doesn't apply to content images
⭕2 - Backup - Add media to backup 
⭕2 - Error Handling - If import fails, provide error and options. Accept imported or none?

✅**Local Drive** 
- API integration
- File system navigation

✅**Photopicker**
- Integrated media selection
- Tree-based navigation
- Single/multi-select modes

✅**Services**
`imageImportService.ts`

- Sharp image processing
- Metadata extraction
- Unique ID generation
- Error handling

**Normalization**
⭕2 - Normalize images pre-import
2 - Normalize images prior to upload
2 - Batch clean images from testing before production
1 - Prepare Images for upload
- Implement advanced image processing
- resize - thumb 400w, medium 600w, large 1600w - 2048px max
- aspect ratios - landscape/banner, portrait, square
  - smart crop - VisionAPI cropHintsAnnotation
- upscale
- convert format - webP or optimized JPEG
- white balance
- color balance?
- auto contrast
- gamma correction
- sharpening
- rename
- extract metadata
- process - upload->normalize
- preserve originals
- VisionAPI
  - auto-tag
  - face detection
- stable unique id on import
- build replace utility
- use srcset to allow browser to select?
2 - Implement batch processing
- Portrait images in landscape containers handled with:
  - Smart cropping
  - Blurred background