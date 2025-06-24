# Project Overview

This project is a personal journaling application that helps users document, illustrate and share their life stories with others in an immersive flexible and curated manner.

Card - A card is a piece of content--a story, gallery, quote, question--a combination of text and media.
Hierarchy - Cards can be standalone or nested, containing a `childrenIds` array, acting as a container of other cards.
Tags - A card is tagged with dimensional and heirarchicall tags for flexible filtering.
Display - Each `Card` `type` can be presented in various ways (`displayMode`) property controlling its presentation and behavior:
  - `navigate`: The card acts as a link, navigating the user to a new page that displays that card as parent collection (e.g., `/card/[id]/`).
  - `inline`: The card expands and collapses in place, functioning like an accordion to reveal its content directly within the current view.
  - `static`: The card is not interactive and serves only to display its content.


Legend:
- ✅ Implemented
- 🟡 Operational
- ⭕ Planned
- ❓ Open Question

## **Technical Infrastructure**
=====================================

- This project adheres to a strict client-server, separation of concerns architecture

### **Technical Stack**
----------------------------------
Status: ✅ Implemented

- Frontend
  ✅ 
  - Next.js 15.3.2
  - React 19
  - TypeScript
  - Native CSS
  - TipTap rich text editing
  - PhotoPicker for populating media
  - Framer Motion for animations
  - Next.js Image Optimizer
  - DragnDrop

- Backend
  - Auth.js
  - Firebase (Firestore, Authentication, Storage)
  - Firebase Admin SDK for server-side operations
  - Zod

- Media: 
  - Local drive integration (current photo source)

- Development Tools:
  - Version Control: GitHub
  - ESLint for code quality
  - TypeScript for type safety
  - Jest/React for testing
  - Zod for data validation
  - Custom scripts for migration and backup

  ⭕
  - Hosting: Netlify (primary), with Vercel as backup
  - OneDrive Integration (next photo source)
  - Google Photos API (future support)
  - Apple Photos API (future support)

### **Authentication**
=================================
Status: ✅ Implemented

Strategy
- Auth.js handles user sign-in and session management for the app.
- All API routes are secured at the edge. 

✅
- User login to the application.

⭕
- Connected Accounts
  - third-party photo services (like OneDrive or Google Photos)
  - separate OAuth 2.0 flow will be used
  - dedicated settings page
  - secure tokens authorize the backend to fetch media on the user's behalf.

**Core Configuration:** 
`src/app/api/auth/[...nextauth]/route.ts` defines the authentication providers (e.g., Credentials) and connects to the database via the `FirestoreAdapter`.

**Session Management (Client-Side):**
- The application is wrapped in an `AuthProvider` located at `src/components/providers/AuthProvider.tsx`.
- To access user session data in client components use the `useSession()` hook from `next-auth/react`.

**Securing API Routes (Server-Side):**
- Add a security checks to the beginning of every server-side API route handler (`GET`, `POST`, etc.).
- Use `const session = await getServerSession(authOptions);` to retrieve the current session.
- **For read-only routes (e.g., GET):** Check if the session exists.
    ```typescript
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    ```
  - **For modification routes (e.g., POST, PUT, DELETE):** Check for an admin role.
    ```typescript
    if (!session || session.user.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }
    ```

**User Model:** User data (including a `role` field) is automatically managed by the `@auth/firebase-adapter` and stored in the `users` collection in Firestore.

**Environment Variables:** Credentials for local development are stored in `.env.local`not committed to version control.

### **Firebase Auth**
--------------------------------------
Status: ✅ Implemented

✅
- credential-based Login: Secure sign-in using email and password.
- `next-auth` as the primary authentication handler, not Firebase's client-side SDK for auth.
- Firestore Adapter: User and session data is stored in Firestore via `@auth/firebase-adapter`.

⭕
- Social auth providers (e.g., Google)
- Passwordless login (e.g., email links)
- Account management features (e.g., password change)


### **Session Management**
---------------------------------------
Status: ✅ Implemented

✅
- Session Provider: `AuthProvider` provides session state to the entire application.
- Session Persistence: User sessions are securely persisted in a browser cookie.
- Session State Access: `useSession` hook for client components.
- Server-Side Session Validation: `getServerSession` for securing API routes.
- Token Handling: JWT-based session strategy handled automatically by `next-auth`.


### **Role Management**
------------------------------------------
Status: ✅ Implemented

