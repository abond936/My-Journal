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
- ⭕ Planned
- ❓ Open Question

Priority:
1 - next
2 - on hold





## **Technical Infrastructure**
=====================================

This project adheres to a strict client-server, separation of concerns architecture

### **Technical Stack**
----------------------------------
Status: ✅ Implemented

- Frontend
  ✅ 
  - Next.js App Router
  - React 18
  - TypeScript
  - CSS Modules
  - TipTap rich text editing
  - PhotoPicker for media selection
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
=================================
Status: ✅ Implemented

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
--------------------------------------
Status: ✅ Implemented

✅
- Backup script - A Node.js script (`src/lib/scripts/utils/backup-codebase.ts`) creates a compressed `.zip` archive of the entire codebase on OneDrive.
- Files included - Uses `git ls-files` to efficiently and accurately gather all project files, respecting `.gitignore`.
- Scheduled backup - A PowerShell script (`src/lib/scripts/utils/setup-backup-task.ps1`) creates a Windows Scheduled Task to run the backup script daily at 1 AM for local backups.
- Github backup - A GitHub Actions workflow (`.github/workflows/backup.yml`) automatically creates a backup on every push to the `main` branch. This backup is stored as a workflow artifact for 7 days, providing an off-site copy.
- Cleanup - Automatically cleans up local backups older than 5 days.

### **Data Backup (Firestore)**
--------------------------------------
Status: ✅ Implemented

✅ 
- Backup script - A Node.js script (`src/lib/scripts/backup-database.ts`) reads all documents from the `entries`, `albums`, `tags`, and `users` collections and saves them to a single, timestamped JSON file.
- Scheduled backup - A PowerShell script (`src/lib/scripts/setup-database-backup-task.ps1`) creates a Windows Scheduled Task to run the backup script daily at 2 AM.

⭕
2 - Update backup scripts and automation

### **Recovery**
---------------------------------------
Status: ✅ Implemented

This section outlines the procedures for recovering from a critical failure.

Codebase Recovery
This is a manual process:
- Locate the latest codebase backup file (e.g., `backup-....zip`) in the backup directory.
- Unzip the file. This will restore the complete project structure.
- Open a terminal in the restored project directory and run `npm install` to reinstall all dependencies.

Database Recovery
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
---------------------------------------
Status: ✅ Implemented

✅ 
- cards collection (primary content store)
- media collection (asset metadata)
- tags collection (hierarchical organization)
- cache collection (performance optimization)
- users collection (authentication)

⭕
1 - Remove legacy collections (entries/albums)

#### **Security Rules**
-----------------------------------------
Status: ✅ Implemented

✅ 
- Data access rules
- Collection-level security
- Field-level security
- Rate limiting
- Security logging

⭕
2 - Implement more granular field-level security
2 - Add request validation rules

#### **Data Validation**
---------------------------------------------
Status: ✅ Implemented

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
2 - Implement custom validation rules

## **Content Consumption**
======================================

### **Home Page**
---------------------------------
Status: - ✅ Implemented

✅
- Logo
- Cloud images
- Welcome message
- Login

⭕
2 - Add image(s) of me from various stages


### **Content Page**
---------------------------------
Status: ✅ Implemented

- Opening View for all users.
- Focused on consuming content: viewing cards, galleries, and navigating via tags.
- No editing or admin controls.

✅ Grid View: CardFeed.tsx and ContentCard.tsx work together to display a grid of cards for browsing.
    - Responsive grid-based layout
    - Dynamic card sizing
    - Infinite scroll pagination
    - Uses IntersectionObserver to load more children as the user scrolls.
    - Tag-based filtering
    - Search functionality
    - Optimized image loading
    - Cached tag hierarchy
✅- Three display modes
    - Inline - expands/collapses in place
    - Navigate - Links to dedicated card view page
    - Static - Display only
⭕ 1 - Fix ghost/error layout issues
⭕ 2 - Improve styling - card sizing 
⭕ 2 - Add sorting options

### **Card View**
---------------------------------
Status: ✅ Implemented

Location: src/app/view/

