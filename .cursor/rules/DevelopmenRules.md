


Development Rules

- Code is to be modular with self-contained components.

- Edit only specific code under consideration.
- Make only changes authorized to make 
  - Do not make changes to code outside the scope of the question/issue at hand.
    - For example, do not deleted comments, rename variables, or change any code not specifically related to the functionality at hand.
- Comment all code extensively in layman's terms
- Follow the directory structure below for creation of new code
  - Place new code in appropriate subdirectory based on function
  - Keep nesting shallow
  - If the location is unclear, stop, explain options and ask for clarification and approval
- Keep css modules with components

Before proposing any code or refactor, evaluate the following:
- Will this change affect existing data flow, contracts, or modules?
- Does this align with our architectural rules and tech stack?
- Are there downstream implications for other components, tests, or deployment?

- Explain the change and impact on current logic and file structure

### Directory Structure
   
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
   |   |   |   |
   |   │   |   ├── album-admin.module.css                // album management
   |   |   │   └── page.tsx                              
   |   |   |   
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
   │   │   ├── auth/[...nextauth]/    
   │   │   │   └── route.ts
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
   |       |   ├── AlbumStyleSelector.tsx
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
   |       ├── PhotoPicker.module.css 
   |       ├── PhotoPicker.tsx
   │       ├── RichTextEditor.module.css                 // edit content with media
   │       ├── RichTextEditor.tsx
   │       ├── TagSelector.module.css                    // assign tags
   │       ├── TagSelector.tsx
   │       ├── TagTree.module.css                        // display tag tree
   │       ├── TagTree.tsx
   │       ├── ThemeProvider.tsx
   │       ├── ThemeToggle.module.css
   │       ├── ThemeToggle.tsx
   |       providers/                                    // context providers
   │       ├── AuthProviders.tsx
   │       ├── FiltersProvider.tsx
   │       ├── TagProvider.tsx
   │       ├── ThemeProvider.tsx 
   |       view/
   │       ├── album/
   │       |    ├── album-view/                          // view Album
   │       |    │   ├── AlbumLayout.module.css
   │       |    │   └── AlbumLayout.tsx
   │       |    ├── entry/                               // view Entry--Move to entry-view/, delete entry/
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
   |
   ├── data/ 
   │   ├── migration/     
   └── lib/                 # Shared resources
       ├── config/          # Configuration
       ├── firebase/        # Firebase setup
       ├── hooks/           # Custom hooks
       ├── scripts/         # Utility scripts
       ├── services/        # Business logic
       ├── tiptap/          # TipTap setup
       ├── tools/           # Tools              
       ├── types/           # TypeScript types
       └── utils/           # Utility functions
   ```

### Naming Conventions
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
- Use .module.css for component styles

**Environment Variables**
- Use .env for environment variables
- Document required variables in script headers
- Validate required variables before execution

**Firebase Configuration**
- Use client SDK for browser operations
- Use admin SDK for server operations
- Use correct environment variables for each SDK

**Script Execution**
- Use PowerShell for script execution
  ```powershell
  npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/<script-name>
  ```
- Handle file operations sequentially, not in parallel
- Validate file operations before proceeding
- Use proper error handling for file operations
- Log operation results

**CSS**

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

- Image Sizes
  - Small: `width: min(200px, 30vw)`
  - Medium: `width: min(400px, 50vw)`
  - Large: `width: min(600px, 70vw)`

- Container Sizing
  - Use `min()` for maximum width constraints
  - Allow fluid scaling within bounds
  - Example: `width: min(100%, 1200px)`

- Spacing
  - Use `clamp()` for fluid margins and padding
  - Scale with viewport: `clamp(min, preferred, max)`
  - Example: `margin: clamp(1rem, 3vw, 1.5rem)`

- Typography
      - Implement fluid typography with `clamp()`
      - Maintain readability at all sizes
      - Example: `font-size: clamp(1rem, 2vw, 1.125rem)`

- Transitions
  - Add smooth transitions for size changes
    - Example: `transition: width 0.3s ease, margin 0.3s ease`

- Breakpoints
  - Only for fundamental layout changes
  - When switching from multi-column to single-column
  - When changing float behavior

- Fluid Sizing**
  - For all size-related properties
  - For spacing and margins
  - For typography
  - For image dimensions

- Performance Considerations
  - Minimize number of media queries
  - Use efficient CSS properties
  - Consider using CSS custom properties for common values