✅
- Basic Role Definition: Users have a `role` property in their session and database record (e.g., 'admin').
- API-Level Access Control: API routes enforce access control based on the user's role.

⭕
- Role hierarchy (e.g., editor, viewer)
- UI for role assignment and management by an admin.

### **Backup System**
======================================
The backup strategy is divided into two distinct areas: 

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
- Update backup script

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
- cards collection
- entries collection
- albums collection
- tags collection

⭕
- remove entries/albums collections
- add user collection
- add media collection
- add questions collection

#### **Cost Management**
----------------------------------------
Status: ✅ Implemented

✅ 
- Some caching for cards/tags

❓ What opportunities are there for cost savings?

#### **Security Rules**
-----------------------------------------
Status: ✅ Implemented

✅ 
- Data access rules
- Role-based rules
- Time-based rules
- IP-based rules
- Rate limiting
- Security logging

❓ Is anything else required?

#### **Data Validation**
---------------------------------------------
Status: 🟡 Operational

✅ 
- input validation
- data type checking
- required field validation
- format validation
- Zod

❓ What additional data validation is required?

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
- Add image(s) of me from various stages


### **Content Page** ❗
---------------------------------
Status: 🟡 Operational

The core function of the application is the presentation for consumption of textual and image content through a single portal. The vision is to make this best consumed on mobile and tablet devices in a grid-based card system with navigation through tag filters, infinite scroll and related content links.

✅
- Grid-based layout connected to all content (cards)
- Infinite scroll

⭕
Function
- Fix ghost layout
- Fix grid sizing

Styling 
- Multi-sized cards - Card height and width ratios of each other to facilitate grid structure
- Varying styling - Titles, Tags, Excerpts overlaid/non-overlaid
- Card animation - image motion, gifs, videos

❓ How to include 'related' content?

### **Card View** ❗
---------------------------------
Status: 🟡 Operational

✅
- Title
- Cover image
- Content
- Gallery
- Tags
- Children

⭕
Function
* Navigate page
- understand functionality
- add Back button
- add subtitle
- add tags buttons
- add gallery
- add children
- add 'related' content

Styling
- navigate page
- inline page
- static page - quote
- style gallery

❓ 

### **User Interaction System**
---------------------------------
- ⭕ Planned

⭕
- add user interaction - Like, comment, sharelink

❓ 

### **Theme System**
---------------------------------
Status: 🟡 Operational

✅
- light/dark theme
- fixed schemes
- limited styling throughout

⭕
- add MSN-style layout and theme
- home
- content page
- cards by type
- aAdmin pages
- make fully customizable - add to Settings

❓ do we open users to Admin for settings only?

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
- make aAdmin available to users for settings only
- make logo svg and background transparent
- remove 'lines'
- make consistent throughout

### **Curated Navigaton**
---------------------------------
Status: ⭕ Planned

⭕
- create table of contents
- create tabbed sidebar - toc/tag

### **View Search**
---------------------------------
Status: ⭕ Planned

⭕
- add basic title search - top of content
- add subtitle, status, content


## **Content Administration**
=======================================
Status: 🟡 Operational

Administration is only available to author.
   - CRUD/Bulk editing operations for app elements

✅
- navigation
- card management
- tag management

⭕ 
- fix page scrolling under navigation bar
- add questions management
- add themes management
- add users management

### **Card Management** 
---------------------------------
Status: 🟡 Operational

✅
- card list
- load more pagination
- title search
- type/status filtering

⭕
1 bulk tag assignment
1 inline editing
1 bulk editing
2 return to origin location
2 fix statistics
2 add displaymode to filter

### **Card New/Edit** ❗
---------------------------------
Stautus: 🟡 Operational

✅
- cover image - pick/paste/drag
- title, subtitle, excerpt
- rich text editing
- draft/published status
- macro tag assignment

⭕
Function

- content pick/paste/drag
- content image styling - size/align/aspect/caption
- add gallery pick
- fix search children
- default excerpt to first x characters
- batch upload gallery cards
- add manage photos - add/delete/order/orientation
- gallery captions

Styling
- move H1 and H2 to first buttons
- make remove button same as change
- add more sizes
- change create card to save
- move content/image menus to same line as content label

❓ is cover photo a fixed size?

### **Tag System**
---------------------------------
Status: 🟡 Operational

Cards are assigned dimensional and heirarchical tags to facilitate flexible filtering.

