# MyJournal Project

## Table of Contents
[Project Overview](#project-overview)
 - [Context](#context)
 - [Scope](#scope)
 - [Technical Stack](#technical-stack)
 - [Operational Summary](#operational-summary)

[Content Consumption](#content-consumption)
 - [Home Page](#home-page)
 - [Layout](#layout)
   - [Content View](#content-view)   
   - [Entry View](#entry-view)
   - [Album View](#album-view)
   - [Theme System](#theme-system)
 - [Navigation Systems](#navigation-systems)
   - [Top Navigation](#top-navigation)
   - [Tag Filtering](#tag-filtering)
   - [Type Filtering](#type-filtering)
   - [Search](#search)

[Content Administration](#content-administration)
 - [Admin Navigation](#admin-navigation)
 - [Entry Management](#entry-management)
 - [Album Management](#album-management)
 - [Tag Management](#tag-management)
 - [Question Management](#question-management)
 - [Style Management](#style-management)   
 - [Theme Management](#theme-management)     

[Technical Infrastructure](#technical-infrastructure)
 - [Technical Stack](#technical-stack)
 - [Client-Server Architecture](#client-server-architecture)
 - [Database](#database)
   - [Firestore Structure](#firestore-structure)
   - [Security Rules](#security-rules)
   - [Data Validation](#data-validation)
 - [Image Integration](#image-integration)
   - [Image Strategy](#image-strategy)
   - [Storage Strategy](#storage-strategy)
   - [PhotoPicker](#photo-picker)
   - [Local Drive](#local-drive)   
   - [OneDrive](#onedrive)
   - [Google Photos](#google-photos)
   - [Apple Photos](#apple-photos)     
 - [Authentication](#authentication)
   - [Firebase Auth](#firebase-auth)
   - [Session Mangement](#session-management)
   - [Role Management](#role-management)
 - [Backup System](#backup-system)
   - [Automatic Backups](#automatic-backups)
   - [Manual Backups](#manual-backups)
   - [Recovery](#recovery)

## Project Overview

### Context
This project is a personal journaling application that helps users document and share their illustrated life stories with others in an immersive flexible and curated manner.

### Scope
- Story creation, media integration and management
- Tag-based organization
- Family sharing and interaction


## Revised Architecture: The `Card` Model
---------------------------------
Status: 🟡 Operational

To address the complexities of managing two separate content types (`entries` and `albums`) and to enable richer, more curated storytelling, a new unified `card` architecture has been designed and implemented completely parallel to the existing architecture until it is fully operational, at which time, the existing architecture can be removed. 

### Core Concepts
The new architecture is built on the following principles:

- **Unified Data Model:** All content (story, gallery, quote, etc.), is a `Card`, simplifying data management, queries, and frontend logic.

- **Hierarchical Structure:** Cards can be nested, containing a `childrenIds` array, acting as a container other cards. This enables the creation of curated experiences.

- **Flexible Content Types:** Each `Card` has a `type` property (e.g., `story`, `gallery`, `qa`, `quote`), dictating how the card is rendered and what data it contains, allowing for a wide variety of content presentations from a single data model.

- **Defined Interaction Model:** Each `Card` has a `displayMode` property controlling its behavior:
  - `navigate`: The card acts as a link, navigating the user to a new page that displays that card as parent collection (e.g., `/card/[id]/`).
  - `inline`: The card expands and collapses in place, functioning like an accordion to reveal its content directly within the current view.
  - `static`: The card is not interactive and serves only to display its content.

#### Elements
Formerly, the primary elements of the app were Entries and Albums categorized by hierarchical Tags.
- An entry was primarily text, but included media
  - Cover image, Title, Rich Text w/ embeded images
- An album was primarily media, but included text
  - Cover image, Title, Caption, Collection of media

- Entries and Albumes could be linked and were categorized by Tags on 5 dimensions:
  - who, what, when, where, and reflection
- Content was presented as cards in a grid for consumption

The new model utilizes a `card` concept, were both textual and media content can be contained in the same element,
categorized by tag as the prior model, and presented as cards that can be nested as desired to accomplish various 
presentation styles.

Legend:
- ✅ Implemented
- 🟡 Operational
- ⭕ Planned
- ❓ Open Question

## Card Architecture Migration Plan
---------------------------------
Status: 🟡 In Progress

### **Phase 1: Admin Foundation**
---------------------------------
Status: 🟡 Operational

This phase focused on creating the basic structure for card administration and the ability to view, create, and update cards. The work leverages existing components from the legacy admin system to accelerate development.

- ✅ **Create Admin Route & List View:** Duplicated `entry-admin` to create `card-admin`, displaying a list of all cards.
- ✅ **Implement Create/Update Form (`CardForm`):** Built a comprehensive form for managing all core `Card` properties.
- ✅ **Implement Child Card Management:** Created a `ChildCardManager` to handle the hierarchical relationships between cards.
- ✅ **Implement Gallery Management:** Created a `GalleryManager` to manage image collections within `gallery` type cards.

### **Phase 2: Admin Workflow & Experience**
---------------------------------
Status: 🟡 Operational

This phase focuses on replicating and improving the core administrative workflows.

- ✅ **Stabilization & Hardening:** Audited and secured all `Card` API endpoints and improved server-side validation.
- ✅ **Refactor Floating Action Button (FAB):** Created a dedicated `CardAdminFAB` for the new admin section.
- ✅ **Implement "Delete" Functionality:** Added delete capabilities with a safeguard to prevent accidental deletion of nested cards.
- ✅ **Implement Bulk Tag Editing:** Add the ability to add/remove tags from multiple selected cards at once.
- ✅ **Implement "View as User" Link:** Ensure the "View" link in the admin list points to the card's public consumption page.

### **Phase 3: Consumption Experience**
---------------------------------
Status: 🟡 Operational

This is the most critical upcoming phase, focused on building the public-facing, non-admin user experience for consuming `Card` content. This will replace the legacy `/view` page.

1.  **Build a Dynamic `CardProvider`:**
    -   **Task:** Create a `CardProvider` modeled directly after the existing `ContentProvider`.
    -   **Details:** This provider will be the heart of the new consumption experience. It will use `useSWRInfinite` to fetch `cards` from a new `/api/cards` endpoint, manage pagination for infinite scroll, and handle dynamic filtering by tags, type, status, etc. This is the key to replicating the legacy system's dynamic feel.

2.  **Enhance the `/api/cards` Endpoint:**
    -   **Task:** Ensure the main `/api/cards` endpoint is robust and can handle all necessary query parameters for filtering and pagination (`limit`, `lastDocId`, `tags`, `q`, `status`).

3.  **Build the Main Card Feed Page:**
    -   **Task:** Create a new primary consumption page (e.g., at `/cards` or by replacing `/view`).
    -   **Details:** This page will use the new `CardProvider` to display a filterable, infinitely-scrolling grid of all published `Card`s, directly replacing the functionality of the old `/view` page.

4.  **Build the Individual Card View Page:**
    -   **Task:** Create the page for viewing a single `Card` and its content (e.g., `/cards/[id]`).
    -   **Details:** This page will serve as the destination when a user clicks on a `navigate` type card, displaying its title, content, and any nested children cards.

### **Phase 4: Migration & Finalization**
---------------------------------
Status: 🟡 Operational

Once the new `Card` admin and consumption views are fully tested and approved, the final steps can be taken.

- ✅ **Write Migration Script:** Create a one-time script that reads all documents from the `entries` and `albums` collections and converts them into new documents in the `cards` collection.
- ✅ **Verify Migration:** Manually review the migrated data to ensure integrity.
- ⭕ **Deprecate Old System:** Once the migration is successful, the old admin routes, services, and view pages can be safely removed from the codebase, completing the transition.


## Content Consumption
=========================

### **Home Page**
---------------------------------
Status: - ✅ Implemented

#### Current
- Images
- Welcome message
- Login

#### Next
- Add images

❓ Open Questions:

### **Layout**
---------------------------------
Status: 🟡 Operational

The core function of the application is the presentation for consumption of textual and image content.
The vision is to make this best consumed on mobile and tablet devices in a grid-based card system with 
navigation through tag (and formerly type) filters, infinite scroll and related content links.

#### Current
- Content layout connected to all content.
- Tag- and Content-type navigation
- Infinite scroll
- Album image scroll

#### Next
Function
- *Add Related content*
- *Add Order options*
- *Modify content-type navigation*
Styling 
- Multi-sized cards - Card height and width ratios of each other to facilitate grid structure
- Varying styling - Titles, Tags, Excerpts overlaid/non-overlaid
- Card animation - image motion, gifs, videos

- Multi-type cards - story, gallery, quote, qa,
   - gallery - x/y, Horizontal Scroll, Click to Google-like gallery, Click to Carosel, back
   - Related list??

❓ Open Questions:
- How to include 'related' content?

### **Card View**
---------------------------------
Status: 🟡 Operational

#### Current 
- Title
- Cover image
- Content
- Gallery
- Tags
- Children

#### Next
Function
- *Add 'related' content*


Styling
- *Emulate edit page for Story*
- Vary page by Type - Story, Reflection, Q&A, Quote
- Vary by orientation - Landscape, Portrait
- Style back button

❓ Open Questions:



### **Entry View** - On hold
---------------------------------
Status: 🟡 Operational

Entry view contains title, cover image, tags, content.

#### Current 
- Title
- Cover image
- Content
- Tags
- Back button

#### Next
Function
- *Add album links*
- *Add 'related' content*


Styling
- *Emulate edit page for Story*
- Vary page by Type - Story, Reflection, Q&A, Callout, Quote
- Vary by orientation - Landscape, Portrait
- Style back button

❓ Open Questions:


### **Album View** - On hold
---------------------------------
Status: 🟡 Operational-barely

Album view contains a title, tags, caption and grid display of images.

#### Current
- Shell

#### Next
- *Design Page* title, caption, gallery
- *Photo grid display*
- *Add entry links*
- *Add Selectable style*
- *Add Photo Carosel*
- Toggle caption display (mobile/tap, other/click)
- Toggle fill mode (fill/contain)
- Add user interaction - Like, comment, share

❓ Open Questions:

#### **User Interaction System**
---------------------------------
- ⭕ Planned

##### Current


##### Next
- Add user interaction - Like, comment, sharelink

❓ Open Questions:


#### **Theme System**
---------------------------------
Status: 🟡 Operational

##### Current Features
- Light/Dark theme
- Fixed Schemes
- Limited styling throughout

##### Planned Features
- *Add MSN-style layout and theme*
- *Home*
- *Content page*
- *Cards by type*
- *Admin pages*
- Make fully customizable - Add to Settings

❓ Open Questions:


### Navigation Systems
=================================

### **Top Navigation**
---------------------------------
Status: 🟡 Operational

#### Current
- Logo
- Theme toggle
- Content/Admin
- Customize by user role.

#### Next
Function


Styling
- *Improve logo*

❓Open Questions:


### **Tag Filtering**
---------------------------------
Status: 🟡 Operational
Navigation is facilitated by heirarchical tag filtering. 

#### Current 
- Tag hierarchy display
- Multi-select filtering
- Tag dimension organization
- Tag relationship visualization
- Number of entries (x/y)

#### Next
Function
- *Revisit tag system overall*
- *Fix ordering of tags/tree.*
- Include number of entries/albums (x/y)


Styling


❓ Open Questions:
- How do we want the sidebar to operate?
   - Slide in/out on mobile?
- Multi-orderby?

### **Type Filtering**
---------------------------------
Status: 🟡 Operational

Content type based filter is a selector of Entries, Albums or Both (and type) to display in the card grid.

#### Current 
- All, Entries, Albums

#### Next
Function
- *Fix Functioning*
- *Reduce to card types--story, reflection, qa, quote

Styling
- Style type menu

❓Open Questions:
- How do we order cards?

### **Curated Navigaton**
---------------------------------
Status: ⭕ Planned

#### Current
- none

#### Next
- *Create Table of Contents*
- *Tab Sidebar - TOC/TAG)*

### **Search**
---------------------------------
Status: ⭕ Planned

#### Current
- none

#### Next
- *Add basic text search - top of content*

❓ Open Questions:

## **Content Administration**
=======================================
Status: 🟡 Operational

Administration is a feature only available to author.
   - CRUD/Bulk editing operations for app elements

#### Current 
- Card management
- Entries management
- Albums management
- Tags management

#### Next
- Questions management
- Themes management
- Users management

  ❓ Open Questions:

### **Admin Navigation**
---------------------------------
Status: 🟡 Operational

Topbar to navigate between element lists.

#### Current
- In place

#### Next
Function
- none

Styling 
- Title

❓ Open Questions:

### **Card Management** 
---------------------------------
Status: 🟡 Operational

#### Current 
- List
- Statistics
- Search and filtering
- Bulk editing

#### Next
Function
- *Inline/Bulk Tag assignment*
- *Inline editing*

Styling

❓ Open Questions:

### **Card New**
---------------------------------
Stautus: 🟡 Operational

#### Current
- Cover image 
- Title
- Rich Text Editing
- Image embedding
- Draft/Published states
- Tag Assignment
- Gallery
- Childre

#### Next
Function

Styling

❓ Open Questions:

### **Card Edit**
---------------------------------
Status: 🟡 Operational

#### Current 
- Cover Image
- Title
- Rich Text Editing
- Image embedding
  - Photo Picker, pasted, or dragged.
- Image formatting 
   - Size, alignment
- Tag Assigment

#### Next
Function
- *Fix aspect ratio control*
- *Fix caption*
- *Test Paste*
- *Test Drag*
- *Remove first 'cover photo' label*
- *Move cover photo to above title*
- *Move tags to under title*
- *Move type, status and Visibility to under tags*
- *Make 'update' only if changed.*
- *Add 'Preview' for modal button.*
- *Move H1 and H2 to first buttons*
- *Make Remove button same as change*
- *Change Tags to tree selects*
- *Add more sizes*
- *Is cover photo a fixed size?*
- *Make same changes to NEW*

Styling

❓ Open Questions:


### **Entry Management** - on hold
---------------------------------
Status: 🟡 Operational

#### Current 
- Data model - story, reflection, qa, callout, quote
- Entry collection
- Entry listing
- Statistics
- Search and filtering
- Inline editing
- Bulk editing

#### Next
Function
- *Inline/Bulk Tag assignment*
- *List more per page?*
- *Make inline edits without save/cancel*
- Batch upload tags
- Reassess data model

Styling

❓ Open Questions:


### **Entry New** - on hold
---------------------------------
Stautus: 🟡 Operational

#### Current
- Cover image - Metadata stored coverPhoto field
- Title
- Rich Text Editing
- Image embedding - Embedded figure/image element
- Draft/Published states
- Tag Assignment

#### Next
Function
- *Does not seem to have editor?*


Styling

❓ Open Questions:

### **Entry Edit** - on hold
---------------------------------
Status: 🟡 Operational

#### Current 
- Cover Image - Metadata stored coverPhoto field
- Title
- Rich Text Editing
- Image embedding
  - Photo Picker, pasted, or dragged.
- Image formatting 
   - Size, alignment
- Tag Assigment

#### Next
Function
- *Fix aspect ratio control*
- *Fix caption*
- *Test Paste*
- *Test Drag *
- *Remove first 'cover photo' label*
- *Move cover photo to above title*
- *Move tags to under title*
- *Move type, status and Visibility to under tags*
- *Make 'update' only if changed.*
- *Add 'Preview' for modal button.*
- *Move H1 and H2 to first buttons*
- *Make Remove button same as change*
- *Change Tags to tree selects*
- *Add more sizes*
- *Is cover photo a fixed size?*
- *Make same changes to NEW*

Styling

❓ Open Questions:

### **Album Management** - on hold
---------------------------------
Status: 🟡 Operational

An album is a virtual collection of images from one or more sources.

#### Current 
- Data model
  - coverPhoto, title, description, caption, tags, photos
- Album collection
- Album listing
- Album creation
- Search and filter
- Inline/Bulk edit
- Photopicker
- Local photo service

#### Next
Function
- Batch upload of photos to albums.
- Sync with sources on our schedule

Styling


❓Open Questions:
- How to handle single photos?
  - Miscellaneous/Other Album?

### **Album New and Edit** - on hold
---------------------------------
Status: 🟡 Operational

#### Current 
- New album button/page
- Edit album button/page
- Cover image
- Add photos - Photopicker

#### Next
Function
- *Add tag assignment*
- *Add manage photos* - Add/Delete/Order/Orientation
- *Link to entries*
- Paginated or scrollable. 
- Captions togglable - Click/hover
- Select Style

Styling
- Scrapbook


❓ Open Questions:
- How do we want this page to operate?
  - Edit Fields
  - Select Style
  - Manage photos
- How will masonry work/look?

#### **Tag Management**
---------------------------------
Status: 🟡 Operational

### Tag System Architecture
The tag system is designed to be highly efficient for querying and filtering, trading a small amount of complexity on writes and maintenance for significant speed and cost savings on reads.

#### 1. Data Models

**a) `tags` collection (`/tags/{tagId}`)**
This is the authoritative source of truth for all tags. Each document represents a single tag.
- **`name`**: (string) The display name of the tag.
- **`parentId`**: (string) The ID of the parent tag, forming the hierarchy. Null for top-level tags.
- **`path`**: (array of strings) An ordered array of parent IDs, representing the full lineage of the tag (e.g., `['tag_who', 'tag_family']`). This is a denormalized field used for efficient lineage generation.

**b) `entries` collection (`/entries/{entryId}`)**
Each entry stores two fields for tag management.
- **`tags`**: (array of strings) The "source of truth" array containing only the tag IDs directly selected by the user in the UI.
- **`_tag_lineage`**: (array of strings) A denormalized and comprehensive array containing the IDs from the `tags` field *plus* the `path` and ID from every selected tag. This field is used for all filtering queries. The `_` prefix denotes it as a derived, internal field.

#### 2. Write-Time Tag Expansion
When a card (n entry) is saved or updated, the backend performs the following steps before writing to Firestore:
1.  **Read Selected Tags:** For each `tagId` in the entry's `tags` array, it reads the corresponding document from the `tags` collection.
2.  **Build Lineage:** It aggregates the `path` array and the `tagId` from each tag document read.
3.  **Combine & Deduplicate:** It combines all lineage arrays into a single `_tag_lineage` array and removes duplicates.
4.  **Write to Entry:** It saves both the original `tags` array and the final `_tag_lineage` array to the entry document.

This ensures that queries for a parent tag will correctly match entries tagged with a child without complex, expensive query-time logic.

#### 3. Client-Side Tag Tree Caching & UI

**a) The Tag Tree Cache**
To avoid reading the entire `tags` collection on every app load, the complete tag tree is stored in a single document (`/cache/tagTree`).
- The client application reads this single document on startup to build the tag filtering UI. This is a single, cheap read operation.
- This document's content is a pre-formatted JSON structure representing the entire tag hierarchy.

**b) Automated Cache Updates**
A **Firebase Cloud Function** is triggered by any create, update, or delete operation on the `/tags/{tagId}` collection.
- This serverless function automatically rebuilds the `/cache/tagTree` document, ensuring the cache is always in sync with the source-of-truth `tags` collection.
- This automates cache maintenance and decouples the admin UI from the cache management logic.

**c) Debounced Filtering**
To prevent excessive reads from rapid-fire filter selections in the UI, filtering actions are "debounced." A query is only sent to Firestore after the user has paused their selections for a brief period (e.g., 400ms), bundling multiple filter changes into a single database query. (potentially require a click to accept filter)

#### 4. Maintenance & Reorganization
If the tag hierarchy is ever changed (e.g., a tag is moved to a new parent), the maintenance process is efficient and contained:
1. The `parentId` and `path` array of the moved tag are updated.
2. A script updates the `path` array for all *descendant tags* of the moved tag.
3. **No `card` documents need to be modified**, as their `_tag_lineage` is rebuilt on their next write. The Firebase Function will automatically update the UI cache.

The Tag Management page provides an administrative interface for organizing the hierarchical tag system used for content categorization.

#### Current
- Hierarchical Tree View: Tags are displayed in a collapsible tree structure that reflects their parent-child relationships and sort order.
- Inline Name Editing: Tag names can be edited directly in the list by clicking on the name. Changes are saved automatically.
- Drag-and-Drop Reordering: Tags are reordered within the same parent by dragging and dropping between its siblings.
- Drag-and-Drop Reparenting: Tags are reparented by dragging them onto a new parent tag.
- Add Child Tag: New tags are added as children to any existing tag using the `+` button on each row.
- Tag Deletion: Tags are deleted using the "Delete" button. The user is prompted to choose a deletion strategy:
  - Promote Children: The tag is deleted, and its direct children become children of the deleted tag's parent.
  - Cascade Delete: The tag and all of its descendant tags are deleted. Cards lose their tags

#### Next
- *Revisit entire tag implementation*
- A more robust user interface for the deletion strategy choice (replacing the browser prompt).
- Full implementation of the drag-and-drop reordering and reparenting logic to persist changes to the database.
- A background task system for processing complex deletions to prevent UI freezes.

### **Question Management**
---------------------------------
Status: ⭕ Planned

- Questions are prompts for stories

#### Current 
- None

#### Next
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

❓ Open Questions
- Do we want to track questions answered?
- Do we group short questions?

### **Gallery Style Management**
---------------------------------
Status: ⭕ Planned

Album styles are selectable styles for album pages

#### Current 
- None

#### Next
- Preconfigured album and entry (by type) page styles for selection
- Preconfigured
  - Background, Font, Color scheme, etc.
- Custom - 

❓ Open Questions:
- What are the variables that need to be included/decided?

### **Theme Management**
----------------------------------
Status: ⭕ Planned

Themes customizable.

#### Current 
- Light/Dark

#### Next
- UI management

❓ Open Questions:
- What are the variables that need to be included/decided?


## **Technical Infrastructure**
=====================================

### **Technical Stack**
----------------------------------
Status: 🟡 Operational

#### Current 
- Frontend
  - Next.js 15.3.2
  - React 19
  - TypeScript
  - Native CSS
  - TipTap for rich text editing
  - PhotoPicker for populating content and gallery
  - Framer Motion for animations
  - Next.js Image Optimizer

- Backend
- Firebase (Firestore, Authentication, Storage)
- Firebase Admin SDK for server-side operations

- Media: 
  - Local drive integration (current photo source)
  - OneDrive Integration (next photo source)
  - Google Photos API (future support)
  - Apple Photos API (future support)
- Hosting: Netlify (primary), with Vercel as backup
- Version Control: GitHub
- Testing: Jest, React Testing Library
- Development Tools:
  - ESLint for code quality
  - TypeScript for type safety
  - Jest for testing
  - Custom scripts for migration and backup
- AI: OpenAI integration for content assistance
❓ Open Questions:

# **Client-Server Architecture**
=======================================
Status: ✅ Implemented
This project adheres to a strict client-server architecture, ensuring that no server-only code (like database credentials or Node.js modules) is ever exposed to the browser. The data flow is designed to be secure and maintain a clear separation of concerns.

The architecture follows a one-way data flow:
**Client Components & Hooks ➡️ Client-Side Services ➡️ Internal API Routes ➡️ Firebase**

### 1. Client-Side Services (`src/lib/services/`)
- **Role:** These are lightweight, client-side modules responsible for communicating with the application's internal API.
- **Function:** They abstract the logic of making `fetch` requests to specific API endpoints (e.g., `/api/entries`, `/api/albums`). They handle formatting request parameters and parsing responses.
- **Constraints:**
  - **MUST** run only on the client.
  - **MUST NOT** import server-side packages like `firebase-admin` or Node.js modules (`fs`).
  - They are the designated way for client components to fetch or modify data.

### 2. API Routes (`src/app/api/`)
- **Role:** These are the server-side endpoints that contain the core business logic.
- **Function:** They are responsible for receiving requests from the client-side services, validating them, interacting with the database (Firestore), and performing any other server-side operations.
- **Constraints:**
  - **MUST** run only on the server.
  - This is the **ONLY** layer that can import and use the `firebase-admin` SDK.
  - They handle all direct database queries and mutations.

### 3. Client Components & Hooks (`src/components/`, `src/app/view/`, etc.)
- **Role:** These are the UI-facing parts of the application.
- **Function:** To get or modify data, they call functions from the client-side services in `src/lib/services`.
- **Constraints:**
  - **MUST NOT** call `fetch` directly.
  - **MUST NOT** contain any business logic for data manipulation.
  - **MUST** use the service layer (`src/lib/services/`) for all data operations.


### **Authentication**
=================================
Status: ✅ Implemented

#### Overall Strategy
The application's authentication is managed by **`next-auth`** (Auth.js), which handles user sign-in and session 
management for the journal itself. This core identity is kept separate from connections to external services.

The security model is centralized in the Next.js backend, where all API routes are secured at the edge. This 
approach relies on two key authentication patterns:

1.  **Primary Authentication (Implemented):** This is the user's login to the MyJournal application. It is 
handled by `next-auth` and the providers configured within it (e.g., Credentials-based login).

2.  **Connected Accounts (Planned):** For integrating with third-party photo services (like OneDrive or Google 
Photos), a separate OAuth 2.0 flow will be used. From a dedicated settings page, the logged-in admin will be able 
to authorize the application to access their photo libraries. The secure tokens from this OAuth flow will be stored 
and used by the backend to fetch media on the user's behalf.

#### AI Assistant & Developer Guide
To work with the authentication system, follow these patterns:

- **Core Configuration:** The main `next-auth` configuration is located at `src/app/api/auth/[...nextauth]/route.ts`. This file defines the authentication providers (e.g., Credentials) and connects to the database via the `FirestoreAdapter`.

- **Session Management (Client-Side):**
  - The application is wrapped in an `AuthProvider` located at `src/components/providers/AuthProvider.tsx`.
  - To access user session data in client components (e.g., to show a user's name), use the `useSession()` hook from `next-auth/react`.

- **Securing API Routes (Server-Side):**
  - At the beginning of every server-side API route handler (`GET`, `POST`, etc.), you **MUST** add a security check.
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

- **User Model:** User data (including a `role` field) is automatically managed by the `@auth/firebase-adapter` and stored in the `users` collection in Firestore.

- **Environment Variables:** Credentials for local development are stored in `.env.local`. This file is not committed to version control.

#### **Firebase Auth**
--------------------------------------
Status: ✅ Implemented

##### Current Features
- Credential-Based Login: Secure sign-in using email and password.
- `next-auth` Integration: Uses `next-auth` as the primary authentication handler, not Firebase's client-side SDK for auth.
- Firestore Adapter: User and session data is stored in Firestore via `@auth/firebase-adapter`.

##### Planned Features
- Social auth providers (e.g., Google)
- Passwordless login (e.g., email links)
- Account management features (e.g., password change)

❓ Open Questions:

#### **Session Management**
---------------------------------------
Status: ✅ Implemented

##### Current Features
- Session Provider: `AuthProvider` provides session state to the entire application.
- Session Persistence: User sessions are securely persisted in a browser cookie.
- Session State Access: `useSession` hook for client components.
- Server-Side Session Validation: `getServerSession` for securing API routes.
- Token Handling: JWT-based session strategy handled automatically by `next-auth`.

##### Planned Features
- Session analytics
- Security alerts for session activity
- UI for multi-device management

❓ Open Questions:

#### **Role Management**
------------------------------------------
Status: ✅ Implemented

##### Current Features
- Basic Role Definition: Users have a `role` property in their session and database record (e.g., 'admin').
- API-Level Access Control: API routes enforce access control based on the user's role.

##### Planned Features
- Role hierarchy (e.g., editor, viewer)
- UI for role assignment and management by an admin.
- Granular, per-item permissions.

❓ Open Questions:


### **Backup System**
======================================
The backup strategy is divided into two distinct areas: Codebase Backup and Data Backup.

#### **Codebase Backup**
--------------------------------------
Status: ✅ Implemented

##### Current Features
- A Node.js script (`src/lib/scripts/utils/backup-codebase.ts`) creates a compressed `.zip` archive of the entire codebase.
- Uses `git ls-files` to efficiently and accurately gather all project files, respecting `.gitignore`.
- A PowerShell script (`src/lib/scripts/utils/setup-backup-task.ps1`) creates a Windows Scheduled Task to run the backup script daily at 1 AM for local backups.
- A GitHub Actions workflow (`.github/workflows/backup.yml`) automatically creates a backup on every push to the `main` branch. This backup is stored as a workflow artifact for 7 days, providing an off-site copy.
- Automatically cleans up local backups older than 5 days.

##### Planned Features
- Integrate with cloud storage for off-site backups.

#### **Data Backup (Firestore)**
--------------------------------------
Status: ✅ Implemented

##### Current Features
- A Node.js script (`src/lib/scripts/backup-database.ts`) reads all documents from the `entries`, `albums`, `tags`, and `users` collections and saves them to a single, timestamped JSON file.
- A PowerShell script (`src/lib/scripts/setup-database-backup-task.ps1`) creates a Windows Scheduled Task to run the backup script daily at 2 AM.

##### Planned Features
- Add more collections to the backup script as the application grows.

#### **Recovery**
---------------------------------------
Status: ✅ Implemented

This section outlines the procedures for recovering from a critical failure.

##### Codebase Recovery
This is a manual process:
1.  Locate the latest codebase backup file (e.g., `backup-....zip`) in the backup directory.
2.  Unzip the file. This will restore the complete project structure.
3.  Open a terminal in the restored project directory and run `npm install` to reinstall all dependencies.

##### Database Recovery
This is a deliberate, interactive process using the `restore-database.ts` script.
1.  Identify the JSON backup file you wish to restore (e.g., `firestore-backup-....json`).
2.  Run the restore script from the terminal, passing the full path to the backup file as an argument. Example:
    ```bash
    npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/restore-database.ts "C:\\Path\\To\\Your\\Backup\\file.json"
    ```
3.  The script will display the collections and document counts from the backup file and ask for confirmation.
4.  To proceed, you must type `restore` and press Enter. Any other input will cancel the operation.
5.  The script will then overwrite the existing database collections with the data from the backup file.

### **Database**
=======================================

#### **Firestore Structure**
---------------------------------------
Status: ✅ Implemented

##### Current Features
- Entry collection
- Album collection
- Tag collection

##### Planned Features
- User collection
- Media collection

#### **Cost Management**
----------------------------------------
Status: ⭕ Planned

##### Current Features
- Some caching

##### Planned Features
- Cache strategy
  - CDN integration
  - Browser caching
  - Service worker caching
- Usage monitoring

❓ Open Questions:
- Review this...

#### **Security Rules**
-----------------------------------------
Status: ✅ Implemented

##### Current Features
- Data access rules
- Role-based rules
- Time-based rules
- IP-based rules
- Rate limiting
- Security logging

##### Planned Features
- Advanced rules
- Rule templates
- Rule analytics
- Rule testing

❓ Open Questions:
- Are these required anymore since changing client/server architecture?

#### **Data Validation**
---------------------------------------------
Status: 🟡 Operational

##### Current 
- Input validation
- Data type checking
- Required field validation
- Format validation
- Zod added

##### Planned Features
- App-wide zod implementation
- Custom validators
- Validation rules
- Error handling
- Validation logging

❓ Open Questions:


### **IMAGE INTEGRATION**
=======================================
Status: 🟡 Operational

#### **Image Strategy**
The Image Integration system serves as the bridge between the journal and external photo services, 
enabling users to seamlessly incorporate their existing photo collections into their journal entries. 

The system is designed to:

1. Connect with external photo services (Google Photos, OneDrive) to access existing photo collections
2. Manage the storage, processing, and display of images efficiently
3. Maintain metadata and relationships between photos and journal entries
4. Optimize performance through caching and lazy loading
5. Provide a consistent user experience across different photo sources

### Core Data Models: Album vs. Source Collection
To manage photos effectively and support multiple external services, 
the system architecture is built around two distinct data models:

 **Album:** An album is a curated collection of images part of the journal itself. It is the primary way users will view grouped photos within the application. Each Album has its own metadata (title, caption, tags) and a specific list of photos selected by the author. Albums are stored in the project's Firestore database and managed via the `/api/albums` endpoint.

**Source Collection:** A source collection is a grouping of photos from an external service. This could be a **folder** (from the local drive or OneDrive) or an album (from Google Photos or Apple Photos). Source Collections are used to populate the `PhotoPicker` component, allowing the author to browse and select images for inclusion in My Stories' albums. They are fetched via the `/api/photos/source-collections` endpoint. This abstraction allows the UI to remain consistent while the backend handles the unique details of each photo service.

Key Design Principles:
- Abstracted Service Layer
  - A generic "photo service" interface to source images.
  - Support for multiple photo sources with a unified interface
   -Local, OneDrive, Google Photos without changing UI components.
- Strict Client-Server Separation
  - Client components (e.g., `PhotoPicker`) are for UI only.
  - They make requests to internal API routes (e.g., `/api/photos/list`).
  - The server-side API route contains the logic to talk to the actual photo source, preventing leaking keys or using server-only modules (`fs`) on the client.
- Photos remain in their original source (OneDrive, etc.).
  - Firestore stores only metadata, references, thumbnails, not binary image data.  
- Optimize image processing
  - Caching serves frequently accessed content
  - Next.js Image Optimization serves efficient, web-friendly images.
Aspect Ratio and sizing managed
- Images are classified by natural dimensions (portrait/landscape/square)
- Automatically fitted to closest standard ratio using `object-fit: cover`
- No empty space or distortion allowed in layouts
- Original image dimensions preserved
- Display preferences stored in data attributes
- CSS-based transformations for performance
- No permanent image modifications
- Cover Images (Entry/Album) Managed
  - Default to landscape orientation for cards and entry headers
  - Portrait images handled with:
    - Smart cropping: AI-powered detection of important content areas to guide cropping
    - Blurred background: Portrait images displayed on blurred, stretched version of same image


### Clarification on Image Models
The term `AlbumPhotoMetadata` is a remnant from a previous design. The current, correct implementation uses two distinct models for clear separation of concerns:
- **`PhotoMetadata`**: This is the canonical data model stored in Firestore. It represents a specific photo that has been associated with an Entry or Album and contains all necessary info for rendering and retrieval.
- **`TreeNode`**: This is a UI-specific model used only by the `PhotoPicker` component. It represents a folder in a photo source (e.g., a directory on the local drive) and is used to build the navigable folder tree. It is not stored in the database.

This separation ensures that the core application data (`PhotoMetadata`) is stable, while the UI components for browsing (`TreeNode`) can be adapted to different photo sources as needed.

Core Concepts & Terminology
- Source: The top-level service where the original media is stored.
- Asset: A single, unique media file (photo or video) within a Source.
- Collection: A logical grouping of Assets within a Source.
- Navigation:A specific method or strategy for browsing the Assets within a Source.
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

Coverphoto - We store a reference to a canonical photo object - PhotoMetadata Object

The PhotoMetadata type (defined in /src/lib/types/photo.ts) is the standard structure for all photo references. A key property within this object is path, which contains the necessary information to locate the original image file.

Local - .env.local contains the ONEDRIVE_ROOT_FOLDER variable, the absolute path to the root directory where all photos are stored.

Server-side route /api/images/local/file serves these images. 
- Accepts a path query parameter from the PhotoMetadata object0.
- Joins this relative path with the ONEDRIVE_ROOT_FOLDER to get the full, secure file path on the server.
- Reads the image file from the disk.
- Returns the image data with the correct Content-Type.

Client-Side Rendering via getDisplayUrl
- getDisplayUrl(photo: PhotoMetadata) in /src/lib/utils/photoUtils.ts.
Rule: Any client-side component that needs to display an image must use this function. Components should never attempt to construct an image URL themselves or use the path property directly. They pass the entire PhotoMetadata object to this function to get a usable URL.

##### Current 
- Service layer in place
- PhotoPicker integrated
- Photo metadata management
- Image optimization implemented

##### Next
- Image optimization enhanced
- Thumbnail generation ?
- Format conversion ?
- Metadata extraction ?

❓ Open Questions
- Do we use local, onedrive or google for live system.

#### **Storage Strategy**
-------------------------------------------------
Status: 🟡 Operational

Storage Strategy:
- Originals stay in source services
- Only store thumbnails, previews, metadata in Firestore

##### Current
- Firebase Storage integration
- Basic file upload
- Download URL generation
- File organization structure
- Basic error handling

##### Next
- Storage optimization
  - Image compression
  - Format optimization
  - Lazy loading

❓ Open Questions:
- Which source should be used for implementation?
- Is link vs store strategy inherently weak/slow?

### **Photopicker**
--------------------------------------------------------------
Status: 🟡 Operational

Photopicker for selecting and assigning photos to entries and albums.

#### Current
- Photopicker integrated (Entry- New/Edit, Album-New/)
- Collapsible/Expandable Tree structure
- singleSelect/multiSelect dependent on route

#### Next
- Integrate with Card-Edit

  ❓ Open Questions:


#### **Local Drive** 
--------------------------------------------------------------
Status: 🟡 Operational

Use local drive until operational functionality solid, then link to online sources.

##### Current Features
- Local drive API 
- Root directory C:/users/alanb/onedrive/pictures
- Deeply nested subdirectories
- Subdirectory structure for photopicker
- Navigation of directories to images

##### Planned Features
- Limit integration due to limitations
- Standardize code/naming on standards
   
❓ Open Questions:

#### **OneDrive**
-------------------------------------------
Status: ⭕ Planned

##### Current
- Some basic elements for early experimentation - not operational
  - Local config file for album mappings
  - Basic folder structure integration
  - Album path configuration
  - Basic API integration

##### Next
- Proper file system access

❓ Open Questions:


#### **Google Photos**
----------------------------------------------------
Status: ⭕ Planned

##### Current
- None

##### Next
- Integration API

❓ Open Questions:


#### **Apple Photos**
----------------------------------------------------
Status: ⭕ Planned

##### Current
- None

##### Next
- Integration API

❓ Open Questions:

