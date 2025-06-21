# Project Overview

## Context
This project is a personal journaling application that helps users document and share their illustrated 
life stories with others in an immersive flexible and curated manner.

## Scope
- Story creation, media integration and management
- Dimensional, heirarchical, tag-based organization
- Family sharing and interaction

## The `Card` Model
---------------------------------
Status: 🟡 Operational

To address the complexities of managing two separate content types (`entries` and `albums`) and to enable richer, more curated storytelling, a new unified `card` architecture has been designed and implemented parallel to the existing entry.album architecture until it is fully operational, at which time, the existing architecture can be removed. 

Core Concepts
The new architecture is built on the following principles:

**Unified Data Model** All content (story, gallery, quote, etc.), is a `Card`, simplifying data management, queries, and frontend logic.

**Hierarchical Structure** Cards can be standalone or nested, containing a `childrenIds` array, acting as a container of other cards, enabling the creation of curated experiences.

**Flexible Content Types** Each `Card` has a `type` property (e.g., `story`, `gallery`, `qa`, `quote`), dictating what data it contains and how the card is rendered, allowing for a wide variety of content presentations from a single data model.

**Defined Interaction Model** Each `Card` has a `displayMode` property controlling its presentation and behavior:
  - `navigate`: The card acts as a link, navigating the user to a new page that displays that card as parent collection (e.g., `/card/[id]/`).
  - `inline`: The card expands and collapses in place, functioning like an accordion to reveal its content directly within the current view.
  - `static`: The card is not interactive and serves only to display its content.

The new model utilizes a `card` concept, where both textual and media content can be contained in the same element, categorized by tag as the prior model, and presented as cards that can be nested as desired to accomplish various presentation styles.

Legend:
- ✅ Implemented
- 🟡 Operational
- ⭕ Planned
- ❓ Open Question

## **Technical Infrastructure**
=====================================

### **Technical Stack**
----------------------------------
Status: 🟡 Operational

- Frontend
  ✅ 
  - Next.js 15.3.2
  - React 19
  - TypeScript
  - Native CSS
  - TipTap for rich text editing
  - PhotoPicker for populating content and gallery
  - Framer Motion for animations
  - Next.js Image Optimizer
  - Drag n Drop

- Backend
  - Firebase (Firestore, Authentication, Storage)
  - Firebase Admin SDK for server-side operations

- Media: 
  - Local drive integration (current photo source)
  ⭕
  - OneDrive Integration (next photo source)
  - Google Photos API (future support)
  - Apple Photos API (future support)

- Development Tools:
  - Version Control: GitHub
  - ESLint for code quality
  - TypeScript for type safety
  - Jest/React for testing
  - Zod for data validation
  - Custom scripts for migration and backup
  ⭕
  - Hosting: Netlify (primary), with Vercel as backup
  - AI: OpenAI integration for content assistance

❓ 

### **Client-Server Architecture**
=======================================
Status: ✅ Implemented

- This project adheres to a strict client-server architecture
- No server-only code (like database credentials or Node.js modules) is ever exposed to the browser. 
- The data flow is designed to be secure and maintain a clear separation of concerns.
- The architecture follows a one-way data flow:
**Client Components & Hooks ➡️ Client-Side Services ➡️ Internal API Routes ➡️ Firebase**

#### Client-Side Services (`src/lib/services/`)
- **Role:** Lightweight, client-side modules responsible for communicating with the application's internal API.
- **Function:** They abstract the logic of making `fetch` requests to specific API endpoints (e.g., `/api/cards`). They handle formatting request parameters and parsing responses.
- **Constraints:**
  - **MUST** run only on the client.
  - **MUST NOT** import server-side packages like `firebase-admin` or Node.js modules (`fs`).
  - They are the designated way for client components to fetch or modify data.

#### API Routes (`src/app/api/`)
- **Role:** These are the server-side endpoints that contain the core business logic.
- **Function:** They are responsible for receiving requests from the client-side services, validating them, interacting with the database (Firestore), and performing any other server-side operations.
- **Constraints:**
  - **MUST** run only on the server.
  - This is the **ONLY** layer that can import and use the `firebase-admin` SDK.
  - They handle all direct database queries and mutations.

#### Client Components & Hooks (`src/components/`, `src/app/view/`, etc.)
- **Role:** These are the UI-facing parts of the application.
- **Function:** To get or modify data, they call functions from the client-side services in `src/lib/services`.
- **Constraints:**
  - **MUST NOT** call `fetch` directly.
  - **MUST NOT** contain any business logic for data manipulation.
  - **MUST** use the service layer (`src/lib/services/`) for all data operations.


### **Authentication**
=================================
Status: ✅ Implemented

