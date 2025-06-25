# Project Overview

This project is a personal journaling application combining text and media in an immersive flexible and curated manner. 

The application is built around the concept of a 'card' containing a story, gallery, quote, or question--made up of text and media. A card is:

- standalone or nested, containing an array of children, acting as a container of other cards. 
- assigned dimensional and heirarchical tags for flexible filtering. 
- presented in various ways controlling its presentation and behavior:

The application opens with a home page with login.
Once in, the application has two primary functions:
- Content - The presentation and and filtering of cards for consumption.
- Administration - The creation, updating, deleting of cards, tags and other elements.

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
  - Next.js 15.3.2
  - React 19
  - TypeScript
  - Native CSS
  - TipTap rich text editing
  - PhotoPicker for populating media
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
  2 - Hosting: Netlify (primary), with Vercel as backup

### **Authentication**
=================================
Status: ✅ Implemented

- Auth.js handles user sign-in and session management

✅
- Firestore Adapter: User and session data is stored in Firestore via `@auth/firebase-adapter`
- Application wrapped in AuthProvider
- All API routes are secured at the edge. 

⭕

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
- cards collection
- entries collection
- albums collection
- tags collection
- media collection

⭕
2 - remove entries/albums collections

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

⭕
1 - Harden app to validate/sanitize data its components receive/provide.

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
2 - Remove left sidebar
2 - Add image(s) of me from various stages


### **Content Page** ❗
---------------------------------
Status: 🟡 Operational

The core function of the application is the presentation for consumption of textual and image content through a single portal, prmarily on mobile and tablet devices in a grid-based card system with navigation through tag filters, infinite scroll and related content links.

✅
- Grid-based layout connected to all content (cards)
- Infinite scroll

⭕
Function
2 - Fix ghost layout
2 - Fix grid sizing

Styling 
- Multi-sized cards - Card height and width ratios of each other to facilitate grid structure
- Varying styling - Titles, Tags, Excerpts overlaid/non-overlaid
- Card animation - image motion, gifs, videos


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
2 - Function
- Navigate page
- add Back button
- add subtitle
- add tags buttons
- add gallery
- add children
- add 'related' content

2 - Styling
- navigate page
- inline page
- static page - quote
- style gallery

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

Administration is only available to author.
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
Status: 🟡 Operational

✅
- card list
- load more pagination
- title search
- type/status filtering

⭕
2 - test bulk tag assignment
2 - test bulk editing
2 - test inline editing
2 - fix statistics
2 - add displaymode to filter

### **Card New/Edit** ❗
---------------------------------
Stautus: 🟡 Operational

✅
- cover image - pick/paste/drag
- title, subtitle, excerpt
- content rich text editing
- draft/published status
- macro tag assignment

⭕
Function
1 - fix coverimage
1 - fix content image embed
1 - fix gallery
2 - strategize children linking
2 - default excerpt to first x characters
2 - batch upload gallery cards
2 - add manage photos - add/delete/order/orientation
2 - gallery captions

Styling
2 - move H1 and H2 to first buttons
2 - make remove button same as change
2 - add more sizes
2 - change create card to save


### **Tag System**
---------------------------------
Status: 🟡 Operational

Cards are assigned dimensional and heirarchical tags to facilitate flexible filtering.

Assignment - Tags are assigned multi-select on creation or edit of the card `MacroTagselector`
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

Maintenance & Reorganization
If the tag hierarchy is ever moved or deleted the maintenance process is efficient and contained:
- The `parentId` and `path` array of the moved tag are updated.
- A script updates the `path` array for all *descendant tags* of the moved tag.
- **No `card` documents need to be modified**, as their `_tag_lineage` is rebuilt on their next write. 

The Tag Management page provides an administrative interface.

✅
- tags collection
- type
- inline name editing 
- drag-and-drop reordering 
- drag-and-drop reparenting
- add child tag button `+`
- tag deletion handling
  - promote children: the tag is deleted, and its direct children become children of the deleted tag's parent.
  - Cascade Delete: the tag and all of its descendant tags are deleted. Cards lose their tags

⭕
2 - modify deletion strategy choice modal (replacing the browser prompt)
2 - add background task system for processing complex deletions to prevent UI freezes.

### **Tag Filtering** ❗
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

- Connect with external image sources via generic service layer
- Provide a consistent user experience across different photo sources
- Store images in database, reference by ID
- Images are processed (Sharp), uploaded to Firebase Storage, and metadata is saved.
- Maintain metadata and relationships between photos and cards
- Optimize performance through caching and lazy loading
- Manage the storage, processing, and display of images efficiently


- Next.js Image Optimization
- Automatically fitted to closest standard ratio using `object-fit: cover`
- Display preferences stored in data attributes
- CSS-based transformations for performance
- No permanent image modifications
- Portrait images handled with:
  - Smart cropping
  - Blurred background

✅
- collection and type
- service layer for local
- photopicker integrated
- image optimization implemented

⭕
- fully migrate image management
- optimize image strategy implementation


### **Storage**
-------------------------------------------------
Status: 🟡 Operational

- Store optimized images, versions, thumbnails, previews, metadata in Firestore

✅
- firebase storage integration
- basic file upload
- download URL generation
- file organization structure
- basic error handling

⭕
2 - Storage optimization
    - Image compression
    - Format optimization
    - Lazy loading


### **Normalization**
--------------------------------------------------
Status:  ⭕Planned - on hold

Normalize and edit images.

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
Status: ✅ Implemented

Photopicker for selecting and assigning photos to cover, content, galleries.

✅
- photopicker integrated  
- collapsible/expandable tree structure
- single-select/multi-select dependent on route

⭕

### **Local Drive** 
--------------------------------------------------------------
Status: ✅ Implemented

Use local drive until operational functionality solid, then link to online sources.

✅
- Local drive API 
- env.local contains the ONEDRIVE_ROOT_FOLDER variable

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
2 - Proper file system access

❓ 

### **Google Photos**
----------------------------------------------------
Status: ⭕ Planned

✅
- None

⭕
2 - Integration API

❓ 

### **Apple Photos**
----------------------------------------------------
Status: ⭕ Planned

✅
- None

⭕
2 - Integration API

❓ 
