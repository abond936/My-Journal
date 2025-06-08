# MyJournal Project

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
     - [Content View](#content-view)   
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
   - [Style Management](#style-management)   
   - [Theme Management](#theme-management)     
   - [Admin Navigation](#admin-navigation)

6. [Technical Infrastructure](#technical-infrastructure)
   - [Technical Stack](#technical-stack)
     - [Frontend](#frontend)
     - [Backend](#backend)
     - [AI Integration](#ai-integration)
     - [Media Services](#media-services)
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
     - [Image Strategy](#image-strategy)
     - [Local Drive](#local-drive-photos)   
     - [OneDrive](#onedrive-photos)
     - [Google Photos](#google-photos)
     - [Apple Photos](#apple-photos)
     - [Storage Strategy](#storage-strategy)

7. [Implementation Sequence](#implementation-sequence)
   - [Phase 1: Core Functionality](#phase-1-core-functionality)
   - [Phase 2: Media Integration](#phase-2-media-integration)
   - [Phase 3: Enhanced Features](#phase-3-enhanced-features)

[Back to Top](#myjournal-project)

## Project Overview

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
- An entry is a primarily textual, but also visual unit
  - Cover image
  - Title
  - Rich Text and embeded images.
- An album is a primarily visual, but also textual unit
  - Cover image
  - Title
  - Caption
  - Collections of images
- Entries can be linked to albums and albums can be linked to entries
- Both Entries and Albums are categorized into 5 dimensions:
  - who, what, when, where, and reflection
  - present as cards in a grid for consumption

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
   ├── __tests__/   
   ├── app/                      # Next.js app router
   │   ├── admin/                # Admin area
   │   │   ├── album-admin/      # Album management
   │   │   |   ├── [id]/edit/
   |   |   |   |   ├── page.module.tsx   
   |   |   |   |   └── page.tsx     
   │   │   |   ├── new/
   │   │   |   |   ├── NewAlbumPage.module.css
   │   │   |   |   └── page.tsx 
   |   │   |   ├── album-admin.module.css 
   |   |   │   ├── page.tsx 
   │   │   ├── entry-admin/      # Entry management
   │   │   |   ├── [id]/edit/
   |   |   |   |   ├── page.module.css    
   |   |   |   |   └── page.tsx     
   │   │   |   ├── new/
   │   │   |   |   ├── page.module.css
   │   │   |   |   └── page.tsx 
   |   │   |   ├── album-admin.module.css  
   |   │   |   └── page.tsx   
   │   │   ├── tag-admin/         # Tag management
   │   │   |    └── page.tsx 
   |   │   └── AdminLayout.module.css     
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
   │       ├── album-view/[id]/     # Album viewing
   │       |   └── page.tsx 
   │       ├── AlbumView/module.css
   |       |
   │       ├── entry-view/[id]/     # Entry viewing
   │       |   └── page.tsx   
   |       ├── EntryList.module.css 
   |       ├── layout.tsx 
   |       └── page.tsx       
   ├── components/          # React components
   │   ├── admin/           # Admin components
   │   ├── common/          # Shared components
   │   └── view/            # View components
   ├── data/ 
   │   ├── migration/     
   └── lib/                 # Shared resources
       ├── config/          # Configuration
       ├── contexts/        # React contexts
       ├── extensions/      # Extensions
       ├── firebase/        # Firebase setup
       ├── hooks/           # Custom hooks
       ├── mocks/           # Mock data
       ├── scripts/         # Utility scripts
       ├── services/        # Business logic
       ├── tiptap/          # TipTap setup
       ├── tools/           # Tools              
       ├── types/           # TypeScript types
       └── utils/           # Utility functions
   ```

2. **Component Organization**
   - MUST follow the structure defined above
   - MUST place components in appropriate subdirectory based on function
   - MUST NOT mix function-based and feature-based organization
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
=========================

Legend:
- ✅ Implemented
- 🟡 Operational
- ⭕ Planned
- ❓ Open Question

### **Home Page**
---------------------------------
Status: 🟡 Operational

#### Current Features
- Images
- Welcome message
- Enter button

#### Planned Features
- Login (email/password) to replace Enter button

❓ Open Questions:

### **Content Consumption**
---------------------------------
Status: 🟡 Operational

Content will be consumed through a grid-based card system.
   - Cover image
   - Title
   - Tags

#### Current Features
- Basic card layout connected to Entries only

#### Planned Features
- Connected to Tags, Albums and Entries
  - Each dimension and tag requires a card
    - Image, Name, Entries/Albums
- Improved styling 
  - Multi-sized cards
    - Card height and width ratios of each other to facilitate grid structure
  - Varying styling
    - Titles, Tags, Excerpts overlaid/non-overlaid

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
- 
- Improve styling
   - Increase logo size
   - Increase vertical size to fit logo
   - Bottom-align links?

❓Open Questions:
- What do we want on top navigation?
  - Must have Admin for Author.
  - Entries/Albums?
    - Remove and move into content page as tabs for filtering
      - All, Entries, Albums
  - Remove New Entry, Add New Album?
   - quick access for author as browsing

### **Card-based Navigation**
---------------------------------
Status: ⭕ Planned

Card-based navigation means starting with Tag cards of the 5 dimensions and drilling through 
the tag heirarchy until reaching a level of Entries or Albums. Need to rationalize this
and see if it makes practical sense.

Current grid system only fed by Entries. Not sure if current grid can be expanded or a new one created.

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

❓ Open Questions:


### **Tag-based Navigation**
---------------------------------
Status: 🟡 Operational
Tag navigation is a heirarchical tag tree selection to filter entry and album cards. This would be on 
a slide sidebar with 3 tabs--Tags, Entries, Albums

#### Current Features
- Tag hierarchy display
- Multi-select filtering
- Tag dimension organization
- Tag relationship visualization
- Number of entries (15/?)

#### Planned Features
- Number of albums (15/21)
- Styling
- Advanced tag filtering
- Tag search
- Tag analytics
- Tag suggestions

❓ Open Questions:


### **Element-based Filter**
---------------------------------
Status: ⭕ Planned
Element-base filter is a selector of Entries, Albums or Both to display in the card grid.

#### Current Features
- none

#### Planned Features
- Tab-selector across the top or radio buttons on the navigation sidebar.

❓Open Questions:
- How would we order Entries and Albums?
  - Would we do it by tag selection? 
  - Order by Tag, show Albums then Entries?
  - Order by Tag, show Entries, by Albums?
  - One complicated nested tree structure?
    - Possible/Advisable?

### **Search & Filter**
---------------------------------
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

❓ Open Questions:

### **Content Presentation**
=================================

### **Entry View**
---------------------------------
Status: 🟡 Operational

Entry view contains title, cover image, tags, content.

(This is currently card view. May not be needed explcitly and will become "content view".)

#### Current Features
- Rich text display
- Media embedding
- Related content
- Tag context

#### Planned Features
- User interaction
   - Like, comment, sharelink

❓ Open Questions:


### **Album View**
---------------------------------
Status: ⭕ Planned

Album view contains a title, tags, caption and grid display of images.

#### Current Features
none

#### Planned Features
- Title
- Caption
- Photo grid display
- Toggle caption display (mobile/tap, other/click)
- Toggle fill mode (fill/contain)
- Entry links
- User interaction
   - Like, comment, sharelink
- Styled like a photo album or scrapbook 
   - Library of styles selectable by album
   - Selectable sytles by album
      - Background,color scheme, font

❓ Open Questions:


### **UI Components**
==============================

### **Layout System**
---------------------------------
Status: 🟡 Operational

The layout straegy is to be fully mobile first and responsive upward.

#### Current Features
- Grid/Card layout
- Partially responsive design

#### Planned Features
- Tablet optimization
- Custom layout builder ??

❓ Open Questions:

#### **Theme System**
---------------------------------
Status: 🟡 Operational

##### Current Features
- Light/Dark theme
- Fixed Schemes
- Limited styling throughout

##### Planned Features
- Fully styled
   - MSN-style layout and theme
- Fully Responsive
- Fully Customizable
   - Variable-based CSS
   - Theme Presets
   - Custom Theming

❓ Open Questions:


[Back to Top](#myjournal-project)

## **Content Administration**
=======================================
Administration is a feature only available to author.
   - CRUD/Bulk editing operations for appl elements

#### Current Features
  - Entries
  - Albums
  - Tags

#### Planned Features
  - Questions
  - Album page styles
  - Themes
  - Role-based access

  ❓ Open Questions:

### **Admin Navigation**
---------------------------------
Status: 🟡 Operational

- Sidebar to navigate between element lists.

#### Current Features
- Static Sidebar
- Basic navigation

#### Planned Features
- Improve styling 

❓ Open Questions:

### **Entry Management**
---------------------------------
Status: 🟡 Operational

#### Current Features
- Data model
- Entry collection
- Entry listing
- Statistics
- Search and filtering
- Inline edit
- Bulk edit

#### Planned Features
- Inline/Bulk Tag assignment
- Improved styling
- Export functionality ??
- Analytics dashboard ??

❓ Open Questions:

### **Entry Creation**
---------------------------------
Stautus: 🟡 Operational

#### Current Features
- Title
- Rich Text Editing
- Tag Assignment
- Cover image - Metadata stored coverPhoto field
- Image embedding - Embedded figure/image element
- Draft/Published states

#### Planned Features
- Improved styling

❓ Open Questions:

### **Entry Edit**
---------------------------------
Status: 🟡 Operational

#### Current Features
- Cover Image - Metadata stored coverPhoto field
- Title
- Rich Text Editing
- Tag Assigment
- Image embedding - Embedded figure/image element
  - Photo Picker, pasted, or dragged.
- Image formatting 
   - Size, alignment, caption

#### Planned Features
- Aspect ratio control 
- Improved paste/drag-drop handling for multiple images.
- Image-specific metadata management (e.g., tags).
- Revisit cover image stored?
- Fill mode toggle (cover/contain)??

❓ Open Questions:

### **Album Management**
---------------------------------
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
 - Captions togglable
   - Click/hover
      - Links to the 'entries' to which they are associated.
         - Assignment can be done either from the album view,
            - potentially even in the admin album view. 

Album Structure:
- Virtual albums independent of sources
- Can combine photos from multiple services
- Maintains own metadata and relationships
- Syncs with sources on our schedule
            
#### Current Features
- Album collection
- Data model extended for sources
- Album Listing (table)
- Album creation
- Album editing
- Search and filter
- Inline edit
- Bulk edit
- Server-side API connected
- Photopicker connected
- Photo service connected

#### Planned Features
- Fix Photopicker
- Album edit template
- Media analytics ??
- Batch upload of photos to albums.

❓Open Questions:


### **Album Creation**
---------------------------------
Status: ⭕ Planned

#### Current Features
- New album button
- New album page
   - Title
   - Description
   - Caption

#### Planned Features
- Add cover image
- Image selection
- Tag assignment

❓ Open Questions:


### **Album Edit**
---------------------------------
Status: ⭕ Planned

####Current Features
- Inline Album Admin only

#### Planned Features
- Separate page
  - Cover Image (similar to New)
  - Title
  - Caption
  - Photopicker
  - Tag assignment

❓ Open Questions:


### **Tag Management**
---------------------------------
Status: 🟡 Operational

- Tags are managed (added, edited, deleted) from the admin page.
- No need for separate pages

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
- Tag deletion/merging functionality
- Styling improvements
- Cover image
- Tag analytics ??
- Tag suggestions ??
- Tag history ??

❓ Open Questions
- How to deal with edited/deleted tags?
- Feed tags back to photo metadata?

### **Question Management**
---------------------------------
Status: ⭕ Planned

- Questions are prompts for stories

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
- Do we group short questions

### **Style Management**
---------------------------------
Album styles are selectable styles for album pages
   - Background
   - 

  #### Current Features
  - None

  #### Planned Features
  - Preconfigured page styles for selection
  - Specifically selected style components
    - Background, Font, Color scheme, etc.

❓ Open Questions:


### **Theme Management**
----------------------------------
Themes (color, fonts, boxes, spacing, padding, etc.) can be managed centrally outside the code.

  #### Current Features
  - Light/Dark
  #### Planned Features
  - UI management

❓ Open Questions:


[Back to Top](#myjournal-project)

## **Technical Infrastructure**
=====================================

Development Notes:
Next: Complete Firebase configuration
Depends on: None
Notes: Ensure all environment variables are properly set up

### **Technical Stack**
----------------------------------
Status: 🟡 Operational

#### Current Features
- Frontend
   - Next.js 15.3.2
   - React 19
   - TypeScript
   - Native CSS
   - TipTap for rich text editing
   - PhotoPicker for 
   - Framer Motion for animations

- Backend
- Firebase (Firestore, Authentication, Storage)
- Firebase Admin SDK for server-side operations

#### Planned Features
- AI Integration
   - OpenAI integration for content assistance
- Media Services
  - OneDrive 
  - Google Photos
  - Apple Photos

❓ Open Questions:

### **Authentication**
===========================================
Status: 🟡 Operational

- Overall Strategy
  - Decouple application login from photo service connections to support multiple providers.
  - Centralize security logic in the Next.js backend, not in client-side code or complex database rules.
- Primary Identity Provider
  - Manages user login for the application itself (e.g., email/password, social sign-in).
  - This is where user roles ('admin', 'viewer') are defined and managed.
  - A library like `lucia-auth` or a simple provider will be used.
- Connected Accounts (for Photo Services)
  - The logged-in admin user can connect to photo services (OneDrive, Google Photos) on a settings page.
  - Each connection uses a standard OAuth 2.0 flow.
  - Securely stored tokens are used by the backend to fetch photos on the user's behalf.
- Firebase for Data Access
  - The `firebase-admin` SDK will be used on the server-side for database operations.
  - It is NOT used for user sign-in.
  - Access is controlled via our own API routes, which check the user's role before interacting with Firestore.
- Role-Based Access Control (RBAC)
  - Handled by the primary identity provider.
  - Server-side API routes will verify user's role (`admin` or `viewer`) before allowing access to resources.

❓ Open Questions:
- How with the various authentications work?

#### **Firebase Auth**
--------------------------------------
Status: 🟡 Operational

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

❓ Open Questions:
- How has this changed with architecture change?

#### **Session Management**
---------------------------------------
Status: ⭕ Planned

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

❓ Open Questions:
- What is this?

#### **Role Management**
------------------------------------------
Status: ⭕ Planned

##### Current Features
- Basic role definition in User interface ??

##### Planned Features
- Role definitions
- Permission management
- Access control
- Role assignment
- Role validation
- Role hierarchy
- Role analytics
- Role templates

❓ Open Questions:


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
Status: 🟡 Operational

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
====================================================================================================

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

To manage photos effectively and support multiple external services, the system architecture is built around two distinct data models:

*   **Album:** An **Album** is a curated collection of photos and content that is part of the journal itself. It is the primary way users will view grouped photos within the application. Each Album has its own metadata (title, caption, tags) and a specific list of photos selected by the author. Albums are stored in the project's Firestore database and managed via the `/api/albums` endpoint.

*   **Source Collection:** A **Source Collection** is a generic representation of a grouping of photos from an external service. This could be a **folder** (from the local drive or OneDrive) or an **album** (from Google Photos or Apple Photos). Source Collections are used to populate the `PhotoPicker` component, allowing the administrator to browse and select images from their original location. They are read-only and are fetched via the `/api/photos/source-collections` endpoint. This abstraction allows the UI to remain consistent while the backend handles the unique details of each photo service.

Key Design Principles:
- Abstracted Service Layer
  - A generic "photo service" interface will be used in the application.
  - Support multiple photo sources with a unified interface
   -Local, OneDrive, Google Photos without changing UI components.
- Strict Client-Server Separation
  - Client components (e.g., `PhotoPicker`) are for UI only.
  - They make requests to internal API routes (e.g., `/api/photos/list`).
  - The server-side API route contains the logic to talk to the actual photo source, preventing leaking keys or using server-only modules (`fs`) on the client.
- Photos remain in their original source (OneDrive, etc.).
  - Firestore will only store metadata, references, thumbnails, not binary image data.  
- Optimize image processing
  - Implement efficient caching for frequently accessed content
  - Next.js Image Optimization to serve efficient, web-friendly images.
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
  - Portrait images handled in two ways:
    - Smart cropping: AI-powered detection of important content areas to guide cropping
    - Blurred background: Portrait images displayed on blurred, stretched version of same image

❓ Open Questions:
- Why do we need two different metadata models: one for browsing (AlbumPhotoMetadata) and one for usage (PhotoMetadata)?

#### **Image Integration**
Status: 🟡 Operational

##### Current Features
- PhotoPicker for selecting photos
- Integrated with Entry and Album new and edit.
- Entry/Album data models updated.
- Photo metadata management

##### Planned Features
- Image optimization ?
- Thumbnail generation ?
- Format conversion ?
- Metadata extraction ?

❓ Open Questions

#### **Storage Strategy**
-------------------------------------------------
Status: 🟡 Operational

Storage Strategy:
- Originals stay in source services
- Store thumbnails (~20KB each)
- Store previews (~100KB each)
- Maintain metadata in Firestore
- Estimated storage: ~4% of original size

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

❓ Open Questions:


### **Photopicker**
--------------------------------------------------------------
Status: 🟡 Operational

Photopicker for selecting and assigning photos to entries and albums.

  #### Current Features
   - Photopicker component integrated with
      - Entry new and edit
      - Album new
   - Access to folder structure

  #### Planned Features
  - Fix current error of not returning images that are present
  - Collapsible/Expandable Tree structure
  - singleSelect, multiSelect
  - Integrate with Album edit

  ❓ Open Questions:


#### **Local Drive Integration** 
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
  - Fix current error of not returning images that are present
  - Limit integration due to limitations
   
❓ Open Questions:

#### **OneDrive Integration**
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


#### **Google Photos Integration**
----------------------------------------------------
Status: ⭕ Planned

##### Current Features
- None

##### Planned Features
- Integration API

❓ Open Questions:


#### **Apple Photos Integration**
----------------------------------------------------
Status: ⭕ Planned

##### Current Features
- None

##### Planned Features
- Integration API

❓ Open Questions:


[Back to Top](#myjournal-project)

