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
This project is a personal journaling application that helps users document and share their life stories, 
reflections, photos, and media with others.

### Scope
- Story and reflection creation and management
- Photo and media integration
- Tag-based organization
- Family sharing and interaction
- AI-assisted content creation and organization

### Operational Summary
The application integrates stories with one's digital photo stores for exploration 
in an immersive flexible or curated manner.

#### Elements
The primary elements of the app are Entries and Albums categorized by hierarchical Tags.
- An entry is a primarily textual, but includes media
  - Cover image
  - Title
  - Rich Text and embeded images.
- An album is a primarily visual, but includes text
  - Cover image
  - Title
  - Caption
  - Collection of media
- Entries can be linked to albums and albums can be linked to entries
- Both Entries and Albums are categorized by Tags on 5 dimensions:
  - who, what, when, where, and reflection
    - (may need to revisit the reflection dimension)
- Content is presented as cards in a grid for consumption

Legend:
- ✅ Implemented
- 🟡 Operational
- ⭕ Planned
- ❓ Open Question

## Content Consumption
=========================

### **Home Page**
---------------------------------
Status: - ✅ Implemented

#### Current Features
- Images
- Welcome message
- Login

#### Planned Features


❓ Open Questions:

### **Layout**
---------------------------------
Status: 🟡 Operational

The core function of the application is the presentation for consumption of content--entries and albums.
The vision is to make this best consumed on mobile and tablet devices i a grid-based card system with 
navigation through tag and type filters, infinite scroll and related content links.

#### Current Features
- Content layout connected to all content.
- Tag and Content type navigation
- Infinite scroll
- Album image scroll

#### Planned Features
Function
- *Related content*
- *Order options*
Styling 
- Multi-sized cards
  - Card height and width ratios of each other to facilitate grid structure
- Varying styling
  - Titles, Tags, Excerpts overlaid/non-overlaid
- Card animation - image motion, gifs, videos

- Card Types
   - Entry - Click to page, click back
     - Story - 
     - Reflection
     - Q&A
     - Callout
     - Quote
   - Album - x/y, Horizontal Scroll, Click to Google-like gallery, Click to Carosel, back
   - Related


❓ Open Questions:
- How to include 'related' content?


### **Entry View**
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
- Add user interaction - Like, comment, sharelink

Styling
- *Emulate edit page for Story*
- Vary page by Type - Story, Reflection, Q&A, Callout, Quote
- Vary by orientation - Landscape, Portrait
- Style back button

❓ Open Questions:


### **Album View**
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


#### **Theme System**
---------------------------------
Status: 🟡 Operational

##### Current Features
- Light/Dark theme
- Fixed Schemes
- Limited styling throughout

##### Planned Features
- *Add MSN-style layout and theme*
- Make fully customizable - Add to Settings

❓ Open Questions:


### Navigation Systems
=================================

### **Top Navigation**
---------------------------------
Status: 🟡 Operational

#### Current Features
- Logo
- Theme toggle
- Content/Admin

#### Planned Features
Function
- Customize by user role.

Styling



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
- *Fix ordering of tags/tree.*
- Include number of entries/albums (x/y)
- Fix code to update count

Styling
- Left arrow

❓ Open Questions:
- Is there a way to navigate by Entry or Album?
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
- Add submenu for entry types--story, reflection, qa, callout, quote

Styling
- Style type menu

❓Open Questions:
- How would we order Entries and Albums?
  - Would we do it by tag selection? 
  - Order by Tag, show Albums then Entries?
  - Order by Tag, show Entries, by Albums?
  - One complicated nested tree structure?
    - Possible/Advisable?

### **Search**
---------------------------------
Status: ⭕ Planned

#### Current
- none

#### Next
- *Add Basic text search - Top of content*

❓ Open Questions:

## **Content Administration**
=======================================
Status: 🟡 Operational

Administration is a feature only available to author.
   - CRUD/Bulk editing operations for app elements

#### Current 
- Entries management
- Albums management
- Tags management

#### Next
- *The New Entry/New Album popups don;t hide after selection.*
- Questions management
- Album page styles management
- Themes management
- Users management

  ❓ Open Questions:

### **Admin Navigation**
---------------------------------
Status: 🟡 Operational

Sidebar to navigate between element lists.

#### Current
- Static Sidebar
- Basic navigation

#### Next
Function

Styling 
- Title

❓ Open Questions:

