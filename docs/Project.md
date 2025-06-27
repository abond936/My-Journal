# Project Overview

This project is a personal journaling application combining text and media in an immersive flexible and curated manner. 

The application is built around the concept of a 'card' containing a story, gallery, quote, or question--made up of text and media. A card is:

- standalone or nested, containing an array of children, acting as a container of other cards. 
- assigned dimensional and heirarchical tags for flexible filtering. 
- presented in various ways controlling its presentation and behavior:

The application opens with a home page with login.
Once in, the application has two primary functions:
- Content (`view/`)- The presentation and and filtering of cards for consumption.
- Administration (`admin`)- The creation, updating, deleting of cards, tags and other elements.

Access to both sections is controlled by authentication.

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

- This project adheres to a strict client-server, separation of concerns architecture

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
- A Node.js script (`src/lib/scripts/utils/backup-codebase.ts`) creates a compressed `.zip` archive of the entire codebase on OneDrive.
- Uses `git ls-files` to efficiently and accurately gather all project files, respecting `.gitignore`.
- A PowerShell script (`src/lib/scripts/utils/setup-backup-task.ps1`) creates a Windows Scheduled Task to run the backup script daily at 1 AM for local backups.
- A GitHub Actions workflow (`.github/workflows/backup.yml`) automatically creates a backup on every push to the `main` branch. This backup is stored as a workflow artifact for 7 days, providing an off-site copy.
- Automatically cleans up local backups older than 5 days.

### **Data Backup (Firestore)**
--------------------------------------
Status: ✅ Implemented

✅ 
- A Node.js script (`src/lib/scripts/backup-database.ts`) reads all documents from the `entries`, `albums`, `tags`, and `users` collections and saves them to a single, timestamped JSON file.
- A PowerShell script (`src/lib/scripts/setup-database-backup-task.ps1`) creates a Windows Scheduled Task to run the backup script daily at 2 AM.

⭕
2 - Update backup script

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
2 - Optimize collection structure ??

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
1 - Implement more granular field-level security
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
1 - Add more comprehensive error messages
2 - Implement custom validation rules

## **Content Consumption**
======================================
Page & Layout Structure
- src/app/layout.tsx - Root layout, applies global providers and theming.
- src/app/view/ - Public-facing content viewing.
layout.tsx: Layout for all view pages.
page.tsx - main content feed or landing page
### **Home Page**
---------------------------------
Status: - ✅ Implemented

✅
- Logo
- Cloud images
- Welcome message
- Login

⭕
2 - Remove left sidebar
2 - Add image(s) of me from various stages


### **Content Page**
---------------------------------
Status: ✅ Implemented
View - For all users (or public).
Focused on consuming content: viewing cards, galleries, and navigating via tags.
No editing or admin controls.
✅
- Responsive grid-based layout
- Dynamic card sizing
- Infinite scroll pagination
  - Uses IntersectionObserver to load more children as the user scrolls.
- Tag-based filtering
- Search functionality
- Optimized image loading
- Cached tag hierarchy

⭕
1 - Fix ghost layout issues
1 - Improve styling - card sizing 
2 - Implement advanced filtering
2 - Add sorting options

### **Card View**
---------------------------------
Status: ✅ Implemented
Viewing a Card (src/app/view/[id]/CardDetailPage.tsx)
Data: Receives a Card object (cardData).
Renders a single card in detail, including children, gallery, and content.
✅
- Title and subtitle render
- Cover image with optimization, if present rendered above content
- Content - If present, rich text content using TipTapRenderer.
- Gallery horizontal swipe support with Swiper
- Tag display and filtering
- Child card display
  - Uses CardProvider to fetch and render child cards (nested structure).
- Navigation between cards
- Three display modes
  - Inline - expands/collapses in place
  - Navigate - Links to dedicated card view page
  - Static - Display only

⭕
1 - Improve gallery navigation
1 - Add image captions
1 - Styling for card types
2 - Implement related content
2 - Add sharing functionality

### **User Interaction System**
---------------------------------
Status: ⭕ Planned - On hold

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
Status: 🟡 Operational

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

