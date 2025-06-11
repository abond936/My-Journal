# MyJournal Project

## Table of Contents
1. [Project Overview](#project-overview)
   - [Context](#context)
   - [Scope](#scope)
   - [Technical Stack](#technical-stack)
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

5. [Content Administration](#content-administration)
   - [Admin Navigation](#admin-navigation)
   - [Entry Management](#entry-management)
   - [Album Management](#album-management)
   - [Tag Management](#tag-management)
   - [Question Management](#question-management)
   - [Style Management](#style-management)   
   - [Theme Management](#theme-management)     


6. [Technical Infrastructure](#technical-infrastructure)
   - [Technical Stack](#technical-stack)
   - [Client-Server Architecture](#client-server-architecture)
   - [Authentication](#authentication)
     - [Firebase Auth](#firebase-auth)
     - [Session Mangement](#session-management)
     - [Role Management](#role-management)
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
     - [Storage Strategy](#storage-strategy)
     - [PhotoPicker](#photo-picker)
     - [Local Drive](#local-drive)   
     - [OneDrive](#onedrive)
     - [Google Photos](#google-photos)
     - [Apple Photos](#apple-photos)


[Back to Top](#myjournal-project)

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
- Both Entries and Albums are categorized by Tags into 5 dimensions:
  - who, what, when, where, and reflection
- Content is presented as cards in a grid for consumption

[Back to Top](#myjournal-project)

## Interaction Rules
======================================

### Core Principles
**Only Act With Approval**
   - MUST get explicit approval before ANY code change
   - MUST get explicit approval before ANY file creation
   - MUST get explicit approval before ANY file movement
   - MUST get explicit approval before ANY structural change
   - MUST get explicit approval before ANY naming decision
   - MUST get explicit approval before ANY configuration change
   - MUST get explicit approval before ANY dependency addition

**Always Search First**
   - MUST search entire codebase before proposing any change
   - MUST report ALL search results, even if seemingly irrelevant
   - MUST explicitly state if search returns no results
   - MUST ask for clarification if search results are unclear
   - MUST explain search scope and methodology

**Always Explain in Plain Terms**
   - MUST use layman's terms, not technical jargon
   - MUST explain the "why" before the "what"
   - MUST reference existing files and variables by name
   - MUST NOT include code snippets unless specifically requested
   - MUST explain implications and potential impacts

### Decision Making
**Never Assume**
   - MUST ask for clarification if there is ANY uncertainty
   - MUST ask for clarification if a rule seems ambiguous
   - MUST ask for clarification if a pattern seems inconsistent
   - MUST ask for guidance if multiple valid options exist
   - MUST state assumptions explicitly

**Never Proceed Without Understanding**
   - MUST ask for clarification if requirements are unclear
   - MUST ask for clarification if rules are unclear
   - MUST ask for clarification if implications are unclear
   - MUST ask for clarification if context is unclear
   - MUST confirm understanding before proceeding

3. **Never Make Unilateral Decisions**
   - MUST present options and recommendations with reasoning
   - MUST wait for explicit approval
   - MUST confirm understanding of approval
   - MUST explain any deviations from recommendations

### Communication Protocol
**Always Be Explicit**
   - MUST state intentions clearly
   - MUST state assumptions explicitly
   - MUST state limitations explicitly
   - MUST state potential issues explicitly
   - MUST state dependencies explicitly

**Always Be Proactive**
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
**Always Monitor**
   - MUST monitor compliance with rules
   - MUST monitor understanding
   - MUST monitor assumptions
   - MUST monitor decisions
   - MUST monitor implications

**Always Correct**
   - MUST correct mistakes immediately
   - MUST correct misunderstandings immediately
   - MUST correct assumptions immediately
   - MUST correct violations immediately
   - MUST explain corrections

**Always Learn**
   - MUST learn from mistakes
   - MUST learn from clarifications
   - MUST learn from corrections
   - MUST learn from feedback
   - MUST apply lessons learned

### Error Prevention
**Always Validate**
   - MUST validate file paths before operations
   - MUST validate dependencies before changes
   - MUST validate configurations before use
   - MUST validate assumptions before proceeding
   - MUST validate implications before acting

**Always Check**
   - MUST check for existing code before creating new code
   - MUST check for existing patterns before creating new patterns
   - MUST check for potential conflicts before making changes
   - MUST check for potential side effects before proceeding
   - MUST check for potential issues before acting

**Always Verify**
   - MUST verify understanding of requirements
   - MUST verify understanding of rules
   - MUST verify understanding of context
   - MUST verify understanding of implications
   - MUST verify understanding of approvals

**Don't Patronize**
   - Never patronize with compliments about ideas or actions.
   - Just answer the question or request toward the goal of the project.

[Back to Top](#myjournal-project)

## Development Rules

### Code Creation and Modification
1. **Pre-Action Requirements**
   - MUST search entire codebase before proposing any code changes
   - MUST report search results to user
   - MUST wait for explicit approval before any code action

2. **Proposal Format**
   - MUST explain changes in layman's terms
   - MUST specify file locations for creatio or modification of code
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
   
   src/
   ├── __tests__/   
   ├── app/                                              // Next.js app router
   │   ├── admin/                                        // admin area
   │   │   ├── album-admin/                              // album management
   │   │   |   ├── [id]/edit/
   |   |   |   |   ├── page.module.css   
   |   |   |   |   └── page.tsx                          // album edit, *needs work*
   │   │   |   ├── new/
   │   │   |   |   ├── NewAlbumPage.module.css
   │   │   |   |   └── page.tsx                          // album new, *needs work*
   |   │   |   ├── album-admin.module.css 
   |   |   │   ├── page.tsx                              // album management
   │   │   ├── entry-admin/                              // entry management
   │   │   |   ├── [id]/edit/
   |   |   |   |   ├── page.module.css    
   |   |   |   |   └── page.tsx                          // entry edit
   │   │   |   ├── new/
   │   │   |   |   ├── page.module.css
   │   │   |   |   └── page.tsx                          // entry new
   |   │   |   ├── album-admin.module.css  
   |   │   |   └── page.tsx                              // entry management
   |   |   |
   │   │   ├── tag-admin/                                // tag management, *needs work*
   │   │   |    ├── page.tsx 
   |   |   |    └── SortableTag.tsx                      // drag and drop
   |   |   |
   |   │   ├── AdminLayout.module.css     
   |   │   └── layout.tsx                                // Layout for admin, ViewLayout, AdminFAB 
   |   |
   │   ├── api/ 
   │   │   ├── albums/                                   // Data-access for Album content
   │   │   │   ├── [id]/
   │   │   │   |   └── route.ts                          // GET (one), PATCH, DELETE
   │   │   │   └── route.ts                              // GET (all), POST
   │   │   ├── entries/                                  // Data-access for Entry content (future)    
   │   │   │   ├── [id]/
   │   │   │   |   └── route.ts                          // GET (one), PATCH, DELETE
   |   │   │   └── route.ts                              // GET (all), POST
   │   │   ├── images/                                   // Data-access for the Photo Service Abstraction
   │   │   |   ├── local/
   │   │   |   |   ├── file/
   │   │   |   │   |   └── route.ts                      // GET folder structure
   │   │   |   |   ├── folder-contents/
   │   │   |   │   |   └── route.ts                      // POST to get folder contents
   │   │   |   |   └── folder-tree
   │   │   |   |       └── route.ts                      // GET to serve an image file
   │   │   |   ├── source-collections/                   // to be expanded
   │   │   |   |   └──  route.tx
   │   │   |   ├── uploads/                              // pasted/dragged media
   │   │   |   |   └──  route.tx
   │   │   └── tags/                                     // Data-access for Tag content
   │   │       ├── [id]/
   │   │       |   └── route.ts                          // GET (one), PATCH, DELETE
   |   │       └── route.ts                              // GET (all), POST
   |   |   
   │   ├── view/                                         // Public viewing area
   │   |   ├── album-view/[id]/                          // Album viewing, *needs work*
   │   |   |   └── page.tsx 
   |   |   |
   │   |   ├── entry-view/[id]/                          // Entry viewing, *needs work*
   │   |   |   └── page.tsx   
   |   |   |
   |   |   ├── layout.tsx                                // Primary content layout
   |   |   └── page.tsx                                  // Primary content page
   |   |
   │   ├── fonts.css
   │   ├── globals.css
   |   ├── layout.tsx                                     // Root tags, ThemeProvider, TagProvider
   |   ├── page.tsx                                       // Landing page (calls Home.tsx) Enter/Login
   |   └── theme.css 
   |
   ├── components/                                       // React components
   |   └── admin/
   │       ├── album-admin/
   │       │   ├── AlbumForm.module.css
   │       │   ├── AlbumForm.tsx
   │       │   ├── AlbumStyleSelector.module.css         // *needs work*
   │       |   ├── AlbumStyleSelector.tsx
   │       │   ├── PhotoManager.module.css               // *needs work*
   │       │   └── PhotoManager.tsx
   │       ├── entry-admin/
   |       │   ├── CoverPhotoContainer.module.css        // Move to common
   │       │   ├── CoverPhotoContainer.tsx               // Move to common
   │       │   ├── EntryForm.module.css
   │       │   └── EntryForm.tsx
   │       ├── AdminFAB.module.css                       // Rename AddButton, Move to common
   │       ├── AdminFAB.tsx                              // Rename AddButton, Move to common
   │       ├── AdminSidebar.module.css
   │       ├── AdminSidebar.tsx
   |       common/
   │       ├── FigureWithImageView.module.css            // used by TipTap
   │       ├── FigureWithImageView.tsx
   │       ├── Navigation.module.css                     // top navigation
   │       ├── Navigation.tsx
   │       ├── RichTextEditor.module.css                 // edit content with media
   │       ├── RichTextEditor.tsx
   │       ├── TagSelector.module.css                    // assign tags
   │       ├── TagSelector.tsx
   │       ├── TagTree.module.css                        // display tag tree
   │       ├── TagTree.tsx
   │       ├── ThemeProvider.tsx
   │       ├── ThemeToggle.module.css
   │       ├── ThemeToggle.tsx
   |       view/
   │       ├── album/
   │       |    ├── album-view/                          // View Album
   │       |    │   ├── AlbumLayout.module.css
   │       |    │   └── AlbumLayout.tsx
   │       |    ├── entry/                               // View Entry--Move to entry-view/, delete entry/
   │       |    │   ├── EntryLayout.module.css
   │       |    │   └── EntryLayout.tsx
   │       |    ├── entry-view/
   │       |    ├── CardGrid.module.css                  // grid layout
   │       |    ├── CardGrid.tsx
   │       |    ├── ContentCard.module.css               // content cards
   │       |    ├── ContentCard.tsx
   │       |    ├── ContentTypeFilter.module.css         // type filter, rename ContentFilter?
   │       |    ├── ContentTypeFilter.tsx
   │       |    ├── Home.module.css                      // homepage
   │       |    ├── Home.tsx
   │       |    ├── ViewLayout.module.css                // master view layout
   │       |    └── ViewLayout.tsx
   |       ├── PhotoPicker.module.css                    // Move to common/??
   |       ├── PhotoPicker.tsx
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
   - Follow the structure defined above
   - Place components in appropriate subdirectory based on function
   - Place shared components in common/ directory
   - Place component-specific types in lib/types/

### Naming Conventions
1. **File Naming**
   - Use kebab-case for folders and CSS files
   - Use PascalCase for React components
   - Use camelCase for:
     - Hooks
     - Utilities
     - Types
     - Services
     - Scripts
     - JavaScript variables
     - Function names

2. **Component Naming**
   - Use PascalCase for component files
   - Match component name with file name
   - Use .module.css for component styles

### Configuration and Environment
1. **Environment Variables**
   - Use .env for environment variables
   - Document required variables in script headers
   - Validate required variables before execution

2. **Firebase Configuration**
   - Use client SDK for browser operations
   - Use admin SDK for server operations
   - Use correct environment variables for each SDK

3. **Script Execution**
   - Use PowerShell for script execution
     ```powershell
     npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/<script-name>
     ```
   - Handle file operations sequentially, not in parallel
   - Validate file operations before proceeding
   - Use proper error handling for file operations
   - Log operation results

API Route Handler Rule
For any dynamic API route (e.g., in a folder named [id]), the handler functions (GET, PUT, POST, DELETE) MUST use NextRequest from next/server as the type for the first parameter. The params object is available on the second parameter.
Correct Implementation:
Apply to Project.md

### Code Documentation
1. **Code Comments**
   - Comment all code extensively explaining:

2. **Type Documentation**
   - MUST document:
     - Type purpose
     - Field meanings
     - Usage constraints

3. **CSS Rules**

   #### Core Principles
   - Use mobile-first philosophy
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

## Content Consumption
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

### **Layout**
---------------------------------
Status: 🟡 Operational

The core function of the application is the presentation and consumption of content--stories and images.
The vision is to make this best consumed on mobile and tablet devices and emulate a combination of
MSN, YouTube, Google, and other social media apps, with content presented and consumed through a 
a grid-based card system with infinite scroll.

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
- Card animation


- Card Types
   - Entry - Click to page, back
     - Story - 
     - Reflection
     - Q&A
     - Callout
     - Quote
   - Album - x/y, Horizontal Scroll, Click to Google-like gallery, Click to Carosel, back
   - Related


❓ Open Questions:

### **Entry View**
---------------------------------
Status: 🟡 Operational

Entry view contains title, cover image, tags, content.

#### Current Features
- Title
- Cover image
- Content
- Tags
- Back button

#### Planned Features
Function
- *Album links*
- *Related content*
- User interaction - Like, comment, sharelink

Styling
- *Emulate edit page for Story*
- Vary by Type
   - Story, Reflection, Q&A, Callout, Quote
- Vary by orientation
   - Landscape, Portrait
- Back button

❓ Open Questions:


### **Album View**
---------------------------------
Status: 🟡 Operational-barely

Album view contains a title, tags, caption and grid display of images.

#### Current Features
- Shell

#### Planned Features
- *Design Page*
   - Title, Caption
- *Photo grid display*
- Toggle caption display (mobile/tap, other/click)
- Toggle fill mode (fill/contain)
- *Entry links*
- User interaction - Like, comment, share
- *Selectable style*
- *Photo Carosel*

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
   - *MSN-style layout and theme*
- Fully Responsive
- Fully Customizable
   - Variable-based CSS
   - Theme Presets
   - Custom Theming
- Add to Admin

❓ Open Questions:

[Back to Top](#myjournal-project)


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
- Admin and New button for Author only

Styling



❓Open Questions:

### **Tag Filtering**
---------------------------------
Status: 🟡 Operational
Navigation is facilitated by heirarchical tag filtering. 

#### Current Features
- Tag hierarchy display
- Multi-select filtering
- Tag dimension organization
- Tag relationship visualization
- Number of entries (x/y)

#### Planned Features
Function
- Include number of entries/albums (x/y)
- Fix code to update count

Styling
- Slide in/out
- Left arrow

❓ Open Questions:
- Is there a way to navigate by Entry or Album?
- Multi-orderby?

### **Type Filtering**
---------------------------------
Status: 🟡 Operational

Content type based filter is a selector of Entries, Albums or Both (and type) to display in the card grid.

#### Current Features
- All, Entries, Albums

#### Planned Features
- Entry Types--Story, Reflection, Q&A, Callout, Quote

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

#### Current Features
- none

#### Planned Features
- *Basic text search - Top of content*

❓ Open Questions:

## **Content Administration**
=======================================
Status: 🟡 Operational

Administration is a feature only available to author.
   - CRUD/Bulk editing operations for app elements

#### Current Features
- Entries
- Albums
- Tags

#### Planned Features
- Questions
- Album page styles
- Themes
- Users

  ❓ Open Questions:

### **Admin Navigation**
---------------------------------
Status: 🟡 Operational

Sidebar to navigate between element lists.

#### Current Features
- Static Sidebar
- Basic navigation

#### Planned Features
Function

Styling 
- Title

❓ Open Questions:

### **Entry Management**
---------------------------------
Status: 🟡 Operational

#### Current Features
- Data model
  - story, reflection, qa, callout, quote
- Entry collection
- Entry listing
- Statistics
- Search and filtering
- Inline editing
- Bulk editing

#### Planned Features
Function
- *Inline/Bulk Tag assignment*
- Batch upload of tags

Styling

❓ Open Questions:


### **Entry New**
---------------------------------
Stautus: 🟡 Operational

#### Current Features
- Cover image - Metadata stored coverPhoto field
- Title
- Rich Text Editing
- Image embedding - Embedded figure/image element
- Draft/Published states
- Tag Assignment

#### Planned Features
Function

Styling

❓ Open Questions:

### **Entry Edit**
---------------------------------
Status: 🟡 Operational

#### Current Features
- Cover Image - Metadata stored coverPhoto field
- Title
- Rich Text Editing
- Image embedding
  - Photo Picker, pasted, or dragged.
- Image formatting 
   - Size, alignment, caption
- Tag Assigment

#### Planned Features
Function
- Aspect ratio control 
- Improved paste/drag-drop handling for multiple images.
- Image-specific metadata management (e.g., tags).
- Revisit cover image stored?
- Fill mode toggle (cover/contain)??

Styling

❓ Open Questions:

### **Album Management**
---------------------------------
Status: 🟡 Operational

An album is a virtual collection of images from one or more sources.

#### Current Features
- Data model
  - coverPhoto, title, description, caption, tags, photos
- Album collection
- Album listing
- Album creation
- Search and filter
- Inline/Bulk edit
- Photopicker
- Local photo service

#### Planned Features
Function
- Batch upload of photos to albums.
- Sync with sources on our schedule

Styling


❓Open Questions:
- How to handle single photos?
  - Miscellaneous/Other Album?

### **Album New and Edit**
---------------------------------
Status: 🟡 Operational

#### Current Features
- New album button/page
- Edit album button/page
- Cover image
- Add photos - Photopicker

#### Planned Features
Function
- *Tag assignment*
- *Manage Photos* - Add/Delete/Order/Orientation
- *Link to entries*
- Paginated or scrollable. 
- Captions togglable - Click/hover
- Select Style

Styling
- Grid-based/Masonry Gallery
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

#### Current Features
- Tag collection
- Tag listing
- Tag hierarchy management
- Tag ordering
- Tag relationships
- Tag cleanup
- Bulk edit
- Search and filter

#### Planned Features
Function
- *Drag and drop hierarchy*
- *Tag deletion/merging functionality*
- Cover image/icon
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
- Tagged?
- Grouped?

❓ Open Questions
- Do we want to track questions answered?
- Do we group short questions?

### **Style Management**
---------------------------------
Status: ⭕ Planned
Album styles are selectable styles for album pages


#### Current Features
- None

#### Planned Features
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

#### Current Features
- Light/Dark

#### Planned Features
- UI management

❓ Open Questions:
- What are the variables that need to be included/decided?

[Back to Top](#myjournal-project)

## **Technical Infrastructure**
=====================================

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
  - Next.js Image Optimizer

- Backend
- Firebase (Firestore, Authentication, Storage)
- Firebase Admin SDK for server-side operations

#### Planned Features
- AI Integration - OpenAI integration for content assistance
- Media Services
  - OneDrive 
  - Google Photos
  - Apple Photos

❓ Open Questions:

# **Client-Server Architecture**
=======================================
This project adheres to a strict client/server architecture so no server-only code (like database credentials or Node.js modules) is ever sent to the browser.

- Client components get data by calling internal API routes.
- API Routes use server-side services to interact with the database.

Implementation Constraints:

Client Code ('use client' files, hooks):
- MUST NOT import from src/lib/services/.
- MUST NOT import @/lib/config/firebase/admin.
- MUST fetch data via internal API routes (e.g., fetch('/api/...')).
Server Code (src/app/api/**):
- This is the ONLY location where modules from src/lib/services/ should be imported and used.


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
- How will the various authentications work?

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

#### **Image Strategy**
The Image Integration system serves as the bridge between the journal 
and external photo services, enabling users to seamlessly incorporate 
their existing photo collections into their journal entries. 

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

#### **Image Integration**
Status: 🟡 Operational

##### Current Features
- Service layer in place
- PhotoPicker integrated
- Photo metadata management
- Image optimization implemented

##### Planned Features
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