✅ Navigate View - `[id]/CardDetailPage.tsx` provides the dedicated, full-page view for a single card, including children, gallery, and content.
✅ Infinite Scroll - The card feed uses an IntersectionObserver to automatically load more cards as the user scrolls to the bottom of the page.
❓2 - Are query optimization or alternative data-loading strategies needed?
⭕ 2 Conditional Render - Render page based on type and components.
      - Title - Render first
      - Subtitle - If present, render next
      - Cover image - If present, render next
      - Content - If present, render using TipTapRenderer.
      - Gallery - If present, render grid,
      - Children - If present, render next.
        - Uses CardProvider to fetch and render child cards (nested structure).
⭕ 2 - Test `inline` mode - expands/collapses in place - may already exist
⭕ 2 - Test `static` - Display only
⭕ 2 - Styling for card types


### **User Interaction System**
---------------------------------
Status: ⭕ Planned

⭕
2 - add user interaction - Like, comment, sharelink

### **Theme System**
---------------------------------
Status: 🟡 Operational

✅
- light/dark theme
- fixed schemes
- limited styling throughout

⭕
2 - add MSN-style layout and theme
2 - home
2 - content page
2 - cards by type
2 - admin pages
2 - make fully customizable - add to Settings

### **Navigation Systems**
=====================================

### **Top Navigation**
---------------------------------
Status: ✅ Implemented

Top navigation toggles between content and admin for the administrator and defaults to content for a user. 

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
---------------------------------
Status: ⭕ Planned

⭕
2 - create table of contents
2 - create tabbed sidebar - toc/tag

### **View Search**
---------------------------------
Status: ⭕ Planned

⭕
2 - add basic title search - top of content
2 - add subtitle, status, content


## **Content Administration**
=======================================
Status: 🟡 Operational

- src/app/admin/ - Admin-only features for managing cards, tags, and other resources.
- layout.tsx - Admin layout, navigation, and access control.
- Administration is only available to admin
   - CRUD/Bulk editing operations for app elements

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

The Card is the central data entity of the application
All business logic on the server-side (cardService), making card creation, updates, and retrieval a simple process for the client. The data model is heavily denormalized to support complex relationships (with tags and media) while ensuring fast, efficient reads for the end-user.

#### **Data Model & Backend**
----------------------------------------
Status: ✅ Implemented

✅ Firestore Collection: `cards` collection stores all card documents.
⭕ Thin Client - Refactor `cardService` according to thin clinet architecture.
✅ Media Lifecycle: `cardService` manages the media lifecycle. 
✅ Atomic Writes: All card updates are performed within a Firestore writeBatch to ensure that updates to the card document and any related media documents either all succeed or all fail together, preventing data inconsistency.
❓ Child Card Management: The strategy for managing child cards is not fully defined. What happens to child cards when a parent card is deleted? (e.g., Are they deleted? Promoted to top-level cards?).
⭕ 1 Data Validation: Implement Zod schemas on the POST /api/cards and PATCH /api/cards/[id] routes to validate all incoming data before it reaches the cardService.

#### **Card Management** 
---------------------------------
Status: ✅ Implemented

`/app/admin/card-admin/` - Card management (list, create, edit, bulk actions).

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

⭕1 - Improve bulk operations
⭕2 - Add advanced filtering - other fields, displayMode
⭕2 - Implement sorting options
⭕2 - Test inline editing
⭕2 - Fix statistics
⭕2 - Tag management
⭕2 UI/UX Polish: The CardForm.tsx is complex. It could benefit from being broken into smaller, more manageable sub-components to improve code clarity and user experience. ??


### **Card New/Edit** 
---------------------------------
Status: ✅ Implemented