### **Card Management** 
---------------------------------
Status: ✅ Implemented

`card-admin/` - Card management (list, create, edit, bulk actions).

✅
- Comprehensive card list
- Infinite scroll pagination
- Advanced search functionality
- Type/status filtering
- Bulk operations
- Tag management
- Rich text editing
- Image integration
- Gallery support

⭕
1 - Improve bulk operations
2 - Add advanced filtering - other fields, displayMode
2 - Implement sorting options
2 - Test inline editing
2 - Fix statistics

### **Card Edit** 
---------------------------------
Status: ✅ Implemented
Creating/Editing a Card (src/app/admin/card-admin/[id]/CardAdminClientPage.tsx & CardForm.tsx)
. CardAdminClientPage (Top Level)
Current State:
Handles data fetching (card and tags)
Manages delete functionality
Wraps everything in CardFormProvider
Passes props: initialCard, allTags, onSave
Issues:
Passes same props to both CardFormProvider and CardForm (redundant)
Delete functionality could be moved to CardForm
No loading states for tag fetching
Needs:
Simplify prop passing
Better error handling
Clear separation of concerns

2. CardFormProvider (Context)
Current State:
Manages form state
Handles validation
Provides update methods
Uses a single tags array
Critical Issues:
Doesn't properly handle dimensional tags (who, what, when, where, reflection)
State structure doesn't match Card type
Validation doesn't check dimensional constraints
No type safety for tag dimensions
Needs:
Restructure state to match Card type
Add dimensional tag management
Improve validation
Add type safety

3. CardForm (Main Form)
Current State:
Renders form sections
Handles form submission
Manages child components
Passes props to tag selectors
Issues:
Inconsistent prop passing
Mixed responsibilities
No clear error boundary
Redundant state management
Needs:
Clear separation of form sections
Consistent prop passing
Better error handling
Remove redundant state

Card type has dimensional arrays
Form state has flat tag array
No validation of dimension consistency

Whether to use IDs or objects in state
Where to place validation logic
How to handle tag inheritance
Error handling strategy

MacroTagSelector (Tag Component)
Current State:
Tries to handle single dimension
Direct form state access
Mixed tag ID and object handling
Critical Issues:
Prop/state mismatch
Incorrect dimension handling
No type safety
Inconsistent data structure usage
Needs:
Complete rebuild of prop interface
Proper dimension handling
Type-safe implementation
Clear data flow
How to handle tag dimension synchronization

✅
- Card Provider to manage state
- Cover image management
- Content filed - Rich text editing, embedded images
Cover Image: 
- CoverPhotoContainer and PhotoPicker to select/upload an image.
- Stores reference, not the image.
- Fetches and caches media details for display.
- Tag assignment
- Gallery management
- Gallery:
  - Uses GalleryManager and PhotoPicker for multi-image selection.
  - Stores gallery as an array of media IDs.
- Child card linking
- Status control
- Validation
- Auto-save ??
- Error handling

⭕
1 - Fix coverImage
1 - Fix content
1 - Fix gallery
1 - Strategize children linking
2 - Deault excerpt to first x characters
2 - Batch upload gallery cards
    Normalize images 
2 - Implement templates

### **Tag System**
---------------------------------
Status: 🟡 Operational

`tag-admin/` - Tag management (hierarchy, drag-and-drop, editing).

Architecture:
Cards are assigned dimensional and heirarchical tags to facilitate flexible filtering.
- Dimensional tagging (who/what/when/where/reflection)
- Hierarchical organization within dimensions
- Denormalized storage for query performance
- Server-side expansion of tag lineage

Flow

Assignment - Tags are assigned multi-select on creation or edit of the card with`MacroTagselector`
Storage - Tags stored in card document as array, by dimension
Expansion - When a card is saved, the backend combines and deduplicates the tag lineage and stores it on the card document. 
Filtering - Filtering logic is executed on the server to avoid Firestore's query limitations.
Cache - Tag hierarchy UI display is sourced from a single cached JSON object in Firestore `cache/tagTree`, initiated once on startup and automatically updated by a serverless Cloud Function whenever a tag is changed to ensure fast-loading UI with minimal reads.