### **Entry Management**
---------------------------------
Status: 🟡 Operational

#### Current 
- Data model
  - story, reflection, qa, callout, quote
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


### **Entry New**
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

### **Entry Edit**
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

### **Album Management**
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
- *Fix no albums listed*
- Batch upload of photos to albums.
- Sync with sources on our schedule

Styling


❓Open Questions:
- How to handle single photos?
  - Miscellaneous/Other Album?

### **Album New and Edit**
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

Tags are managed (added, edited, deleted) from the admin page.
No need for separate pages

#### Current 
- Tag collection
- Tag listing
- Tag hierarchy management
- Tag ordering
- Tag relationships
- Tag cleanup
- Bulk edit
- Search and filter

#### Next
Function
- *Fix Drag and drop hierarchy*
- *Determine tag deletion/merging functionality*
- Add cover image/icon
- Remove 'show tag structure'
- Make stats same as others

Styling


❓ Open Questions
- How to deal with edited/deleted tags?
   - Edited - warning - heirarchy staying the same, unless edited.
   - Deleted - warning - Deleting this tag will remove this and all children tags from all entries and albums.
- Feed tags back to photo metadata?

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

### **Style Management**
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

[Back to Top](#myjournal-project)

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
  - PhotoPicker for 
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
===========================================
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
- None at this time.

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
- None at this time.

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
- None at this time.


### **Backup System**
======================================

#### **Automatic Backups**
--------------------------------------
Status: 🟡 Operational

##### Current Features
- Daily backups
- Incremental backups
- Backup scheduling
- Backup verification
- Error handling
- Notification system

##### Planned Features
- Real-time backups
- Backup compression
- Backup encryption
- Backup analytics

❓ Open Questions:
- Review this...

#### **Manual Backups**
--------------------------------------
Status: 🟡 Operational

##### Current Features
- On-demand backups
- Backup selection
- Backup validation
- Backup export
- Progress tracking
- Error handling

##### Planned Features
- Custom backup sets
- Backup templates
- Backup scheduling
- Backup sharing

❓ Open Questions:
- Review this...

#### **Recovery**
---------------------------------------
Status: 🟡 Operational

##### Current Features
- Point-in-time recovery
- Selective recovery
- Recovery validation
- Recovery testing
- Error handling
- Progress tracking

##### Planned Features
- Automated recovery
- Recovery scheduling
- Recovery analytics
- Recovery templates

❓ Open Questions:
- Review this...

### **Database**
=======================================

#### **Firestore Structure**
---------------------------------------
Status: 🟡 Operational

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
Status: 🟡 Operational

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

##### Current Features
- Input validation
- Data type checking
- Required field validation
- Format validation

##### Planned Features
- Custom validators
- Validation rules
- Error handling
- Validation logging

❓ Open Questions:
- What is this data validation in the context of?

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

❓ Open Questions:
- Why do we need two different metadata models: one for browsing (AlbumPhotoMetadata) and one for usage (PhotoMetadata)?

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

#### **Storage Strategy**
-------------------------------------------------
Status: 🟡 Operational

Storage Strategy:
- Originals stay in source services
- Only store thumbnails, previews, metadata in Firestore

##### Current Features  ??
- Firebase Storage integration
- Basic file upload
- Download URL generation
- File organization structure
- Basic error handling

##### Planned Features ??
- Storage optimization
  - Image compression
  - Format optimization
  - Lazy loading


❓ Open Questions:


### **Photopicker**
--------------------------------------------------------------
Status: 🟡 Operational

Photopicker for selecting and assigning photos to entries and albums.

#### Current Features
- Photopicker integrated (Entry- New/Edit, Album-New/)
- Collapsible/Expandable Tree structure
- singleSelect/multiSelect dependent on route

#### Planned Features
- Integrate with Album-Edit

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

##### Current Features
- Some basic elements for early experimentation - not operational
  - Local config file for album mappings
  - Basic folder structure integration
  - Album path configuration
  - Basic API integration

##### Planned Features
- Proper file system access

❓ Open Questions:


#### **Google Photos**
----------------------------------------------------
Status: ⭕ Planned

##### Current Features
- None

##### Planned Features
- Integration API

❓ Open Questions:


#### **Apple Photos**
----------------------------------------------------
Status: ⭕ Planned

##### Current Features
- None

##### Planned Features
- Integration API

❓ Open Questions:


[Back to Top](#myjournal-project)