Creating/Editing a Card (
  `src/app/admin/card-admin/[id]/CardAdminClientPage.tsx`
  `CardForm.tsx`

#### **CardAdminClientPage**
✅ - Handles data fetching (card and tags)
✅ - Manages delete functionality
✅ - Wraps everything in CardFormProvider
✅ - Passes props: initialCard, allTags, onSave
⭕2 - Pass same props to either CardFormProvider and CardForm, not both.
⭕2 - Delete functionality could be moved to CardForm
⭕2 - No loading states for tag fetching
⭕2 - Simplify prop passing
⭕2 - Better error handling
⭕2 - Clear separation of concerns

#### **CardFormProvider** (Context)
✅ - Manages form state
✅ - Handles validation
✅ - Provides update methods
✅ - Uses a single tags array
⭕2 - Doesn't properly handle dimensional tags (who, what, when, where, reflection)
⭕2 - Restructure state to match Card type
⭕2 - Validate dimensional tags
⭕2 - Implement vaidation and logging


#### **CardForm** (Main Form)
✅ - Renders form sections
✅ - Handles form submission
✅ - Manages child components
✅ - Passes props to tag selectors
⭕2 - Consistent prop passing
⭕2 - Clear mixed responsibilities
⭕2 - Implement valdiation and error handling
⭕2 - Remove redundant state management


#### **MacroTagSelector** (Tag Component)
✅ - Tries to handle single dimension
✅ - Direct form state access
✅ - Mixed tag ID and object handling

⭕2 - Fix prop/state mismatch
⭕2 - Fix incorrect dimension handling
⭕2 - Implement type safety
⭕2 - Fix Inconsistent data structure usage

✅ Cover Image: 
  - Image used for preview card and view page header.
  - CoverPhotoContainer and PhotoPicker to select/upload an image.
  - Stores reference, not the image.
  - Stores objectPosition, no caption
  - Fetches and caches media details for display.
✅ Content field:
  - Rich text editing
  - Embedded images, id only
  - Rest of content held in HTML
  ⭕1- Add Quote Block
  ⭕1- Fix text wrap
  ⭕1 Fix image engine
✅ Tag assignment
  ⭕2 Fix tag strategy
✅ Gallery:
    - Uses GalleryManager and PhotoPicker for multi-image selection.
    - Stores gallery as an array of media IDs.
    - Defaults to media object caption
✅ Child card linking
  ⭕2 - Develop linking strategy
⭕2 - Implement Status control
⭕2 - Implement Validation
⭕2 - Implement Error handling

⭕2 - Default excerpt to first x characters
⭕2 - Batch upload gallery cards
⭕2 - Normalize images 


### **Tag System**
===========================================
Status: ✅ Implemented

Strategy

- All cards are assigned multiple, dimensional, and heirarchical tags to enable flexible filtering. 
-Tags are  denormalized on each `Card` document during write operations to makes read queries fast and simple by avoiding complex, real-time hierarchy calculations. 


#### **1. Data Model & Backend**
------------------------------------------
Status: ✅ Implemented

✅ Firestore Collection - `tags` canonical tag data
⭕ 1 Structure: The current `dimension` model is flat. We need to decide if a more complex, multi-dimensional, or faceted tag structure is needed for the long term. This decision impacts almost every part of the tagging system.
⭕ Card type has dimensional arrays. Form state has flat tag array
✅ Denormalization - On card save, `cardService` uses `tagDataAccess.ts` to calculate and save derived tag data onto the `Card` document itself.
⭕ 1 Performance: `tagDataAccess.ts` currently fetches all tags from Firestore on every calculation. This should be optimized with a server-side cache to reduce Firestore reads during bulk updates.
✅ Storage - `Card.tags` - Stores only the tags directly assigned by the user.
✅ Inheritance - `Card.inheritedTags` - Flattened array of direct and ancestor tags (e.g., "Paris" -> "France" -> "Europe").
✅ Filter - `Card.filterTags`: Stores a map object (`{ "tagId": true, ... }`) of all inherited tags, optimized for fast Firestore `where` queries.
##### **3. Data Validation & Error Handling**
--------------------------------------------
Status: ⭕ Planned

⭕ 1 API Route Validation: API routes (`/api/tags`) should use Zod schemas to validate incoming request bodies for create and update operations. This ensures required fields (like `name`) are present and data types are correct.
⭕ 1 Error Handling: API routes should use `try...catch` blocks to handle errors from services gracefully, returning appropriate HTTP status codes (e.g., 400, 404, 500) and logging the error server-side for troubleshooting.


#### **2. Tag Administration**
--------------------------------------------
Status: ✅ Implemented

Location: `/app/admin/tag-admin/`

✅ Hierarchical View: The `page.tsx` renders all tags in a tree structure `TagTreeView`
✅ Editing: Users can click to edit tag names inline (`TagAdminRow.tsx`).
✅ Drag-and-Drop Reordering/Reparenting: The UI (`SortableTag.tsx`) supports drag-and-drop to change tag order and parent-child relationships. 
  - OnMove, the `parentId` and `path` array of the moved tag are updated and script updates the `path` array for all *descendant tags* of the moved tag.
  - OnDelete - User choice of 1) children are promoted or 2) cascade deleted
  ❓ When tags are moved/renamed, what is the update strategy for the denormalized inheritedTags and filterTags on thousands of existing cards? (e.g., On next card write? Or a one-time bulk update script?)
