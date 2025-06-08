# MyJournal Project
Last Updated: [Current Date]

This document is to provide the AI Assistant with context to maintain continuity between sessions. 
At the end of each session, the AI Assisant will update this for the next AI Assistant.


## Table of Contents
1. [Project Overview](#project-overview)
   - [Context](#context)
   - [Scope](#scope)
   - [Technical Stack](#technical-stack)
   - [Deployment Model](#deployment-model)
   - [Operational Summary](#operational-summary)

2. [Interaction Rules](#interaction-rules)
   - [Core Principles](#core-principles)
   - [Decision Making](#decision-making)
   - [Communication Protocol](#communication-protocol)
   - [Self-Correction](#self-correction)
   - [Error Prevention](#error-prevention)

3. [Development Rules](#development-rules)
   - [Code Creation and Modification](#code-creation-and-modification)
   - [Directory Structure](#directory-structure)
   - [Naming Conventions](#naming-conventions)
   - [Configuration and Environment](#configuration-and-environment)
   - [Code Documentation](#code-documentation)

4. [Content Consumption](#content-consumption)
   - [Navigation Systems](#navigation-systems)
     - [Card-based Navigation](#card-based-navigation)
     - [Tag-based Navigation](#tag-based-navigation)
     - [Search & Filter](#search-filter)
   - [Content Presentation](#content-presentation)
     - [Entry View](#entry-view)
     - [Album View](#album-view)
     - [Tag View](#tag-view)
   - [UI Components](#ui-components)
     - [Layout System](#layout-system)
     - [Theme System](#theme-system)
     - [Media Display](#media-display)

5. [Content Administration](#content-administration)
   - [Entry Management](#entry-management)
   - [Album Management](#album-management)
   - [Tag Management](#tag-management)
   - [Question Management](#question-management)
   - [Admin Navigation](#admin-navigation)

6. [Technical Infrastructure](#technical-infrastructure)
   - [Technical Stack](#technical-stack)
     - [Frontend](#frontend)
     - [Backend](#backend)
     - [AI Integration](#ai-integration)
     - [Media Services](#media-services)
   - [Data Models](#data-models)
     - [Entry Model](#entry-model)
     - [Album Model](#album-model)
     - [Tag Model](#tag-model)
     - [User Model](#user-model)
   - [Authentication](#authentication)
     - [Overall Strategy](#overall-strategy)
     - [Primary Identity Provider](#primary-identity-provider)
     - [Connected Accounts (for Photo Services)](#connected-accounts-for-photo-services)
     - [Firebase for Data Access](#firebase-for-data-access)
     - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
   - [Backup System](#backup-system)
     - [Automatic Backups](#automatic-backups)
     - [Manual Backups](#manual-backups)
     - [Recovery](#recovery)
   - [Database](#database)
     - [Firestore Structure](#firestore-structure)
     - [Security Rules](#security-rules)
     - [Data Validation](#data-validation)
   - [Image Integration](#image-integration)
     - [Google Photos API](#google-photos-api)
     - [OneDrive Integration](#onedrive-integration)
     - [Image Processing](#image-processing)
     - [Storage Strategy](#storage-strategy)

7. [Implementation Sequence](#implementation-sequence)
   - [Phase 1: Core Functionality](#phase-1-core-functionality)
   - [Phase 2: Media Integration](#phase-2-media-integration)
   - [Phase 3: Enhanced Features](#phase-3-enhanced-features)

[Back to Top](#myjournal-project)

## 1. Project Overview

### Context
This project is a personal journaling application that helps users document and share their life stories, reflections, photos, and media with others.

### Scope
- Story and reflection creation and management
- Photo and media integration
- Tag-based organization
- Family sharing and interaction
- AI-assisted content creation and organization

### Technical Stack
- Frontend: 
  - Next.js 15.3.2
  - React 19
  - TypeScript
  - Native CSS
  - TipTap for rich text editing
  - Framer Motion for animations
- Backend: 
  - Firebase (Firestore, Authentication, Storage)
  - Firebase Admin SDK for server-side operations
- AI: OpenAI integration for content assistance
- Media: 
  - OneDrive Integration (primary photo source)
  - Google Photos API (future support)
  - Apple Photos (future support)
- Hosting: Netlify (primary), with Vercel as backup
- Version Control: GitHub
- Testing: Jest, React Testing Library
- Development Tools:
  - ESLint for code quality
  - TypeScript for type safety
  - Jest for testing
  - Custom scripts for migration and backup

### Deployment Model
- Netlify for hosting and CI/CD
- GitHub for source control and collaboration
- Firebase for backend services

### Operational Summary
Most have many photos, but they remain hidden with limited ways for them to be enjoyed. This 
application allows the author to integrate with the storage of those photos and write entries 
in a digital journal about those photos and explore both in an immersive flexible or curated manner.

#### Elements
The primary elements of the app are Entries and Albums categorized by hierarchical Tags.
- An entry is a primarily textual, but also visual unit that describes a story of 2 types:
  - Story - Historical narrative
  - Reflection - Personal insight
- An album is a primarily visual, but also textual unit that depicts a story
- Entries can be linked to albums and albums can be linked to entries
- Both Entries and Albums are categorized into 5 dimensions:
  - who, what, when, where, and reflection
  - User selects tag and the Entry or Album inherits the defined ancestor tags
- Albums are collections of photos 
  - linked to an album of photos
  - collected individually
- Album Title and Caption
- Photos with entries have link
- Photos with captions
  - Overlaid, Separate, Random
- Image management key to speed and minimal cost

[Back to Top](#myjournal-project)

## 2. Interaction Rules

### Core Principles
1. **Never Act Without Approval**
   - MUST get explicit approval before ANY code change
   - MUST get explicit approval before ANY file creation
   - MUST get explicit approval before ANY file movement
   - MUST get explicit approval before ANY structural change
   - MUST get explicit approval before ANY naming decision
   - MUST get explicit approval before ANY configuration change
   - MUST get explicit approval before ANY dependency addition

2. **Always Search First**
   - MUST search entire codebase before proposing any change
   - MUST report ALL search results, even if seemingly irrelevant
   - MUST explicitly state if search returns no results
   - MUST ask for clarification if search results are unclear
   - MUST explain search scope and methodology

3. **Always Explain in Plain Terms**
   - MUST use layman's terms, not technical jargon
   - MUST explain the "why" before the "what"
   - MUST reference existing files and variables by name
   - MUST NOT include code snippets unless specifically requested
   - MUST explain implications and potential impacts

### Decision Making
1. **Never Assume**
   - MUST ask for clarification if there is ANY uncertainty
   - MUST ask for clarification if a rule seems ambiguous
   - MUST ask for clarification if a pattern seems inconsistent
   - MUST ask for guidance if multiple valid options exist
   - MUST state assumptions explicitly

2. **Never Proceed Without Understanding**
   - MUST ask for clarification if requirements are unclear
   - MUST ask for clarification if rules are unclear
   - MUST ask for clarification if implications are unclear
   - MUST ask for clarification if context is unclear
   - MUST confirm understanding before proceeding

3. **Never Make Unilateral Decisions**
   - MUST present options and recommendations
   - MUST explain reasoning behind recommendations
   - MUST wait for explicit approval
   - MUST confirm understanding of approval
   - MUST explain any deviations from recommendations

### Communication Protocol
1. **Always Be Explicit**
   - MUST state intentions clearly
   - MUST state assumptions explicitly
   - MUST state limitations explicitly
   - MUST state potential issues explicitly
   - MUST state dependencies explicitly

2. **Always Be Proactive**
   - MUST identify potential issues before they occur
   - MUST ask for clarification before proceeding
   - MUST present options before making decisions
   - MUST explain implications before taking action
   - MUST anticipate and address potential problems

3. **Always Be Responsive**
   - MUST acknowledge all instructions
   - MUST confirm understanding of requirements
   - MUST ask for clarification when needed
   - MUST report progress and issues
   - MUST respond to feedback immediately

### Self-Correction
1. **Always Monitor**
   - MUST monitor compliance with rules
   - MUST monitor understanding
   - MUST monitor assumptions
   - MUST monitor decisions
   - MUST monitor implications

2. **Always Correct**
   - MUST correct mistakes immediately
   - MUST correct misunderstandings immediately
   - MUST correct assumptions immediately
   - MUST correct violations immediately
   - MUST explain corrections

3. **Always Learn**
   - MUST learn from mistakes
   - MUST learn from clarifications
   - MUST learn from corrections
   - MUST learn from feedback
   - MUST apply lessons learned

### Error Prevention
1. **Always Validate**
   - MUST validate file paths before operations
   - MUST validate dependencies before changes
   - MUST validate configurations before use
   - MUST validate assumptions before proceeding
   - MUST validate implications before acting

2. **Always Check**
   - MUST check for existing code before creating new code
   - MUST check for existing patterns before creating new patterns
   - MUST check for potential conflicts before making changes
   - MUST check for potential side effects before proceeding
   - MUST check for potential issues before acting

3. **Always Verify**
   - MUST verify understanding of requirements
   - MUST verify understanding of rules
   - MUST verify understanding of context
   - MUST verify understanding of implications
   - MUST verify understanding of approvals

4. ** Don't Patronize **
   - Never patronize with compliments about ideas or actions.
   - Just answer the question or request toward the goal of the project.

[Back to Top](#myjournal-project)

## 3. Development Rules

### Code Creation and Modification
1. **Pre-Action Requirements**
   - MUST search entire codebase before proposing any code changes
   - MUST report search results to user
   - MUST wait for explicit approval before any code action

2. **Proposal Format**
   - MUST explain changes in layman's terms
   - MUST specify file locations
   - MUST reference existing files/variables by name
   - MUST NOT include code snippets unless specifically requested

3. **Approval Process**
   - MUST get explicit approval for:
     - File creation
     - File modification
     - File location
     - File naming
   - MUST NOT proceed without approval
   - MUST confirm understanding of approval before proceeding

### Directory Structure
1. **Base Structure**
   ```
   src/
   ├── app/                      # Next.js app router
   │   ├── admin/                # Admin area
   │   │   ├── album-admin/      # Album management
   │   │   |   └── page.tsx   
   │   │   ├── entry-admin/      # Entry management
   |   │   |   └── page.tsx   
   │   │   ├── tag-admin/         # Tag management
   │   │   |    └── page.tsx   
   |   │   └── layout.tsx   
   │   ├── api/ 
   │   │   ├── albums/            // Data-access for Album content
   │   │   │   ├── route.ts       // GET (all), POST
   │   │   │   └── [id]/
   │   │   │       └── route.ts   // GET (one), PATCH, DELETE
   │   │   │
   │   │   ├── entries/           // Data-access for Entry content (future)
   │   │   │
   │   │   ├── tags/              // Data-access for Tag content
   │   │   │   └── route.ts       // GET (all)
   │   │   │
   │   │   └── photos/            // Data-access for the Photo Service Abstraction
   │   │       ├── tree/
   │   │       │   └── route.ts   // GET folder structure
   │   │       ├── contents/
   │   │       │   └── route.ts   // POST to get folder contents
   │   │       └── image/
   │   │           └── route.ts   // GET to serve an image file
   │   ├── layout.tsx             // Root layout (contains <body>, providers)
   │   ├── globals.css
   |   |
   │   └── view/                    # Public viewing area
   |       ├── (home)/ 
   │       ├── album-view/[id]/     # Album viewing
   │       |   └── page.tsx  
   │       ├── entry-view/[id]/     # Entry viewing
   │       |   └── page.tsx   
   |       └── layout.tsx  
   ├── components/          # React components
   │   ├── admin/           # Admin components
   │   ├── common/          # Shared components
   │   └── view/            # View components
   └── lib/                 # Shared resources
       ├── config/          # Configuration
       ├── contexts/        # React contexts
       ├── firebase/        # Firebase setup
       ├── hooks/           # Custom hooks
       ├── mocks/           # Mock data
       ├── scripts/         # Utility scripts
       ├── services/        # Business logic
       ├── types/           # TypeScript types
       └── utils/           # Utility functions
   ```

2. **Component Organization**
   - MUST place components in appropriate subdirectory based on function
   - MUST NOT mix function-based and feature-based organization
   - MUST follow the structure defined above
   - MUST place shared components in common/ directory
   - MUST place component-specific types in lib/types/

### Naming Conventions
1. **File Naming**
   - MUST use kebab-case for folders and CSS files
   - MUST use PascalCase for React components
   - MUST use camelCase for:
     - Hooks
     - Utilities
     - Types
     - Services
     - Scripts
     - JavaScript variables
     - Function names

2. **Component Naming**
   - MUST use PascalCase for component files
   - MUST match component name with file name
   - MUST use .module.css for component styles

### Configuration and Environment
1. **Environment Variables**
   - MUST use .env for environment variables
   - MUST document required variables in script headers
   - MUST validate required variables before execution

2. **Firebase Configuration**
   - MUST use client SDK for browser operations
   - MUST use admin SDK for server operations
   - MUST NOT mix client and admin SDKs
   - MUST use correct environment variables for each SDK

3. **Script Execution**
   - MUST use PowerShell for script execution
   - MUST execute scripts using:
     ```powershell
     npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/<script-name>
     ```
   - MUST handle file operations sequentially, not in parallel
   - MUST validate file operations before proceeding
   - MUST use proper error handling for file operations
   - MUST log operation results

### Code Documentation
1. **Code Comments**
   - MUST comment all code extensively explaining:
     - What and why of:
      - Logic
      - Component relationships
      - State management

2. **Type Documentation**
   - MUST document:
     - Type purpose
     - Field meanings
     - Usage constraints

3. **CSS Guidelines for Responsive Design**

   #### Core Principles
   - Use fluid-first approach with relative units (%, vw, vh)
   - Implement smooth scaling with `clamp()` and `min()`
   - Use breakpoints only for fundamental layout changes
   - Current breakpoint: 640px (mobile layout switch)

   #### Implementation Guidelines
   ```css
   /* Preferred approach */
   .element {
     width: min(400px, 50vw);  /* Fluid with max constraint */
     margin: clamp(1rem, 3vw, 1.5rem);  /* Fluid with min/max */
     font-size: clamp(1rem, 2vw, 1.125rem);  /* Fluid typography */
   }
   ```

   #### Image Sizes
   - Small: `width: min(200px, 30vw)`
   - Medium: `width: min(400px, 50vw)`
   - Large: `width: min(600px, 70vw)`

   #### Best Practices
   1. **Container Sizing**
      - Use `min()` for maximum width constraints
      - Allow fluid scaling within bounds
      - Example: `width: min(100%, 1200px)`

   2. **Spacing**
      - Use `clamp()` for fluid margins and padding
      - Scale with viewport: `clamp(min, preferred, max)`
      - Example: `margin: clamp(1rem, 3vw, 1.5rem)`

   3. **Typography**
      - Implement fluid typography with `clamp()`
      - Maintain readability at all sizes
      - Example: `font-size: clamp(1rem, 2vw, 1.125rem)`

   4. **Transitions**
      - Add smooth transitions for size changes
      - Example: `transition: width 0.3s ease, margin 0.3s ease`

   #### Maintenance Notes
   1. **When to Use Breakpoints**
      - Only for fundamental layout changes
      - When switching from multi-column to single-column
      - When changing float behavior

   2. **When to Use Fluid Sizing**
      - For all size-related properties
      - For spacing and margins
      - For typography
      - For image dimensions

   3. **Performance Considerations**
      - Minimize number of media queries
      - Use efficient CSS properties
      - Consider using CSS custom properties for common values

[Back to Top](#myjournal-project)

## 4. Content Consumption

Legend:
- ✅ Implemented
- 🟡 Operational
- ⭕ Planned
- ❓ Open Question

### **Home Page**
Status: 🟡 Operational

#### Current Features
- Images
- Welcome message
- Enter button

#### Planned Features
- Login (email/password) to replace Enter button

### **Content Consumption**

Development Notes:
Next: Implement basic card-based navigation
Depends on: Entry and Album data models
Notes: Start with simple grid layout before adding advanced features

### Navigation Systems

### **Top Navigation**
Status: 🟡 Operational

#### Current Features
- Logo
- Theme toggle
- Content/Admin

#### Planned Features

### **Card-based Navigation**
Status: ⭕ Planned

Card-based navigation means starting with Tag cards of the 5 dimensions and drilling up and 
down the tag heirarchy until reaching a level of Entries or Albums. Need to rationalize this
and see if it makes practical sense.

Current grid system only fed by Entries. Not sure if current grid can be expanded or a new one created.

Development Notes:
Next: Basic grid implementation
Depends on: Entry data model
Notes: Focus on single-column layout first

##### Current Features
- none

##### Planned Features
- Remove 'New Entry' button
- Grid system of multi-size cards
- Integration of entries, albums, and tags
- Initial display of 5 tag-based cards
- Color-coded tag dimensions
- Hierarchical navigation
- Random/sorted order options
- Styling
- Card animation improvements
- Card size optimization
- Card content preview

### **Tag-based Navigation**
Status: 🟡 Operational
Tag navigation is a heirarchical tag tree selection to filter entry and album cards. This would be on a slide sidebar with 3 tabs--Tags, Entries, Albums

#### Current Features
- Tag hierarchy display
- Multi-select filtering
- Tag dimension organization
- Tag relationship visualization

#### Planned Features
- Styling
- Advanced tag filtering
- Tag search
- Tag analytics
- Tag suggestions

### **Element-based Filter**
Status: ⭕ Planned
Element-base filter is a selector of Entries, Albums or Both to display in the card grid.

#### Current Features
- none

#### Planned Features
- Tab-selector across the top or radio buttons on the navigation sidebar.

### **Search & Filter**
Status: 🟡 Operational

#### Current Features
- Basic text search
- Tag filtering
- Date filtering

#### Planned Features
- Advanced search
- Search history
- Search suggestions
- Filter combinations

### **Content Presentation**

### **Entry View**
Status: 🟡 Operational
This is curretnly card view. May not be needed explcitly and will become "content view".

#### Current Features
- Rich text display
- Media embedding
- Related content
- Tag context

#### Planned Features
- Reading progress
- Content sharing
- Print view
- Export options

### **Album View**
Status: ⭕ Planned


#### Current Features
- Photo grid display
- Caption display
- Entry links
- Tag context

#### Planned Features
- Gallery view
- Slideshow mode
- Download options
- Share functionality

### **UI Components**

### **Layout System**
Status: 🟡 Operational

#### Current Features
- Card layout
- Responsive design
- Mobile-first approach
- Tablet optimization

#### Planned Features
- Grid layout
- Masonry layout
- Gallery layout
- Custom layout builder

#### **Theme System**
Status: 🟡 Operational

##### Current Features
- Light/Dark theme

##### Planned Features
- Settings Dialog
- Theme Presets
- Custom Theming

#### **Media Display**
Status: 🟡 Operational

##### Current Features
- **✅ In-Content Images:** Images are rendered within the rich text content via a custom Tiptap Node View.
- **✅ Photo Picker:** A modal for browsing and selecting photos from albums.

##### Planned Features
- Image gallery
- Video player
- Audio player
- Media grid
- Lightbox
- Thumbnail system
- Advanced gallery
- Media editing

[Back to Top](#myjournal-project)

## 5. **Content Administration**

Development Notes:
Next: Complete basic entry management
Depends on: Authentication and basic data models
Notes: Focus on CRUD operations before adding advanced features

### **Entry Management**
Status: 🟡 Operational

#### Current Features
- Entry collection
- Entry listing
- Statistics
- Search and filtering
- Inline edit
- Bulk edit

#### Planned Features
- Tag assignment
- Improved styling
- Export functionality
- Analytics dashboard

### **Entry Creation**
Stautus: 🟡 Operational

#### Current Features
- Title
- Rich Text Editing
- Tag Assignment

#### Planned Features
- Cover Image
- Image Embedding
- Draft/Published states

### **Entry Edit**
Status: 🟡 Operational

#### Current Features
- Cover Image
- Title
- Rich Text Editing
- Tag Assigment
- **✅ Image Embedding:** Images can be inserted via the Photo Picker, pasted, or dragged-and-dropped.
- **✅ Image Manipulation:** Selected images can be resized and aligned. Captions are directly editable.

#### Planned Features
- **🟡 Aspect Ratio Control:** UI exists but is not yet functional.
- Improved paste/drag-drop handling for multiple images.
- Image-specific metadata management (e.g., tags).

### **Album Management**
Status: 🟡 Operational

An album is a collection of images, initially from one source, but eventually potentially from multiple sources. They will have a title, caption and description. 
- Summary view of cards
   - Coverpage, title, caption, date, tags
- Detailed album view, 
   - Grid-based presentation of the images
      - Title, caption, description, tags, images
      - Scrapbook styling
         - Colorful backgrounds, styled text
         - Paginated or scrollable. 
      Captions togglable
         Click/hover
      Links to the 'entries' to which they are associated.
         - Assignment can be done either from the album view,
            - potentially even in the admin album view. 

Code Assessment: Current State of Album Management
Here is a breakdown of the existing capabilities in src/app/admin/album-admin/page.tsx based on the code I've seen:
What Still Exists (The UI and Client-Side Logic):
CRUD UI: The page has a complete UI for managing a list of albums. It includes a table to display albums, buttons for actions, and logic for in-line editing of title and status.
Bulk Editing UI: The interface for bulk operations is fully built. This includes the "select all" checkbox, individual selection checkboxes, and the dropdowns/buttons for "Update Status," "Update Tags," and "Delete Selected."
Client-Side Handlers: All the functions to handle these actions are present (handleBulkDelete, handleBulkStatusUpdate, handleEditSave, etc.). These functions are correctly set up to make API calls (fetch) to the server. They are currently calling non-existent or broken service functions, but the client-side part is sound.
What is Missing or Disconnected (The Backend):
Data Source: The page is completely disconnected from any data. As we discovered, getAllAlbums() and getTags() are not working. The page currently loads with an empty list.
Backend API Calls: The client-side handlers are trying to call service functions (deleteAlbum, updateAlbum) that were designed for the old, broken model. We need to replace these with fetch calls to specific API routes that we will create. For example, deleteAlbum(albumId) needs to become fetch('/api/albums/${albumId}', { method: 'DELETE' }).
Photo Service: The crucial link to your photos is missing. There is no PhotoPicker on this page, and therefore no way to select images for a new album or edit the images in an existing one.
In short: We have a well-built user interface, but its engine has been removed. The forms, buttons, and tables are all there, but they aren't connected to anything.
Strategy for Moving Forward: A Controlled, Step-by-Step Rebuild
Here is the plan to reconnect the engine, one piece at a time, ensuring each step is working before moving to the next.
Phase 1: Re-establish Core CRUD for Albums (Server-Side)
Our first priority is to make the existing UI functional again. This means building the server-side API endpoints that the client expects.
Create /api/albums Routes: We will create a new directory src/app/api/albums/ for our API routes.
GET /api/albums: Implement the GET handler. This will use the server-side albumService (which we will inspect and fix) to fetch all albums from Firestore and return them as JSON. This will populate the main table on the page.
POST /api/albums: Implement the POST handler for creating a new album.
PATCH /api/albums/[id]: Implement the PATCH handler for updating an album (for both single-field edits and bulk updates).
DELETE /api/albums/[id]: Implement the DELETE handler for deleting a single album.
Phase 2: Reconnect the Client to the New API
Once the backend API is ready, we will reconnect the album-admin page to it.
Fix loadData: We will replace getAllAlbums() with a fetch('/api/albums') call.
Fix Handlers: We will go through each handler function (handleBulkDelete, handleEditSave, etc.) and ensure it's using a fetch call to the correct API endpoint we built in Phase 1.
At the end of Phase 2, you will have a fully functional album management page for all text-based data (title, status, description). You will be able to add, edit, and delete albums, and all bulk operations will work.
Phase 3: Integrate the Local Photo Service
With the core album functionality restored, we will integrate the photo management.
Add PhotoPicker: We will add the working PhotoPicker component to a modal or a separate "Create New Album" view.
"Create Album" Workflow: For creating a new album, the PhotoPicker will provide a list of selected local file paths. These paths will be saved as part of the new album object sent to the POST /api/albums endpoint.
"Edit Photos" Workflow: We will add an "Edit Photos" button to each album row. This will open the AlbumPhotoManager component (which uses the PhotoPicker) and allow you to modify the list of photo paths for an existing album, saving the changes via the PATCH /api/albums/[id] endpoint.
This phased approach ensures we are building on a solid foundation. We will verify that each piece of functionality is working perfectly before adding the next layer of complexity.
Please let me know your thoughts on this assessment and strategy. We will not proceed until you are confident in the plan.
            
#### Current Features
- Album collection
- Album Listing
- Search and filter
- Inline edit
- Bulk edit

#### Planned Features
- Album creation
- Album editing
- Album templates
- Media analytics
- Batch upload

❓Open Questions:
- Which image source to begin?
- Data model sufficient?

### **Album Creation**
Status: ⭕ Planned

#### Current Features
- none

#### Planned Features
- Cover Image
- Title
- Caption
- Image array
- Tag assignment

### **Album Edit**
Status: ⭕ Planned

####Current Features
- none

#### Planned Features
- Cover Image
- Title
- Caption
- Image array
- Tag assignment

### **Tag Management**
Status: 🟡 Operational
Tags are managed (added, edited, deleted).

#### Current Features
- Tag collection
- Tag Listing
- Tag hierarchy management
- Tag ordering
- Tag relationships
- Tag cleanup
- Bulk edit
- Search and filter

#### Planned Features
- Drag and drop hierarchy
- Tag deletion/merging
- Styling improvements
- Tag analytics ??
- Tag suggestions ??
- Tag history ??

❓ Open Questions
- How to deal with edited/deleted tags?

### **Question Management**
Status: ⭕ Planned

#### Current Features
- None

#### Planned Features
- Question collection
- Question listing and filtering
- Question creation and editing
- Answer management
- Basic analytics
- Advanced analytics
- Question templates
- Answer validation
- User feedback

❓ Open Questions
- Do we want to track answers?

### **Admin Navigation**
Status: 🟡 Operational

#### Current Features
- Static Sidebar
- Basic navigation
- Role-based access

#### Planned Features
- Add Tab title
- Advanced navigation
- Quick actions
- Admin dashboard

[Back to Top](#myjournal-project)

## 6. **Technical Infrastructure**

Development Notes:
Next: Complete Firebase configuration
Depends on: None
Notes: Ensure all environment variables are properly set up

### **Technical Stack**

#### **Frontend**
- Next.js 15.3.2
- React 19
- TypeScript
- Native CSS
- TipTap for rich text editing
- Framer Motion for animations

#### **Backend**
- Firebase (Firestore, Authentication, Storage)
- Firebase Admin SDK for server-side operations

#### **AI Integration**
- OpenAI integration for content assistance

#### **Media Services**
- OneDrive Integration (primary photo source)
- Google Photos API (future support)
- Apple Photos (future support)

### **Data Models**

#### **Entry Model**
```typescript
interface Entry {
  id: string;
  title: string;
  content: string;
  type: 'story' | 'reflection';
  status: 'draft' | 'published';
  visibility: 'private' | 'family' | 'public';
  tags: string[];
  coverPhoto?: PhotoMetadata;  // Optional cover photo for the entry
  media: PhotoMetadata[];      // Array of photo references used in the content
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
  author: {
    id: string;
    name: string;
  };
}
```

#### **PhotoMetadata Model**
```typescript
// Full metadata for photos embedded in entries
interface PhotoMetadata {
  id: string;
  filename: string;
  path: string;
  albumId: string;
  albumName: string;
  size: number;
  lastModified: number;
  thumbnailUrl: string;
  previewUrl: string;
  caption?: string;
  tags?: string[];
}

// Simplified metadata for photos in albums/photo picker
interface AlbumPhotoMetadata {
  id: string;
  filename: string;
  path: string;
  thumbnailUrl: string;
  previewUrl: string;
  caption?: string;
}
```

The full `PhotoMetadata` is required for:
- Photos embedded in entry content
- Entry cover photos
- Photos that need to maintain album relationships

The simplified `AlbumPhotoMetadata` is used for:
- Photo picker browsing
- Album views
- General photo browsing

#### **Album Model**
```typescript
interface AdminAlbum {
  id: string;
  name: string;
  description: string;
  mediaCount: number;
  tags: string[];
  lastModifiedBy: string;
  lastModifiedAt: Date;
  metadata: {
    coverImageId?: string;
    visibility: 'private' | 'family' | 'public';
    creationDate: Date;
    lastMediaAdded: Date;
  };
  media: {
    id: string;
    order: number;
    addedAt: Date;
    addedBy: string;
  }[];
  history: {
    action: string;
    timestamp: Date;
    userId: string;
    changes: Record<string, any>;
  }[];
}
```

#### **Tag Model**
```typescript
interface AdminTag {
  id: string;
  name: string;
  dimension: string;
  parentId: string | null;
  order: number;
  entryCount: number;
  lastModifiedBy: string;
  lastModifiedAt: Date;
  metadata: {
    description?: string;
    color?: string;
    icon?: string;
    isSystem: boolean;
  };
  relationships: {
    parent?: string;
    children: string[];
    siblings: string[];
  };
  history: {
    action: string;
    timestamp: Date;
    userId: string;
    changes: Record<string, any>;
  }[];
}
```

#### **User Model**
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  roles: string[];
  metadata: {
    createdAt: Date;
    lastLogin: Date;
    lastPasswordChange: Date;
    emailVerified: boolean;
  };
  settings: {
    twoFactorEnabled: boolean;
    notificationPreferences: {
      email: boolean;
      push: boolean;
    };
    securitySettings: {
      sessionTimeout: number;
      requireReauth: boolean;
    };
  };
}
```

### **Authentication**
  - ### Overall Strategy
       - Decouple application login from photo service connections to support multiple providers.
       - Centralize security logic in the Next.js backend, not in client-side code or complex database rules.
     - ### Primary Identity Provider
       - Manages user login for the application itself (e.g., email/password, social sign-in).
       - This is where user roles ('admin', 'viewer') are defined and managed.
       - A library like `lucia-auth` or a simple provider will be used.
     - ### Connected Accounts (for Photo Services)
       - The logged-in admin user can connect to photo services (OneDrive, Google Photos) on a settings page.
       - Each connection uses a standard OAuth 2.0 flow.
       - Securely stored tokens are used by the backend to fetch photos on the user's behalf.
     - ### Firebase for Data Access
       - The `firebase-admin` SDK will be used on the server-side for database operations.
       - It is NOT used for user sign-in.
       - Access is controlled via our own API routes, which check the user's role before interacting with Firestore.
     - ### Role-Based Access Control (RBAC)
       - Handled by the primary identity provider.
       - Server-side API routes will verify user's role (`admin` or `viewer`) before allowing access to resources.
Development Notes:
Next: Implement Google authentication
Depends on: Basic email/password auth
Notes: Need to set up OAuth credentials first

#### **Firebase Auth**
Status: 🟡 Operational
Location: `src/lib/services/auth.tsx`

##### Current Features
- Basic email/password authentication
- Session persistence
- Auth state management
- Basic error handling
- Auth context provider

##### Planned Features
- Google authentication
- Social auth providers
- 2FA support
- Password policies
- Account recovery
- Enhanced error handling
- Security rules implementation

#### **Session Management**
Status: ⭕ Planned
Location: `src/lib/auth/session/`

##### Current Features
- Basic session persistence through Firebase Auth

##### Planned Features
- Session tracking
- Token refresh
- Session timeout
- Device tracking
- Security logging
- Multi-device support
- Session analytics
- Security alerts
- Device management

#### **Role Management**
Status: ⭕ Planned
Location: `src/lib/auth/roles/`

##### Current Features
- Basic role definition in User interface

##### Planned Features
- Role definitions
- Permission management
- Access control
- Role assignment
- Role validation
- Role hierarchy
- Role analytics
- Role templates

### **Backup System**

#### **Automatic Backups**
Status: 🟡 Operational
Location: `src/lib/backup/`

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

#### **Manual Backups**
Status: 🟡 Operational
Location: `src/lib/backup/manual/`

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

#### **Recovery**
Status: 🟡 Operational
Location: `src/lib/backup/recovery/`

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

### **Database**

#### **Firestore Structure**
Status: 🟡 Operational
Location: `src/lib/firebase/`

##### Current Features
- Entry collection
- Album collection
- Tag collection
- User collection
- Media collection
- Security rules

##### Planned Features
- Advanced indexing
- Query optimization
- Data validation
- Data migration

#### **Security Rules**
Status: 🟡 Operational
Location: `firebase/firestore.rules`

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

#### **Data Validation**
Status: 🟡 Operational
Location: `src/lib/validation/` ???

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

### **Image Integration**

The Image Integration system serves as the bridge between the journal and external photo services, 
enabling users to seamlessly incorporate their existing photo collections into their journal entries. 

**Development Note:** The current implementation uses a local file system proxy to mock an external service like OneDrive. API routes (`/api/photos/...`) read directly from the local hard drive for development and testing purposes. This allows for the development of front-end features without requiring live cloud credentials.

The system is designed to:

1. Connect with external photo services (Google Photos, OneDrive) to access existing photo collections
2. Manage the storage, processing, and display of images efficiently
3. Maintain metadata and relationships between photos and journal entries
4. Optimize performance through caching and lazy loading
5. Provide a consistent user experience across different photo sources

Key Design Principles:
- Store only necessary data in Firebase (metadata, references, thumbnails)
- Use external services for original photo storage
- Implement efficient caching for frequently accessed content
- Maintain photo metadata and relationships
- Support multiple photo sources with a unified interface

    - ### Abstracted Service Layer
       - A generic "photo service" interface will be used in the application.
       - This allows plugging in different photo sources (local, OneDrive, Google Photos) without changing UI components.
     - ### Strict Client-Server Separation
       - Client components (e.g., `PhotoPicker`) are for UI only.
       - They make requests to internal API routes (e.g., `/api/photos/list`).
       - The server-side API route contains the logic to talk to the actual photo source. This prevents leaking keys or using server-only modules (`fs`) on the client.
     - ### OneDrive Integration
       - **Interim:** A `LocalPhotoService` will read from the local OneDrive folder via `fs` module for rapid development.
       - **Final:** A `OneDriveCloudService` will use stored OAuth tokens to call the Microsoft Graph API.
     - ### Google Photos API
       - A `GooglePhotosService` will use stored OAuth tokens to call the Google Photos API.
     - ### Image Processing
       - Use Next.js Image Optimization to serve efficient, web-friendly images.
     - ### Storage Strategy
       - Photos remain in their original source (OneDrive, etc.).
       - Firestore will only store metadata and references, not binary image data.
Implementation Plan:

1. **Phase 1: Foundation Setup**
   ```
   A. OneDrive Integration (Primary Source)
   - Set up OneDrive API access
   - Create folder structure reader
   - Implement basic photo access
   - Set up virtual album mapping
   
   B. Storage Infrastructure
   - Configure Firebase Storage
   - Set up thumbnail generation
   - Implement preview system
   - Create caching mechanism
   ```

2. **Phase 2: Core Album System**
   ```
   A. Virtual Album Structure
   - Create album data model
   - Implement album-photo relationships
   - Set up tag system integration
   - Create metadata storage
   
   B. Photo Management
   - Implement photo metadata tracking
   - Create service mapping system
   - Set up sync mechanism
   - Implement basic search
   ```

3. **Phase 3: Google Photos Integration**
   ```
   A. Google Photos Setup
   - Set up Google Cloud Project
   - Configure OAuth
   - Implement API access
   
   B. Integration
   - Map Google albums to virtual albums
   - Implement photo mapping
   - Set up sync system
   - Handle conflicts
   ```

4. **Phase 4: User Interface**
   ```
   A. Album Management
   - Create album browser
   - Implement photo grid
   - Add drag-and-drop
   - Create preview system
   
   B. Photo Operations
   - Add tag management
   - Implement caption system
   - Create search interface
   - Add export functionality
   ```

5. **Phase 5: Optimization**
   ```
   A. Performance
   - Implement lazy loading
   - Optimize caching
   - Add compression
   - Improve load times
   
   B. Features
   - Add batch operations
   - Implement advanced search
   - Create analytics
   - Add backup system
   ```

Storage Strategy:
- Originals stay in source services
- We store thumbnails (~20KB each)
- We store previews (~100KB each)
- We maintain metadata in Firestore
- Estimated storage: ~4% of original size

Album Structure:
- Virtual albums independent of sources
- Can combine photos from multiple services
- Maintains own metadata and relationships
- Syncs with sources on our schedule

Photo Management:
- Tracks photos across services
- Maintains consistent metadata
- Handles photo movement
- Supports multiple sources

Development Notes:
Next: Basic image upload to Firebase
Depends on: Firebase Storage setup
Notes: Start with single image upload before adding batch processing

#### Google Photos API
Status: ⭕ Planned
Location: `src/lib/services/google-photos/` ???

##### Current Features
- None

#### **Image Integration**
Status: 🟡 Operational
Location: `src/components/common/`

##### Current Features
- Photo picker component for selecting photos
- Rich text editor integration for photo placement
- Cover photo support for entries
- Photo metadata management
- Basic image upload
- File type validation
- File size validation (5MB limit)
- Upload progress tracking
- Error handling
- Firebase Storage integration

##### Current Issues
- Photo references not persisting in entries
- Need to implement proper photo caching
- Need to implement efficient photo loading strategies

##### Planned Features
- Image optimization
- Thumbnail generation
- Format conversion
- Metadata extraction
- Batch processing
- Advanced validation
- Compression options
- Google Photos API integration
- Apple Photos integration
- Planned Features
- Photo import
- Album sync
- Photo metadata
- Photo organization
- Authentication
- Rate limiting
- Error handling
- Caching strategy
##### Planned Features
- Photo import
- Album sync
- Photo metadata
- Photo organization
- OAuth integration
- Rate limiting
- Error handling
- Caching strategy

- Sourcing photos from OneDrive
- Limited to one hard-coded folder.
- Implemented a photpicker that referenced one directory. 
   - Navigate through directories or albums to get to images. 
- Cover page in the edit page, photo picker to select a photo
   - Change or remove it. 
- Photopicker embedded in rich text editor to insert a photo
- Size, align, apect ratio and caption of image.
- API endpoint (/api/photos/albums) reads this folder and creates metadata for each photo
   - Metadata includes paths, URLs, and basic photo information
The PhotoPicker component displays these photos using the metadata
   - create a PhotoMetadata object
   For cover photos: This metadata is stored directly in the entry's coverPhoto field
   For embedded photos: The metadata is used to create an image element in the rich text editor
- Separation between photo storage (OneDrive) and photo usage (entries) is more complex than initially thought
We need two different metadata models: one for browsing (AlbumPhotoMetadata) and one for usage (PhotoMetadata)
New Requirements:
We need a proper album navigation system in the PhotoPicker


Medium Term:
Implement album navigation in the PhotoPicker
Implement proper photo caching and optimization
Long Term:
Add support for multiple photo sources
Implement advanced photo organization features
Add batch processing capabilities

# Image Handling Strategy

## Aspect Ratios & Sizing
- Images are classified by natural dimensions (portrait/landscape/square)
- Automatically fitted to closest standard ratio using `object-fit: cover`
- No empty space or distortion allowed in layouts

## Cover Images
- Default to landscape orientation for cards and entry headers
- Portrait images handled in two ways:
  1. Smart cropping: AI-powered detection of important content areas to guide cropping
  2. Blurred background: Portrait images displayed on blurred, stretched version of same image

## Entry Content Images
- Current toolbar controls: size (small/medium/large) and alignment (left/center/right)
- Future enhancement: fill mode toggle (cover/contain) for flexible content layout

## Album Layout
- Quick CSS toggle for image display (cover/contain)
- Changes not persisted, allowing experimentation with layouts
- Separate from entry content image controls

## Technical Implementation
- Original image dimensions preserved
- Display preferences stored in data attributes
- CSS-based transformations for performance
- No permanent image modifications

#### **OneDrive Integration**
Status: 🟡 Operational
Location: `src/lib/services/onedrive/`

##### Current Features
- Local config file for album mappings
- Basic folder structure integration
- Album path configuration
- Basic API integration

##### Current Issues
- API endpoint returning 500 errors
- Need to implement proper file system access
- Need to establish secure connection to OneDrive API





#### **Storage Strategy**
Status: 🟡 Operational
Location: `src/lib/services/storage/`

##### Current Features
- Firebase Storage integration
- Basic file upload
- Download URL generation
- File organization structure
- Basic error handling

##### Planned Features
- Storage optimization
  - Image compression
  - Format optimization
  - Lazy loading
- Cost management
  - Usage monitoring
  - Cost optimization
  - Storage quotas
- Cache strategy
  - CDN integration
  - Browser caching
  - Service worker caching
- Backup integration
  - Automatic backups
  - Version control
  - Recovery options
- Security
  - Access control
  - Encryption
  - Audit logging

[Back to Top](#myjournal-project)

## 7. Implementation Sequence

### Phase 1: Core Functionality
1. Authentication
   - [x] Basic email/password
   - [ ] Google auth
   - [ ] Enhanced security

2. Basic Storage
   - [x] Firebase Storage setup
   - [ ] Image upload
   - [ ] Basic optimization

3. Data Management
   - [x] Basic models
   - [ ] Enhanced validation
   - [ ] Relationships

### Phase 2: Media Integration
1. Image Processing
   - [ ] Basic upload
   - [ ] Thumbnails
   - [ ] Optimization

2. Photo Services
   - [ ] Google Photos setup
   - [ ] Basic integration
   - [ ] Album sync

### Phase 3: Enhanced Features
1. User Experience
   - [ ] Advanced navigation
   - [ ] Search improvements
   - [ ] Performance optimization

2. Content Management
   - [ ] Batch operations
   - [ ] Advanced filtering
   - [ ] Analytics

[Back to Top](#myjournal-project) 