- Assignment - Tags are assigned multi-select on creation or edit of the card `MacroTagSelector`.
- Expansion - When a card is saved, the backendcalculates (combines and deduplicates) the full tag lineage (all parents) and stores it on the card document to facilitate queries. 
- Filtering - Filtering logic is executed on the server to avoid Firestore's query limitations.(`getCards`) (`src/lib/services/cardService.ts`)
- Cache - Tag hierarchy UI display is sourced from a single cached JSON object in Firestore `cache/tagTree`, initiated once on startup and automatically updated by a serverless Cloud Function whenever a tag is changed to ensure fast-loading UI with minimal reads.

Data Models
`Card.filterTags: Record<string, boolean>`
- An object (or map) on each `Card` document.
- Keys are the IDs of every tag associated with the card, including all of their ancestor tags (the "expanded" lineage).
- Values are always `true`.
- This denormalized structure is essential for the server-side filtering logic.

Group Tags by Dimension - The service receives tag IDs, fetches their definitions, and groups them by dimension (e.g., 'who', 'what').
Intra-Dimension "OR" Logic - For each dimension, it fetches all card IDs that match *any* of the selected tags in that group.
Inter-Dimension "AND" Logic - It then calculates the *intersection* of the results from each dimension to get the final list of card IDs that match all criteria.
Pagination - It paginates over this final list of IDs to return the requested page of cards.

**Tag Administration UI (`/admin/tag-admin`)**

Maintenance & Reorganization
If the tag hierarchy is ever moved or deleted the maintenance process is efficient and contained:
- The `parentId` and `path` array of the moved tag are updated.
- A script updates the `path` array for all *descendant tags* of the moved tag.
- **No `card` documents need to be modified**, as their `_tag_lineage` is rebuilt on their next write. 

The Tag Management page provides an administrative interface.

✅
- tag collection
- type
- inline name editing 
- drag-and-drop reordering 
- drag-and-drop reparenting
- add child tag button `+`
- tag deletion handling
  - promote children: The tag is deleted, and its direct children become children of the deleted tag's parent.
  - Cascade Delete: The tag and all of its descendant tags are deleted. Cards lose their tags

⭕
- modify deletion strategy choice modal (replacing the browser prompt)
- add background task system for processing complex deletions to prevent UI freezes.

### **Tag Filtering** ❗
---------------------------------
Status: 🟡 Operational

Navigation is facilitated by dimensional, heirarchical tag filtering. 

✅ 
- tag hierarchy display

⭕
Function
- test filtering function.
- include number of cards (x)

Styling
- increase indention
- slide in/out on mobile
- add multiple orderBy

### **Question Management**
---------------------------------
Status: ⭕ Planned

Questions are prompts for stories.

✅
- None

⭕
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
Status: ⭕ Planned

Gallery styles are selectable styles for gallery cards

✅
- None

⭕
- Preconfigured card styles for selection
- Custom card styles for selection

❓ Open Questions:
- What are the variables that need to be included/decided on gallery styling

### **Theme Management**
----------------------------------
Status: ⭕ Planned

Themes customizable.

✅
- Light/Dark toggle

⭕
- UI management

❓ - What are the variables that need to be included/decided?

### **IMAGE INTEGRATION**
=======================================
Status: 🟡 Operational

Image Strategy
- Connect with external image sources via generic service layer
- Provide a consistent user experience across different photo sources
- Maintain metadata and relationships between photos and cards
- Optimize performance through caching and lazy loading
- Manage the storage, processing, and display of images efficiently


`PhotoPicker` accesses source collections to browse and select images. 


- Store optimized images, metadata, references, thumbnails
- Optimize image processing
- Next.js Image Optimization
- Aspect Ratio and sizing managed
  - Images are classified by natural dimensions (portrait/landscape/square)
  - Automatically fitted to closest standard ratio using `object-fit: cover`
  - No empty space or distortion
  - Display preferences stored in data attributes
  - CSS-based transformations for performance
  - No permanent image modifications
- Cover Images
  - Default to landscape orientation for card headers
  - Portrait images handled with:
    - Smart cropping: AI-powered detection of important content areas to guide cropping
    - Blurred background: Portrait images displayed on blurred, stretched version of same image