Data Models
- `Card.filterTags: Record<string, boolean>`
- An object (or map) on each `Card` document.
- Keys are the IDs of every tag associated with the card, including all of their ancestor tags (the "expanded" lineage).
- Values are always `true`.
- This denormalized structure is essential for the server-side filtering logic.

Group Tags by Dimension - The service receives tag IDs, fetches their definitions, and groups them by dimension (e.g., 'who', 'what').
Intra-Dimension "OR" Logic - For each dimension, it fetches all card IDs that match *any* of the selected tags in that group.
Inter-Dimension "AND" Logic - It then calculates the *intersection* of the results from each dimension to get the final list of card IDs that match all criteria.
Pagination - It paginates over this final list of IDs to return the requested page of cards.

**Tag Administration UI (`/admin/tag-admin`)**
Tag Administration (src/app/admin/tag-admin/page.tsx & TagTreeView)
Tag Model: id, name, dimension, parentId, order, path, etc.
UI Structure:
- Tags are displayed in a tree, grouped by dimension.
- Drag-and-drop to reorder (within a parent) or reparent (move to a new parent).
- Order is managed by a numeric order field, recalculated on move.
Maintenance & Reorganization
If the tag hierarchy is ever moved or deleted the maintenance process is efficient and contained:
- The `parentId` and `path` array of the moved tag are updated.
- A script updates the `path` array for all *descendant tags* of the moved tag.
- **No `card` documents need to be modified**, as their `_tag_lineage` is rebuilt on their next write. 

- Delete tags (with logic to handle children: promote or cascade delete).


The Tag Management page provides an administrative interface.
Purpose:
- Enable multi-faceted content organization
- Support flexible content discovery
- Allow both broad and specific filtering
- Maintain relationships between related content

✅
- Dimensional tag structure
- Hierarchical organization
- Tag inheritance
- Denormalized query optimization
- Bulk operations
- UI for management, optimistic
- Inline editing
- Add child tags with a + button.
- Drag-and-drop tree organization
- Tag backend service for all ops


⭕
1 - Optimize filtering performance
2 - Enhance tag management UI

❓
- How should tag inheritance affect filtering?
- Should certain dimensions have special behaviors?
- What are the performance limits of current denormalization?
- How to handle tag reorganization impact on content?

### **Tag Filtering**
---------------------------------
Status: 🟡 Operational

Navigation is facilitated by dimensional, heirarchical tag filtering. 

✅ 
- tag hierarchy display

⭕
Function
2 - include number of cards (x)

Styling
2 - increase indention
2 - slide in/out on mobile
2 - add multiple orderBy

### **Question Management**
---------------------------------
Status: ⭕ Planned - oh hold

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

Architecture:
The concept is that 
- Source images reside in various *external sources*
  - Current implementation sources from local drive (mirrored from OneDrive)
  - Future sources conceived of being OneDrive directly, Google Photos, and/or Apple Photos
- The app is to provide a *generic service layer* to all of these sources to:
  - Connect with these sources
  - Browse and select their content with PhotoPicker
  - Import the images, *sharp* process them, prepare *metadata* and store them in Firebase Storage
- Firebase Storage serves as delivery mechanism for app content *by ID*
  - Images are not stored in the cards.
- Media collection tracks metadata and relationships
- Optimize performance through caching and lazy loading.
Image Integration (src/components/admin/card-admin/CardForm.tsx, imageImportService.ts)
Flow:
1. User browses local files through PhotoPicker
2. Selected images uploaded to Firebase Storage
3. Metadata stored in media collection
4. Images served to content via Firebase URLs
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
1 - rationalize image strategy 
1 - Optimize image processing pipeline
1 - Normalize images prior to upload
2 - Complete OneDrive direct integration
2 - Batch clean images from testing before production

❓ 
- Should image import/processing happen on select or save? (select)
- Should image deletion happen on-demand or batch? (on-demand)
- User selects, onAdd, import/process, mark temporary send id and object.
  - OnSave, update to 'active'
  - OnRemove/OnCancel/OnDelete, delete media doc/object