**Strategy**
The application's authentication is managed by **`next-auth`** (Auth.js), which handles user sign-in and session management for the journal itself. This core identity is kept separate from connections to external services.

The security model is centralized in the Next.js backend, where all API routes are secured at the edge. This 
approach relies on two key authentication patterns:

**Primary Authentication:** (Implemented) This is the user's login to the application. It is 
handled by `next-auth` and the providers configured within it (e.g., Credentials-based login).

**Connected Accounts:** (Planned) For integrating with third-party photo services (like OneDrive or Google 
Photos), a separate OAuth 2.0 flow will be used. From a dedicated settings page, the logged-in admin will be able to authorize the application to access their photo libraries. The secure tokens from this OAuth flow will be stored and used by the backend to fetch media on the user's behalf.

#### AI Assistant & Developer Guide
To work with the authentication system, follow these patterns:

**Core Configuration:** The main `next-auth` configuration is located at `src/app/api/auth/[...nextauth]/route.ts`. This file defines the authentication providers (e.g., Credentials) and connects to the database via the `FirestoreAdapter`.

**Session Management (Client-Side):**
  - The application is wrapped in an `AuthProvider` located at `src/components/providers/AuthProvider.tsx`.
  - To access user session data in client components (e.g., to show a user's name), use the `useSession()` hook from `next-auth/react`.

**Securing API Routes (Server-Side):**
  - Add a security checka t the beginning of every server-side API route handler (`GET`, `POST`, etc.).
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

⭕
- Session analytics
- Security alerts for session activity
- UI for multi-device management


### **Role Management**
------------------------------------------
Status: ✅ Implemented

✅
- Basic Role Definition: Users have a `role` property in their session and database record (e.g., 'admin').
- API-Level Access Control: API routes enforce access control based on the user's role.

⭕
- Role hierarchy (e.g., editor, viewer)
- UI for role assignment and management by an admin.
- Granular, per-item permissions.


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

⭕


### **Data Backup (Firestore)**
--------------------------------------
Status: ✅ Implemented

✅ 
- A Node.js script (`src/lib/scripts/backup-database.ts`) reads all documents from the `entries`, `albums`, `tags`, and `users` collections and saves them to a single, timestamped JSON file.
- A PowerShell script (`src/lib/scripts/setup-database-backup-task.ps1`) creates a Windows Scheduled Task to run the backup script daily at 2 AM.

⭕
- Add  collections to the backup script as the application grows.

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
- Cards collection
- Entries collection
- Albums collection
- Tags collection

⭕
- User collection
- Media collection
- Questions

#### **Cost Management**
----------------------------------------
Status: ⭕ Planned

✅ 
- Some caching for cards/tags

⭕ 
- Cache strategy
  - CDN integration
  - Browser caching
  - Service worker caching
- Usage monitoring

❓ What opportunities are there for read savings?

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

⭕ 
- Advanced rules
- Rule templates
- Rule analytics
- Rule testing

❓ Is anything else required?

#### **Data Validation**
---------------------------------------------
Status: 🟡 Operational

✅ 
- input validation
- Data type checking
- Required field validation
- Format validation
- Zod added

⭕ 
- Assess app for further implementation
- Custom validators
- Validation rules
- Error handling
- Validation logging

❓ What else is required?

### **Card Architecture Migration Plan**
-------------------------------------------
Status: 🟡 Operational

✅
- New architecture skeleton in place

⭕
- Deprecate Old System - Remove legacy components, routes, and services


## **Content Consumption**
======================================

### **Home Page**
---------------------------------
Status: - ✅ Implemented

- Entry page to the app. 
- Includes welcome message and login.

✅
- Logo
- Cloud images
- Welcome message
- Login

⭕
- *Add image(s) of me from various stages*


### **Content Page** ❗
---------------------------------
Status: 🟡 Operational

The core function of the application is the presentation for consumption of textual and image content through a single portal. The vision is to make this best consumed on mobile and tablet devices in a grid-based card system with navigation through tag (and formerly type) filters, infinite scroll and related content links.

✅
- Grid-based layout connected to all content (cards)
- Infinite scroll

⭕
Function
- *Fix ghost layout*
- *Fix grid sizing*

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
- *Understand functionality*
- *Add Back button*
- *Add subtitle*
- *Add tags buttons*
- *Add gallery*
- *Add children*
- *Add 'related' content*

Styling
- Navigate page
- Inline page
- Static page - Quote
- Style gallery

❓ 

### **User Interaction System**
---------------------------------
- ⭕ Planned

⭕
- Add user interaction - Like, comment, sharelink

❓ 

### **Theme System**
---------------------------------
Status: 🟡 Operational

✅
- Light/Dark theme
- Fixed Schemes
- Limited styling throughout

⭕
- *Add MSN-style layout and theme*
- *Home*
- *Content page*
- *Cards by type*
- *Admin pages*
- *Make fully customizable - Add to Settings*

❓ Do we open users to Admin/Settings only

### **Navigation Systems**
=====================================

### **Top Navigation**
---------------------------------
Status: 🟡 Operational

Top navigation essentially toggles between content and admin for the administrator and defaults to content for a user. 

✅ 
- Logo
- Content - Available to users and admin
- Admin - Only available to administrator
- Theme toggle

⭕
- *Make Admin available to users for settings only*
- *Make logo svg and background transparent*
- *Remove 'lines'*
- *Make consistent throughout*

❓


### **Tag Filtering** ❗
---------------------------------
Status: 🟡 Operational

Navigation is facilitated by dimensional, heirarchical tag filtering. 

✅ 
- Tag hierarchy display

⭕
Function
- *Test filtering function.*
- *Include number of cards (x)*

Styling
- *Lessen indention*
- *Expand tree 1, 2, 3 levels?*
- *Slide in/out on mobile*
- *Add multiple orderBy*

### **Curated Navigaton**
---------------------------------
Status: ⭕ Planned

⭕
- *Create Table of Contents*
- *Tab Sidebar - TOC/TAG*

### **View Search**
---------------------------------
Status: ⭕ Planned

⭕
- *Add basic text search - top of content*


## **Content Administration**
=======================================
Status: 🟡 Operational

Administration is only available to author.
   - CRUD/Bulk editing operations for app elements

✅
- Navigation
- Card management
- Tags management
- Entries management
- Albums management

⭕ 
- Fix page scrolling under navigation bar
- Make card admin default
- Remove entries/albums
- Questions management
- Themes management
- Users management

### **Card Management** 
---------------------------------
Status: 🟡 Operational

✅
- Card list
- Load more
- Title search
- Type/Status filtering

⭕
1 Bulk Tag assignment
1 Inline editing
1 Bulk editing
2 Return to origin location
2 Fix statistics
2 Add displaymode to filter

### **Card New/Edit** ❗
---------------------------------
Stautus: 🟡 Operational

✅
- Cover image 
- Title, Subtitle, Excerpt
- Rich Text Editing
- Draft/Published states
- Macro Tag Assignment

⭕
Function
- *Cover pick/paste/drag*
- *Is cover photo a fixed size?*
- *Content pick/paste/drag*
- *Content image styling - Size/Align/Aspect/Caption*
- *Add gallery pick* 
- *Fix Search Children*
- *Default Excerpt to first x characters*
- batch upload gallery cards
- Sync with sources on our schedule
- *Add manage photos* - Add/Delete/Order/Orientation
- gallery captions

Styling
- *Move H1 and H2 to first buttons*
- *Make Remove button same as change*
- *Add more sizes*
- *Change Create Card to Save*
- *Move Content/Image menus to same line as Content label*

❓ Which image source do we implement with? (local/onedrive)

#### **Tag Management**
---------------------------------
Status: 🟡 Operational

Efficient querying and filtering

Write-Time Tag Expansion
When a card is saved or updated, the backend performs the following steps before writing to Firestore:
- Read Selected Tags
- Build Lineage 
- Combine & Deduplicate 
- Write to Card 

This ensures that queries for a parent tag will correctly match entries tagged with a child without complex, expensive query-time logic.

#### Client-Side Tag Tree Caching & UI

**The Tag Tree Cache**
To avoid reading the entire `tags` collection on every app load, the complete tag tree is stored in a single document (`/cache/tagTree`) in a pre-formatted JSON structure representing the entire tag hierarchy
- The client application reads this single document on startup to build the tag filtering UI. This is a single, cheap read operation.

**Automated Cache Updates**
A **Firebase Serverless Cloud Function** is triggered by any create, update, or delete operation on the `/tags/{tagId}` collection to automatically rebuild the `/cache/tagTree` document, ensuring the cache is always in sync with the source-of-truth `tags` collection. This automates cache maintenance and decouples the admin UI from the cache management logic.

**Debounced Filtering**
To prevent excessive reads from rapid-fire filter selections in the UI, filtering actions are "debounced." A query is only sent to Firestore after the user has paused their selections for a brief period (e.g., 400ms), bundling multiple filter changes into a single database query. (potentially require a click to accept filter)

#### Maintenance & Reorganization
If the tag hierarchy is ever moved or deleted the maintenance process is efficient and contained:
- The `parentId` and `path` array of the moved tag are updated.
- A script updates the `path` array for all *descendant tags* of the moved tag.
- **No `card` documents need to be modified**, as their `_tag_lineage` is rebuilt on their next write. 
- The Firebase Function will automatically update the UI cache.

The Tag Management page provides an administrative interface for organizing the hierarchical tag system used for content categorization.

✅
- tag collection
- type
- card assignment logic- hierarchical tree view
- inline name editing 
- drag-and-drop reordering 
- drag-and-drop reparenting
- add child cag button `+`
- tag deletion handling
  - promote children: The tag is deleted, and its direct children become children of the deleted tag's parent.
  - Cascade Delete: The tag and all of its descendant tags are deleted. Cards lose their tags

⭕
- *modify deletion strategy choice modal (replacing the browser prompt)*
- *A background task system for processing complex deletions to prevent UI freezes.*

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
- Selecting a question from list creates a card.
- Many questions are already part of stories
  - Create those stories in the db.
  - Mark as selected.
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

### **Image Strategy**
- Connect with external photo services to access existing photo collections
- Provide a consistent user experience across different photo sources
- Maintain metadata and relationships between photos and journal entries
- Optimize performance through caching and lazy loading
- Manage the storage, processing, and display of images efficiently


### **Core Data Models:** Gallery vs. Source Collection
To manage photos effectively through multiple external services, 
the system architecture is built around two distinct data models:

 **Gallery:** An gallery is a curated collection of images part of the journal itself. It is the primary way users will view grouped photos within the application. Each Gallery has its own metadata (title, caption, tags) and a specific list of photos selected by the author. Galleries are stored in the project's Firestore database and managed via the `/api/cards` endpoint.

**Source Collection:** A source collection is a grouping of photos from an external service. This could be a **folder** (from the local drive or OneDrive) or an album (from Google Photos or Apple Photos). Source Collections are used to populate the `PhotoPicker` component, allowing the author to browse and select images for inclusion in My Stories' cards. They are fetched via the `/api/photos/source-collections` {needs update} endpoint. This abstraction allows the UI to remain consistent while the backend handles the unique details of each photo service.

Key Design Principles:
- Abstracted Service Layer
  - A generic "photo service" interface to seemlessly support multiple image soources without changing UI components.
- Strict Client-Server Separation
  - Client components (e.g., `PhotoPicker`) make requests to internal API routes (e.g., `/api/photos/list`).
  - The server-side API route contains the logic to talk to the actual photo source, 
- Photos remain in their original source (OneDrive, etc.).
  - Firestore stores only metadata, references, thumbnails, not binary image data.  
- Optimize image processing
  - Caching serves frequently accessed content
  - Next.js Image Optimization serves efficient, web-friendly images.
- Aspect Ratio and sizing managed
  - Images are classified by natural dimensions (portrait/landscape/square)
  - Automatically fitted to closest standard ratio using `object-fit: cover`
  - No empty space or distortion allowed in layouts
  - Original image dimensions preserved
  - Display preferences stored in data attributes
  - CSS-based transformations for performance
  - No permanent image modifications
- Cover Images Managed
  - Default to landscape orientation for card headers
  - Portrait images handled with:
    - Smart cropping: AI-powered detection of important content areas to guide cropping
    - Blurred background: Portrait images displayed on blurred, stretched version of same image

### **Image Models**
`PhotoMetadata`- `/src/lib/types/photo.ts` The canonical data model stored in Firestore. It represents a specific photo that has been associated with a card and contains all necessary info for rendering and retrieval.
`TreeNode` - This is a UI-specific model used only by the `PhotoPicker` component. It represents a folder in a photo source (e.g., a directory on the local drive) and is used to build the navigable folder tree. It is not stored in the database.
- This separation ensures that the core application data (`PhotoMetadata`) is stable, while the UI components for browsing (`TreeNode`) can be adapted to different photo sources as needed.

### **Terminology**
- Source: The top-level service where the original media is stored.
- Asset: A single, unique media file (photo or video) within a Source.
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
- photo metadata management
- image optimization implemented

⭕

❓ 
- Do we use local, onedrive or google for live system.
- What other image handling do we need?

### **Storage**
-------------------------------------------------
Status: 🟡 Operational

Storage Strategy:
- Originals stay in source services
- Only store thumbnails, previews, metadata in Firestore

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

### **Photopicker**
--------------------------------------------------------------
Status: 🟡 Operational

Photopicker for selecting and assigning photos to cover, content, galleries.

✅
- photopicker integratedwith legacy entries 
- collapsible/expandable tree structure
- single-select/multi-select dependent on route

⭕
- migrate capability to card-new/edit


### **Local Drive** 
--------------------------------------------------------------
Status: 🟡 Operational

Use local drive until operational functionality solid, then link to online sources.

✅
- Local drive API 
- env.local contains the ONEDRIVE_ROOT_FOLDER variable, the absolute path to the root directory where all local photos are stored.

⭕
- Limit integration due to limitations
- Standardize code/naming on standards
   
❓ 

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