⭕ 2 Dimension Assignment: Currently, a tag's `dimension` (`who`, `what`, `when`, etc.) is a string field that must be set manually in Firestore. An admin UI should be created to manage this.
✅ Bulk operations
✅ Add child tags with a + button.

### **3. Tag Filtering**
---------------------------------
Status: ✅ Implemented

Primary user-facing feature for discovering content via tags.
Filtering is Inter-dimensional "AND" and Intra-dimensional "OR"

Location: `GlobalSidebar.tsx` and `TagTree.tsx`.
✅ State Management: `TagProvider` fetches all tags and provides the tag tree and filter state to the application.
✅ Hierarchical Display: `TagTree.tsx` displays the full, browseable hierarchy of tags, grouped by dimension with expand/collapse functionality.
⭕ 2 - include number of cards (x) - requires cloud function
⭕ 2 - add multiple orderBy
⭕ 2 - increase indention
⭕ 2 - slide in/out on mobile

✅ Multi-Select Filtering: Users can select multiple tags. `CardProvider` then uses the `selectedFilterTagIds` to query for cards that contain any of the selected tags in their `filterTags` map.
✅ Filtering - Filtering logic is executed on the server to avoid Firestore's query limitations.
✅ Cache - Tag hierarchy UI display is sourced from a single cached JSON object in Firestore `cache/tagTree`, initiated once on startup and automatically updated by a serverless Cloud Function whenever a tag is changed to ensure fast-loading UI with minimal reads.
✅ Group Tags by Dimension - The service receives tag IDs, fetches their definitions, and groups them by dimension (e.g., 'who', 'what').
✅ Intra-Dimension "OR" Logic - For each dimension, it fetches all card IDs that match *any* of the selected tags in that group.
✅ Inter-Dimension "AND" Logic - It then calculates the *intersection* of the results from each dimension to get the final list of card IDs that match all criteria.
✅ Pagination - It paginates over this final list of IDs to return the requested page of cards.
✅ Security Model: Tag creation, modification, and deletion are restricted to authenticated users with an 'admin' role via the /api/tags endpoint.


#### **4. Tag Assignment**
----------------------------------------
Status: ✅ Implemented

Tags are assigned to a `Card` during creation or editing using `MacroTagSelector`.
Tag lineage is calculated and assigned server-side by `cardService`

Location: `MacroTagSelector.tsx`.
✅ Modal Selector: A modal (`ExpandedView`) allows users to select tags from the full dimensional hierarchy (`who`, `what`, `when`, etc.).
✅ Collapsed View: When not editing, the component displays the selected tags, organized by dimension, providing a clear summary.
✅ Bulk Editing: The `BulkTagEditorModal.tsx` reuses this logic to allow applying tags to multiple cards at once.

### **Question Management**
---------------------------------
Status: ⭕ Planned - on hold

Questions are prompts for stories.

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
---------------------------------
Status: ⭕ Planned - on hold

Gallery styles are selectable styles for gallery cards

✅
- None

⭕
2 - Preconfigured card styles for selection
2 - Custom card styles for selection

❓what are the variables that need to be included/decided on gallery styling

### **Theme Management**
----------------------------------
Status: ⭕ Planned

Themes customizable.

✅
- Light/Dark toggle

⭕
2 - UI management

❓ - what are the variables that need to be included/decided?

### **IMAGE INTEGRATION**
=======================================
Status: 🟡 Operational

The system is designed to provide a seamless way to import images from various sources, process them for web use, and associate them with content cards in the form of cover images, content embeds, and galleries.

Conceptual Architecture:
- Source images reside in various *external sources*
  - Current implementation sources from local drive (mirrored from OneDrive)
  - Future sources conceived of being OneDrive directly, Google Photos, and/or Apple Photos
- The app provides a *generic service layer* to external sources to:
  - Connect
  - Browse and select their content with PhotoPicker
  - Import the images, *sharp* process them, prepare *metadata* 
- Store images Firebase
- Firebase serves as delivery mechanism for all app content *by ID*
  - Images are not stored in the cards.
  - only context-secific image metadata is stored in the cards.
- Media collection tracks metadata and relationships
- Optimize performance through caching and lazy loading.
- Image operations (processing, storage, lifecycle management) are handled by server-side services.

#### **Data Model & Backend**
----------------------------------------
Status: 🟡 Operational