- What image sizes should we generate for different use cases?
- How do we save position by container?
- How do we handle OneDrive sync conflicts?
- How to best normalize images prior to upload.
- What is best mechanism to handle/manage images between time selected and card is saved.
  - Upload to storage immediately and deal with removal if card not saved or image removed.
  - Manage image and potential loss before card is saved or image removed.


Media Object & ID Relationship:
For VIEWING: We store the ID in the card, fetch the object when needed
For EDITING/NEW: We need the object immediately for display after selection
The "awkward period" you mention is crucial - it's that state between selecting an image and saving the card
Content Media Evolution:
Started with storing full objects in content
Moved to just IDs
Current any[] is likely a transitional artifact
Live text content needs to be preserved
Images can be restructured if needed
Content images need captions but position comes from the HTML
Gallery vs Content Images:
Gallery needs explicit ordering for grid/horizontal scroll
Content images are positioned by their place in the text
Both need captions (gallery required, content optional)
Gallery captions are separate from media object captions
Content captions can default to media object caption but be overridden
  Key Requirements:
Captions:
Base caption stored with media object (potentially from file metadata later)
Content images: Context-specific caption stored in content, defaults to base caption
Gallery images: Uses base caption, can be overridden during gallery management
All captions are optional
Image States:
Should only have two states: 'temporary' (selected but not saved) and 'active'
'deleted' state can be removed since we delete in real-time
Images become 'active' when their parent card is saved
Object Position:
Needs to be context-specific
Applies to:
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
2 - Add backup strategy
2 - Implement cleanup jobs

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


graph TD
    subgraph App Root
        RootLayout[RootLayout]
        AuthProvider[AuthProvider]
        ThemeProvider[ThemeProvider]
        TagProvider[TagProvider]
        CardProvider[CardProvider]
        AppShell[AppShell]
    end

    subgraph Core Providers
        CardProvider --> CardContext[CardContext]
        TagProvider --> TagContext[TagContext]
        AuthProvider --> AuthContext[AuthContext]
    end

    subgraph Main Views
        ViewLayout[ViewLayout]
        AdminLayout[AdminLayout]
        SearchPage[SearchPage]
    end

    subgraph Card Components
        CardGrid[CardGrid]
        CardDetail[CardDetail]
        CardForm[CardForm]
    end

    subgraph Data Flow
        CardContext --> |Fetch Cards| API["/api/cards"]
        TagContext --> |Fetch Tags| TagAPI["/api/tags"]
        AuthContext --> |Auth| AuthAPI["/api/auth"]
    end

    RootLayout --> AuthProvider
    AuthProvider --> ThemeProvider
    ThemeProvider --> TagProvider
    TagProvider --> CardProvider
    CardProvider --> AppShell
    AppShell --> |Route| ViewLayout
    AppShell --> |Route| AdminLayout
    AppShell --> |Route| SearchPage

    ViewLayout --> CardGrid
    ViewLayout --> CardDetail
    AdminLayout --> CardForm

    style RootLayout fill:#f9f,stroke:#333,stroke-width:2px
    style CardProvider fill:#bbf,stroke:#333,stroke-width:2px
    style TagProvider fill:#bbf,stroke:#333,stroke-width:2px
    style AuthProvider fill:#bbf,stroke:#333,stroke-width:2px


Here's a detailed explanation of the current application architecture:
**Provider Layer
AuthProvider: Handles authentication state using NextAuth.js
TagProvider: Manages tag data and operations globally
CardProvider: Manages card data, filtering, and pagination
These providers are nested in the root layout for global state management
**Core Components
AppShell: Main layout wrapper providing navigation and structure
ViewLayout: Handles the main viewing experience
AdminLayout: Manages the admin interface
SearchPage: Handles search functionality
**Data Flow
Cards are fetched through the CardProvider using SWR
Tag data is managed globally through TagProvider
Authentication state is handled through AuthProvider
All data operations go through the /api routes
**Key Features
Infinite scrolling for card lists
Real-time filtering and search
Form state management for card editing
Image handling through Firebase Storage
**Recent Changes
CardProvider was moved to root layout for global state
Added form validation and error handling
Improved image processing pipeline
Enhanced tag filtering system