`PhotoMetadata`- `/src/lib/types/photo.ts` The canonical data model stored in Firestore. It represents a specific photo that has been associated with a card and contains all necessary info for rendering and retrieval.
`TreeNode` - This is a UI-specific model used only by the `PhotoPicker` component. It represents a folder in a photo source and is used to build the navigable folder tree. 
- This separation ensures that the core application data (`PhotoMetadata`) is stable, while the UI components for browsing (`TreeNode`) can be adapted to different photo sources as needed.

**Terminology**
- Source: The top-level service where the original media is stored.
- Asset: A single, unique media file (photo or video) within a source.
- Collection: A logical grouping of Assets within a Source.
- Navigation: A specific method or strategy for browsing the Assets within a Source.
  - Folder tree, Collections, Date 

API Architecture Summary
- Adapt to source
- Discover Navigation Methods
- Endpoint: GET /api/images/{source}/navigation
- Endpoint: GET /api/images/{source}/browse/{mode}
- Endpoint: GET /api/images/{source}/collections/{collectionId}
- Endpoint: GET /api/images/{source}/assets/{assetId}
- Endpoint: GET /api/images/{source}/search?query=...

  └── [source]                  // Dynamic route for the Source (e.g., 'local', 'google-photos')
      ├── assets
      │   └── [assetId]         // Dynamic route for a single Asset ID
      │       └── route.ts      // Handles GET for a single asset
      │
      ├── browse
      │   └── [mode]            // Dynamic route for the Navigation Mode
      │       └── route.ts      // Handles GET for browsing (e.g., the folder tree)
      │
      ├── collections
      │   └── [collectionId]    // Dynamic route for a single Collection ID
      │       └── route.ts      // Handles GET for a collection's contents
      │
      ├── search
      │   └── route.ts          // Handles GET for free-form search queries
      │
      └── navigation
          └── route.ts          // Handles GET to discover navigation modes for the source

- Coverphoto - We store a reference to a canonical photo object - PhotoMetadata Object

Server-side route `/api/images/local/file` serves these images. 
- Accepts a path query parameter from the PhotoMetadata object0.
- Joins this relative path with the ONEDRIVE_ROOT_FOLDER to get the full, secure file path on the server.
- Reads the image file from the disk.
- Returns the image data with the correct Content-Type.

Client-Side Rendering via getDisplayUrl
- getDisplayUrl(photo: PhotoMetadata) in `/src/lib/utils/photoUtils.ts`.
Rule: Any client-side component that needs to display an image must use this function. Components should never attempt to construct an image URL themselves or use the path property directly. They pass the entire PhotoMetadata object to this function to get a usable URL.

✅
- service layer in place
- photopicker integrated
- photo metadata managed
- image optimization implemented

⭕

❓ What is the best thing to do with images.


### **Image Service Abstraction**
-------------------------------------------------
Status: 🟡 Operational

✅
- service layer in place for local

⭕
- build out service suite


### **Storage**
-------------------------------------------------
Status: 🟡 Operational

Storage Strategy:
- Originals stay in source services
- Store optimized versions, thumbnails, previews, metadata in Firestore

✅
- firebase storage integration
- basic file upload
- download URL generation
- file organization structure
- basic error handling

⭕
- Storage optimization
  - Image compression
  - Format optimization
  - Lazy loading

❓ 
- Is link vs store strategy inherently weak/slow?
- What image storage issues need to be addressed?

### **Normalization**
--------------------------------------------------
Status:  ⭕Planned

⭕
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

### **Photopicker**
--------------------------------------------------------------
Status: 🟡 Operational

Photopicker for selecting and assigning photos to cover, content, galleries.

✅
- photopicker integrated  
- collapsible/expandable tree structure
- single-select/multi-select dependent on route

⭕


### **Local Drive** 
--------------------------------------------------------------
Status: 🟡 Operational

Use local drive until operational functionality solid, then link to online sources.

✅
- Local drive API 
- env.local contains the ONEDRIVE_ROOT_FOLDER variable, the absolute path to the root directory where all local photos are stored.

⭕
 

### **OneDrive**
-------------------------------------------
Status: ⭕ Planned

✅
- Some basic elements for early experimentation - not operational
  - Local config file for album mappings
  - Basic folder structure integration
  - Album path configuration
  - Basic API integration

⭕
- Proper file system access

❓ 

### **Google Photos**
----------------------------------------------------
Status: ⭕ Planned

✅
- None

⭕
- Integration API

❓ 


### **Apple Photos**
----------------------------------------------------
Status: ⭕ Planned

✅
- None

⭕
- Integration API

❓ 