✅ Firestone Collection: `media` 

❓ sourcePath Field: The sourcePath field stores a path back to the user's local drive (e.g., C:\Users\...\image.jpg). Is this necessary? It could be a privacy concern and may not be useful long-term. We should decide if this field should be kept, anonymized, or removed.
❓ Error Handling: What is the desired user experience if an image upload fails partway through the process? The current API returns a generic 500 error. A more robust strategy for handling and communicating partial failures to the user should be designed.



Image Integration (src/components/admin/card-admin/CardForm.tsx, imageImportService.ts)
Flow:
- User browses local files through PhotoPicker
- Selected images uploaded to Firebase Storage
- Metadata stored in media collection
- Images served to content via Firebase URLs
- Next.js Image Optimization
- Automatically fitted to closest standard ratio using `object-fit: cover`
- Display preferences stored in data attributes
- CSS-based transformations for performance
- No permanent image modifications
- Portrait images handled with:
  - Smart cropping
  - Blurred background
  Object position control
✅ 
- Local drive integration complete
- PhotoPicker UI implemented
- Firebase Storage integration
- Basic file upload/download
- Metadata tracking
- Images fetched and cached for fast display

⭕
1 - Rrationalize image strategy 
1 - Normalize images prior to upload
2 - Batch clean images from testing before production

❓
- Image import/processing happens on select.
  - Allows handling of select-save period.
  - Delete if not saved.
- Image deletion happens on-demand. 
- User selects, 
  - onAdd, 
  - import, 
    - error handle
  - process, 
    - create id & meta data
    - mark temporary,
  - send id and object to display,
  - OnSave,
    - update to doc to 'active'
  - OnRemove/OnCancel/OnDelete,
    - delete media doc/object
- Images sized on the fly.
- objectPosition saved by container
- How to best normalize images prior to upload.
- 

Where to place validation logic
Error handling strategy


Live text content needs to be preserved


Gallery needs explicit ordering for grid/horizontal scroll
Content images are positioned by their place in the text
Content captions are saved with field
Gallery captions are same as media object captions, but can be overridden and save in media
Content captions default to media object caption but be overridden and saved in card
Base caption stored with media object (potentially from file metadata later)
All captions are optional

Should only have two states: 'temporary' (selected but not saved) and 'active'
Images become 'active' when their parent card is saved
Object Position Needs to be context-specific
Gallery images
Cover image
Preview card (potentially different handling needed)
Doesn't apply to content images
Usage Tracking:
Need to track where images are used for safe deletion
Same image can be used in multiple cards
Same image shouldn't appear twice in same gallery

### **Storage**
-------------------------------------------------
Status: ✅ Implemented

✅
- Firebase Storage integration
- Efficient file organization
- Metadata management
- Access control
- Cache management
- Download URL generation
- Error handling

⭕
1 - Implement image optimization
2 - Add media to backup 

### **Normalization**
--------------------------------------------------
Status: ✅ Implemented

✅
- Sharp image processing pipeline
- Automatic resizing (thumb, medium, large)
- Format optimization (WebP)
- Metadata extraction
- Unique ID generation
- Error handling

⭕
1 - Implement advanced image processing
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

### **Photopicker**
--------------------------------------------------------------
Status: ✅ Implemented

✅
- Integrated media selection
- Multiple source support
- Tree-based navigation
- Single/multi-select modes
- Preview capabilities
- Drag and drop support
- Upload functionality
- Paste support

⭕

### **Local Drive** 
--------------------------------------------------------------
Status: ✅ Implemented

✅
- Local drive API integration
- Folder structure support
- File system navigation
- Metadata extraction
- Error handling
- Environment configuration

⭕
1 - Improve error handling
2 - Add file watching ??
2 - Implement cleanup jobs

### **OneDrive**
-------------------------------------------
Status: ⭕ Planned

✅
- Basic API integration
- Authentication flow
- Folder structure support

⭕
1 - Complete API integration
2 - Add sync functionality
2 - Implement backup strategy

### **Google Photos**
----------------------------------------------------
Status: ⭕ Planned

✅
- Authentication setup
- Basic API exploration

⭕
1 - Implement API integration
2 - Add album support


### **Apple Photos**
----------------------------------------------------
Status: ⭕ Planned

✅
- Initial research completed

⭕
1 - Research API limitations
2 - Plan integration strategy
2 - Evaluate feasibility


