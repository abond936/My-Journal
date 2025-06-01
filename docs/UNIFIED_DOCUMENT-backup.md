# My Journal - Unified Project Documentation

## Table of Contents
1. Project Vision
2. Core Application Features
3. Supporting Systems
4. Technical Infrastructure
5. Development Workflow

# Interaction Rules

## 1. Clarify First
- When asked about appropriateness or correctness, first confirm what aspect is being asked about
- Never assume understanding of the full context of a question
- Ask for clarification if the request is ambiguous

## 2. Preserve by Default
- Never suggest removing content without explicit request
- If something should be changed, explain why and wait for confirmation
- Treat existing content as intentional unless clearly stated otherwise

## 3. Small Steps
- Make one change at a time
- Wait for approval before proceeding
- Never make sweeping changes without explicit direction
- Break down complex changes into manageable steps

## 4. Be Explicit
- State what is being planned
- Explain reasoning behind suggestions
- Ask for confirmation before acting
- Be clear about potential implications

## 5. Ask Questions
- Ask for clarification when unsure about a request
- Bring up potential issues before acting
- Request additional context when needed
- Confirm understanding before proceeding 
# Project Vision Alignment

## 1. Vision
- Personal journaling application
- Preserve and share life stories
- Integrates stories with media
- Share with family
- Users are authors and family/friends
- Easy to use, immersive experience.

# My Journal Application Architecture

## CRITICAL RULES

### Rule 1: Always Check Existing Resources
- ALWAYS check for existing files, directories, and documentation BEFORE creating new ones
- NEVER create duplicate files or documentation
- ALWAYS search the codebase for existing implementations before adding new ones
- ALWAYS check the Architecture.mdc for existing definitions and patterns

### Rule 2: Architecture-Driven Development
- EVERY change MUST be supported by and documented in Architecture.mdc
- NO new components, types, or services should be created without first being defined in Architecture.mdc
- Architecture.mdc MUST be updated whenever changes are made to the codebase
- ALL development decisions must align with the architecture defined in Architecture.mdc

## 1. Project Overview
My Journal is a personal journaling application that helps users document and share their life stories and reflections, illustrated with their photos and media from photo services or cloud storage, like Google, Apple, and Amazon, or local storage.

- **Scope**: 
  - Text entry creation and management
  - Photo and media integration
  - Heirarchical tag-based organization
  - Family sharing and interaction
  - AI-assisted content creation and organization

- **Technical Stack**:
  - Frontend: Next.js 14, React, native CSS
  - Backend: Firebase (Firestore, Authentication, Storage)
  - Media: Google Photos API (primary), with future support for others
  - AI: OpenAI integration for content assistance
  - Hosting: Netlify 
  - Version Control: GitHub


## 2.0 Core Application Features

### 2.1 Entry Management System 
Status: 🚧 In Progress
Description: Core system for managing journal entries
Vision: Create a seamless experience for capturing and organizing life's stories
  - Rich text editing capabilities
  - Support for multiple content sections
  - Media integration within entries
  - Add tags
  - Auto-save/draft management
  - No revision history (simplified approach)
  - AI - Content Assistance
    - Writing suggestions w/ Acceptance/Rejection
    - Tag recommendations
  - Three Entry Types
    - Story-focused -- Question/Answer or Story
    - Reflection-focused -- Lesson, Advice 

#### 2.1.1 Components
- Entry creation interface
- Entry editing
- Entry deletion
- Entry listing
- Entry search
- Entry organization

#### 2.1.2 Data Model
```typescript
interface Entry {
  `id`: string;
  `title`: string;
  `content`: string;
  `date`: Date;
  `tags`: string[];
  `createdAt`: Date;
  `updatedAt`: Date;
  `status`: 'draft' | 'published';                // 📅 Planned
  `author`: string;                               // 📅 Planned ??
  `media`: string[];                              // 📅 Planned
  'visibility': 'private' | 'family' | 'public';  // 📅 Planned
}
```
#### 2.1.3 Logic Flow
1. User initiates entry creation (`app/edit/page.tsx`)
2. Entry editor loads (`components/features/entry/EntryEditor.tsx`)
3. Content is edited and saved
4. Data is validated (`lib/validation.ts`)
5. Entry is stored (`lib/firestore.ts`)
6. UI is updated via real-time listener (`lib/hooks/useEntry.ts`)

#### 2.1.4 Data Flow
1. Create/update entry
2. Process content
3. Update tags
4. Handle media
5. Update search index

#### 2.1.5 Real-time Updates
1. Lsteners are set up (`lib/hooks/useEntry.ts`)
2. Data changes are detected
3. Component state is updated
4. UI is re-rendered
5. Changes are persisted

#### 2.1.6 Features
- ✅ Basic entry creation
- ✅ Entry editing
- ✅ Entry deletion
- ✅ Entry listing
- ✅ Entry search
- 📅 Rich text editing
- 📅 Media integration
- 📅 Location tagging
- 📅 Mood tracking
- 📅 Privacy controls

#### 2.1.7. Open Questions
- Do we have to manage photo metatdata?
- Author would only be needed if we allowed users to create stories/reflections.
- Move About to dedicated page to avoid type issues.

### 2.2. Tag Management
Status: 🚧 In Progress
Description: Hierarchical tagging system with dimensions
Vision: Enable intuitive organization and discovery of stories through multi-dimensional heirarchical tagging
  - Multi-dimensional tagging system
  - Who, What, When, Where dimensions
  - Entry counts
  - AI-assisted tag suggestions
  - Tag validation
  - Inheritance system
  - Life stage association
  - Customizable stages
  - Non-overlapping periods
  - Date-based assignment
  - Custom organization
  - Non-overlapping life stages
  - Strict date-based assignment
  - Heirarchical relationship mapping

#### 2.2.1 Components
- Tag creation interface
- Tag editing
- Tag deletion
- Tag hierarchy display

#### 2.2.2. Category Components
1. **Category Tree**
   - Create `TagTree.tsx`
   - Implement hierarchical display
   - Handle expansion/collapse
   - Show entry counts

2. **Category View**
   - Create `Tag.tsx`
   - Display category content
   - Show related stories
   - Handle navigation

#### 2.2.3 Data Model
```typescript
interface Tag {
  `id`: string;
  `name`: string;
  `dimension`: 'about' | 'who' | 'what' | 'when' | 'where';
  `parentId`: string | null;
  `order`: number;
  'isReflection`: boolean;
  `createdAt`: Date;
  `updatedAt`: Date;
  `path`: string[];           // 📅 For hierarchical queries
  `entryCount`: number;       // 📅 For analytics
  `description`: string;      // 📅 For better organization
  `color`: string;            // 📅 For visual distinction
}
```

#### 2.2.4. Data Flow
- Create/update tag
- Update parent-child relationships-
- Update entry references
- Refresh tag tree

#### 2.2.4. Features
- ✅ Basic tag creation
- ✅ Tag editing
- ✅ Tag deletion
- ✅ Dimension organization
- 📅 Tag inheritance
- 📅 Tag analytics
- 📅 Bulk tag operations
- 📅 Tag suggestions
- 📅 Tag merging
- 📅 Tag import/export

#### 2.2.5. Open Questions
LifeStage: Is there a better way to handle this?
About: Is there a better way to handle this?
IsReflection? How do we best handle reflection tags?


### 2.3. Question System
Status: Planned
Vision: Database of questions categorized by tag to prompt stories and reflections.
- Standard question library
- Custom questions per author
- Question categorization
- Answer tracking
- Tag association



### 2.4. Media System
Status: 📅 Planned
Vision: Seamlessly integrate photos and videos to enrich stories
  - Primary integration with Google Photos
  - Secondary support for Apple Photos
  - Local storage options
  - Cloud storage backup
  - Progressive loading for performance
  - Lazy loading for media content
  - Access to image 
  - Access to metadata
  - Access to albums
  ### 2.4.1. Media Types
- Add Audio
- Add Video
Description: Photo and video management system

#### 2.4.2. Image Management
Status: 📅 Planned
Vision: Make it easy to add and organize photos with stories
- - **Google Photos Integration**
  - OAuth2 authentication
  - Album synchronization
  - Photo selection
  - Metadata import
  - Update tracking

- **Media Optimization**
  - Image compression
  - Format conversion
  - Lazy loading
  - Progressive loading
  - Cache management
- Additional photo services
Components:
- Image upload interface
- Image gallery
- Image editor

#### 2.4.3. Data Model
```typescript
interface Media {
  // Planned Properties
  id: string;
  url: string;
  type: 'image' | 'video';
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
    takenAt: Date;
  };
  caption: string;
  order: number;
  entryId: string;
  tags: string[];
  source: 'local' | 'google-photos' | 'cloud';
  createdAt: Date;
  updatedAt: Date;
}
```
#### 2.4.4. Open Questions
- what type of media storage needs do we have?
    - application
    - content
- Do we need to store content or can we rely on Google?
- Can we manage metadata in photos as opposed to locally.

#### 2.4.5. Media Integration Flow
1. User selects media (`components/features/media/MediaGallery.tsx`)
2. Media is processed (`services/googlePhotos.ts`)
3. Media is stored (`lib/storage.ts`)
4. Media metadata is updated (`lib/firestore.ts`)
5. UI is updated with new media (`components/features/entry/EntryContent.tsx`)

#### 2.4.6. Data Flow
1. Upload/select image
2. Process and optimize
3. Store metadata
4. Update entry references

#### 2.4.7. Media Synchronization
1. Google Photos API is called (`services/googlePhotos.ts`)
2. Photos are downloaded
3. Metadata is extracted
4. Data is stored in Firestore
5. UI is updated with new media

#### 2.4.8. Features
- 📅 Basic image upload
- 📅 Google Photos integration
- 📅 Image optimization
- 📅 Gallery management
- 📅 Image editing
- 📅 Bulk operations
- 📅 Image search
- 📅 Face detection
- 📅 Location tagging

### 3. Layouts/User Interaction
#### 3.1. Layouts/User Interaction
**Reading Experience**
  - Family Member Read-only
  - Multiple layout options:
    - Blog style
    - Magazine style
    - Timeline view
    - Card layout
    - Accordion view
  - Responsive design
  - Mobile-first approach
  - Sub-2 second load times

#### 3.1.1. View Options
- Blog Layout
  - Traditional blog format
  - Featured images
  - Tag display
  - Related entries

- Magazine Layout
  - Grid-based design
  - Featured content
  - Visual hierarchy
  - Media integration

- Timeline Layout
  - Chronological view
  - Life stage markers
  - Media thumbnails
  - Date-based navigation

- Card Layout
  - Grid of entry cards
  - Visual preview
  - Quick navigation
  - Tag grouping

- Accordion Layout
  - Expandable sections
  - Tag grouping
  - Quick preview
  - Space-efficient
- **Social Features**
  - Like functionality
  - Comment capability
  - No sharing features
  - No content creation for family users
  - Story of the Day/Week/Month feature

#### 3.2. Core Components Development

##### 3.2.1. Layout Components
1. **Main Layout**
   - Create `Layout.tsx`
   - Implement responsive design
   - Add theme support
   - Include navigation

2. **Content Wrapper**
   - Create `ContentWrapper.tsx`
   - Handle sidebar toggle
   - Manage content width
   - Implement responsive behavior

##### 3.2.2. Story Components
1. **Story Card**
   - Create `StoryCard.tsx`
   - Display story preview
   - Show metadata
   - Handle click events

2. **Story Editor**
   - Create `StoryEditor.tsx`
   - Implement rich text editing
   - Add media upload
   - Handle auto-save
   - Manage drafts

3. **Story View**
   - Create `StoryView.tsx`
   - Display story content
   - Show media gallery
   - Handle layout options
   - Implement social features

##### 3.2.3. Open Questions
Layouts - None of the layouts are discussed.
What is the difference between index, layout and page in the root directory?
States - What if any state issues do we have to be aware of in this app?
What are error boundaries?

#### 3.3. Story of the Day
Status: Planned
Vision: User opt-in to Story of the Day.
- User Opt-in in profile
- Algorithmic selection from unviewed stories by user
- Avoids recently viewed stories
- Tracks viewed stories in user profile
- Option to reset viewing history

#### 3.4. Navigation
Status:
Vision: Intuitive easy navigation from anywhere
- Top navigation
- Left navigation
- Tab filterings
- Intra-content navigation?
- Responsive navigation
- Add Breadcrumbs

##### 3.4.1. Navigation Integration
- Context-aware navigation ??
- Breadcrumb trails
- Tag navigation
- Related content
- Search integration
- URL synchronization

##### 3.4.2. Navigation System

###### 3.4.2.1. Main Navigation
- Primary navigation links
- Mobile menu (hamburger)
- About entry access
- User status
- Quick actions
- Search access
- Theme toggle

###### 3.4.2.2. Tag Navigation
- Tree-based structure
- Expandable sections
- Entry count display
- Active state tracking
- URL synchronization
- Level management
- Dimension filtering

###### 3.4.2.3. Life Stages Navigation
- Life stage grouping
- Timeline view
- Tag filtering
- Entry progression
- Visual indicators
- Date-based organization

###### 3.4.2.3.1. Settings Model
```typescript
interface Settings {
  id: string;
  lifeStages: {
    [stage: string]: {
      startYear: number;
      startMonth: number;
      endYear?: number;
      endMonth?: number;
    };
  };
  updatedAt: Date;
}
```

## 4. Authentication System
Status: ✅ Operational
Vision: Secure and simple access for family members
Description: User authentication and authorization

### 4.1. User Management
Status: ✅ Implemented
Vision: Make it easy for family members to access and contribute
    - Login system
    - Form/Profile page
    - Activity
    - Auth
    - Store metadata
    - Manage sessions?
    - Preferences:
        - Opt-in to Story of the Day
        - Theme (Light/Dark)
    - Username/Password
    - Recovery System
    - Likes/Comments/Notifications

Components:
- User registration
- User login
- Role management

#### 4.1.1. Data Model
```typescript
interface User {
  // Existing Properties
  id: string;
  email: string;
  role: 'author' | 'family';
  createdAt: Date;
  updatedAt: Date;

  // Needed Properties
  displayName: string;     // 📅 Planned
  preferences: {          // 📅 Planned
    layout: string;
    theme: string;
    notifications: boolean;
  };
  lastLogin: Date;        // 📅 Planned
  viewHistory: string[];  // 📅 Planned
}
```

#### 4.1.2. Data Flow
1. User authentication
2. Role verification
3. Access control
4. Session management

#### 4.1.3. Features
- ✅ Email authentication
- ✅ Role-based access
- ✅ Session management
- 📅 Social login
- 📅 User profiles
- 📅 Family sharing
- 📅 Activity tracking
- 📅 Notification preferences

#### 4.1.4. Open Questions
What does 'Manage Sessions' mean?
Do we need permissions for anything?

## 5. Backup System
Status: 🚧 In Progress
Vision: Ensure data safety and easy recovery
Description: Automated backup and restore functionality

### 5.1. Backup Management
Status: 🚧 In Progress
Vision: Make data backup seamless and reliable
    - Backup Script
    - OneDrive
    - MS Scheduling
Components:
- Automated backups
- Manual backup triggers
- Backup verification
- Restore functionality

#### 5.1.1. Data Model
```typescript
interface Backup {
  // Existing Properties
  id: string;
  timestamp: Date;
  type: 'auto' | 'manual';
  status: 'pending' | 'completed' | 'failed';
  size: number;
  path: string;

  // Needed Properties
  metadata: {            // 📅 Planned
    entryCount: number;
    mediaCount: number;
    tagCount: number;
    userCount: number;
  };
  checksum: string;      // 📅 Planned
  retention: Date;       // 📅 Planned
  notes: string;         // 📅 Planned
}
```

#### 5.1.2. Data Flow
1. Trigger backup
2. Collect data
3. Compress and encrypt
4. Store backup
5. Verify integrity

#### 5.1.3. Features
- ✅ Basic backup creation
- ✅ Backup listing
- ✅ Manual restore
- 📅 Automated scheduling
- 📅 Backup verification
- 📅 Incremental backups
- 📅 Cloud storage integration
- 📅 Backup encryption
- 📅 Retention policies

## 6. Technical Infrastructure
Status: 🚧 In Progress
Vision: Provide a robust, scalable, and maintainable foundation
Description: Core technical systems and architecture
Performance
- Initial page load under 2 seconds

- Efficient data caching
- Optimized media delivery

### 6.1. Frontend Architecture
Status: 🚧 In Progress
Vision: Create a responsive, performant user interface
Themes and Layouts
- Light and dark themes
- Multiple layout options
- Customizable components
- Responsive design
- Performance optimization
Components:
- React components
- State management
- Routing
- API integration

#### 6.1.1. Directory Structure
## Rules and Guidelines

### 1. Directory Naming
- Use lowercase with hyphens for directory names
- Keep names short but descriptive
- Follow established patterns for similar directories
- Avoid special characters in directory names

### 2. File Organization
- Group related files together
- Keep file paths reasonably short
- Use consistent naming patterns
- Avoid deep nesting (max 4 levels recommended)

### 3. Documentation
- Keep all documentation in `/docs`
- Use PascalCase for documentation file names
- Include document type in the name (e.g., `ProjectGuide.md`, `Vision.md`)
- Use descriptive names that indicate the document's purpose
- Maintain consistent formatting
- Include README files in key directories

### 4. Source Code
- Follow Next.js 14 conventions
- Organize by feature when possible
- Keep components focused and modular
- Maintain clear separation of concerns

### 5. Testing
- Keep tests close to the code they test
- Use consistent test file naming
- Maintain test directory structure
- Include test utilities and fixtures


### Temporary Files
- The `temp/` directory is used for storing migration scripts and data conversion files
- These files are used for one-time operations like converting stories and categories
- The directory is git-ignored as these files are not part of the production codebase
- Files in this directory should be documented with their purpose and usage

# Directory Structure Consistency

- **App Router Structure:**
  - All routes MUST be created within the `app/` directory
  - Route groups MUST use `(group)` syntax for organization
  - Dynamic routes MUST use `[param]` syntax
  - Layout files MUST be named `layout.tsx`
  - Page files MUST be named `page.tsx`
  - Loading states MUST be in `loading.tsx`
  - Error boundaries MUST be in `error.tsx`
  - Not found pages MUST be in `not-found.tsx`

- **Component Organization:**
  - Shared components MUST be in `src/components/`
  - Feature components MUST be in `src/components/features/`
  - Layout components MUST be in `src/components/layouts/`
  - UI components MUST be in `src/components/ui/`
  - Private components MUST use `_` prefix (e.g., `_components/`)
  - Component files MUST be PascalCase
  - Component styles MUST be in `src/styles/components/`
  - No co-location of styles is permitted

- **API and Services:**
  - API routes MUST be in `app/api/`
  - API handlers MUST be in `route.ts` files
  - Service modules MUST be in `src/lib/api/`
  - Firebase services MUST be in `src/lib/api/firebase/`
  - External API integrations MUST be in `src/lib/api/[service]/`

- **Data Management:**
  - Database models MUST be in `src/types/models/`
  - Database queries MUST be in `src/lib/db/queries/`
  - Data hooks MUST be in `src/lib/hooks/`
  - State management MUST be in `src/lib/state/`

- **Media and Assets:**
  - App Assets:
    - App images MUST be in `public/images/app/`
    - App icons MUST be in `public/images/icons/`
    - App logos MUST be in `public/images/logos/`
    - App fonts MUST be in `public/fonts/`
  - User Content:
    - Primary storage: Google Photos API
    - Secondary storage: Local/Cloud drives
    - App storage:
      - Thumbnails MUST be in `public/images/cache/thumbnails/`
      - Optimized previews MUST be in `public/images/cache/previews/`
      - Metadata MUST be in `src/lib/media/metadata/`
    - No duplication of original images in app directory
  - Media Processing:
    - Media utilities MUST be in `src/utils/media/`
    - Image components MUST be in `src/components/ui/images/`
    - Media processing MUST be in `src/lib/media/`
    - Image optimization MUST be in `src/lib/media/optimization/`
    - Cache management MUST be in `src/lib/media/cache/`

- **Authentication:**
  - Auth components MUST be in `src/components/features/auth/`
  - Auth utilities MUST be in `src/lib/auth/`
  - Auth hooks MUST be in `src/lib/hooks/auth/`
  - Protected routes MUST be in `app/(auth)/`

- **Documentation:**
  - Project docs MUST be in `docs/`
  - API docs MUST be in `docs/api/`
  - Component docs MUST be in `docs/components/`
  - README files MUST be in all major directories
  - Documentation MUST be in Markdown format

- **Testing:**
  - Unit Tests:
    - Test files SHOULD be in `src/__tests__/` organized by feature
    - Test utilities MUST be in `src/utils/testing/`
    - Test fixtures MUST be in `src/utils/testing/fixtures/`
  - Integration Tests:
    - Integration tests MUST be in `tests/integration/`
    - API tests MUST be in `tests/integration/api/`
    - Component tests MUST be in `tests/integration/components/`
  - E2E Tests:
    - E2E tests MUST be in `tests/e2e/`
    - Test scenarios MUST be in `tests/e2e/scenarios/`
    - Test data MUST be in `tests/e2e/data/`

- **Configuration:**
  - Environment files MUST be in root directory
  - Build config MUST be in root directory
  - TypeScript config MUST be in root directory
  - ESLint config MUST be in root directory
  - Style config MUST be in root directory
  - Firebase config MUST be in `src/lib/config/`

- **Code Organization:**
  - Utility functions MUST be in `src/utils/`
  - Custom hooks MUST be in `src/lib/hooks/`
  - Constants MUST be in `src/lib/constants/`
  - Types MUST be in `src/types/`
  - Styles MUST be in `src/styles/`

- **File Naming:**
  - React components MUST be PascalCase
  - Utility files MUST be camelCase
  - Test files MUST end with `.test.ts` or `.test.tsx`
  - Style files MUST be `[name].module.css`
  - Type files MUST be `[name].types.ts`
## Import Path Rules

### Rule 1: Use Absolute Imports with `@/` Alias
- All imports MUST use the `@/` alias pointing to `src/`
- Example: `import { Entry } from '@/types/entry'`
- This makes imports more maintainable and less brittle to file moves

### Rule 2: Import Order
1. External dependencies first
2. Internal absolute imports (with `@/`) second
3. Relative imports last (if absolutely necessary)

### Rule 3: Service Imports
- All service imports MUST come from `@/lib/services/`
- Example: `import { db } from '@/lib/services/firebase'`
- No direct imports from external services (e.g., Firebase) in components

### Rule 4: Configuration Imports
- All configuration imports MUST come from `@/lib/config/`
- Example: `import { firebaseConfig } from '@/lib/config/firebase'`

### Rule 5: Data Management Imports
- All data management imports MUST come from `@/lib/data/`
- Example: `import { getEntry } from '@/lib/data/entryService'`

## Hook Rules

### Rule 1: Centralized Hook Location
- All hooks MUST be in `src/lib/hooks/`
- No hooks should exist outside this directory
- This makes hooks easily discoverable and maintainable

### Rule 2: Hook Naming Convention
- All hooks MUST be prefixed with `use`
- Example: `useEntry`, `useStories`, `useAuth`
- The filename MUST match the hook name
- Example: `useEntry.ts` for the `useEntry` hook

### Rule 3: Hook Organization
- Group related hooks in the same file
- Keep hooks focused on a single responsibility
- Export hooks individually for better tree-shaking
- Example: `export const useEntry = () => { ... }`

### Rule 4: Hook Dependencies
- Hooks MUST import from services, not directly from Firebase or other external sources
- Example: `import { getEntry } from '@/lib/data/entryService'` instead of direct Firebase imports
- This ensures proper abstraction and maintainability
```
src/
├── app/                  # ✅ Next.js app router
│   ├── (auth)/           # ✅ Authentication routes
│   ├── edit/             # ✅ Entry editing
│   ├── page.tsx          # ✅ Home page
│   └── layout.tsx        # ✅ Root layout
├── components/           # ✅ React components
│   ├── common/           # ✅ Shared components
│   ├── forms/            # ✅ Form components
│   ├── layouts/          # ✅ Layout components
│   └── ui/               # ✅ UI components
├── lib/                  # ✅ Core functionality
│   ├── hooks/            # ✅ Custom hooks
│   ├── services/         # ✅ API services
│   ├── types/            # ✅ TypeScript types
│   └── utils/            # ✅ Utility functions
└── styles/               # ✅ Styling
    ├── components/       # ✅ Component styles
    ├── layouts/          # ✅ Layout styles
    └── globals.css       # ✅ Global styles
```

Features:
- ✅ Next.js 14 app router
- ✅ React Server Components
- ✅ TypeScript integration
- ✅ CSS Modules
- 📅 Performance optimization
- 📅 Progressive enhancement
- 📅 Accessibility improvements
- 📅 Internationalization
- 📅 Theme system

### Backend Architecture
Status: 🚧 In Progress
Vision: Provide reliable and efficient data management
- **Storage**
  - Firestore for content
  - Cloud Storage for media
  - Local storage for offline access
  - Regular backups
  - Data migration support

- **Security**
  - Firebase Authentication
  - Role-based access control
  - Content protection
  - API security
  - Data encryption
Components:
- API routes
- Database operations
- Authentication
- File handling

Open Questions:
Security - What are security rules and which ones do we need?


Directory Structure:
```
src/
├── app/
│   └── api/             # ✅ API routes
│       ├── auth/        # ✅ Authentication
│       ├── entries/     # ✅ Entry management
│       ├── tags/        # ✅ Tag management
│       └── media/       # 📅 Media handling
├── lib/
│   ├── db/             # ✅ Database operations
│   ├── auth/           # ✅ Authentication
│   └── storage/        # 📅 File storage
└── scripts/            # ✅ Utility scripts
    ├── migrations/     # ✅ Database migrations
    └── backups/        # ✅ Backup operations
```

Features:
- ✅ RESTful API
- ✅ MongoDB integration
- ✅ Authentication
- ✅ File uploads
- 📅 API versioning
- 📅 Rate limiting
- 📅 Caching
- 📅 WebSocket support
- 📅 GraphQL support

Open Questions:
Editor - Is a separate route needed for entry editor?
Structure - Need to reconcile disparate directory structures -- config/scripts.
Structure - Create full tree with all actual and needed components.

## 7. AI Integration
    Content & Tagging Support
    ### Entry Coaching
- Writing suggestions
- Structure guidance
- Content completeness
- Tag recommendations
- Media suggestions
- Style preservation

#### AI Integration Flow
1. Content is analyzed (`services/contentService.ts`)
2. Tags are suggested (`services/tagService.ts`)
3. Recommendations are generated (`services/recommendationService.ts`)
4. UI is updated with suggestions (`components/features/ai/TagSuggestions.tsx`)

#### AI Processing
1. Content is sent to AI service
2. Analysis is performed
3. Results are returned
4. UI is updated with suggestions
5. User can accept/reject suggestions


### Performance Optimization
Status: 🚧 In Progress
Vision: Ensure fast and responsive user experience
#### Real-time Updates
- Firestore listeners
- State management
- UI updates
- Conflict resolution
- Error handling
- Cache invalidation

#### State Management
- Component state
- Global state
- Cache management
- State persistence
- State synchronization
- Performance optimization
Components:
- Image optimization
- Code splitting
- Caching
- Database indexing

#### Features
- ✅ Basic image optimization
- ✅ Route-based code splitting
- ✅ Static generation
- 📅 Advanced caching
- 📅 Database optimization
- 📅 CDN integration
- 📅 Service worker
- 📅 Performance monitoring

## Development Workflow
Status: 🚧 In Progress
Vision: Maintain code quality and efficient development
Description: Development processes and tools

### Data Validation
- Input validation
- Schema validation
- Type checking
- Error reporting
- Recovery strategies
- Data integrity

### Error Handling
- Error boundaries
- Error logging
- User feedback
- Recovery options
- Fallback strategies
- Monitoring
# Cursor Development Rules

## 1. Problem-Solving Protocol
- Consider existing architecture and codebase before proposing solutions
- Obtain explicit approval before writing new code

## 2. Communication Rules
- Present plans before making changes
- Document issues when they arise
- Keep track of important decisions
- Maintain clear problem statements

## 3. Development Process
- Focus on one issue at a time
- Document decisions and learnings
- Follow established patterns
- Test as you go

## 4. Code Creation Rules
- Check existing solutions first
- Document proposed changes
- Get approval before implementation
- Follow established patterns

## 5. Documentation Requirements
- Maintain a detailed Executive Summary of the Project
- Maintain a detailed Vision of the Project
- Maintain a detailed Architecture Plan
- Maintain a detailed Development Plan
- Update all documentation as decisions and coding is made.


## 6. Interaction Patterns
- Listen before acting
- Ask clarifying questions
- Present plans for approval
- Document important information

## 7. File Management
- Keep track of file changes
- Document file purposes
- Maintain clear organization
- Follow naming conventions

## 8. Session Management
- Review current state at start
- Document important decisions
- Track progress
- Maintain context

## 9. Emergency Protocol
- Document issues clearly
- Propose solutions
- Get approval before changes
- Maintain clear communication

## 10. Learning and Adaptation
- Document learnings
- Track patterns
- Share knowledge
- Improve processes

## 11. Next.js Routing Standards
- Use consistent parameter names across routes
- Follow the pattern: `[id]` for single-item routes
- Document route parameters in architecture
- Check for existing routes before creating new ones
- Use server components by default
- Document any client components with clear reasoning

## 12. Parameter Naming Conventions
- Use `id` for single-item identifiers
- Use `categoryId` only in data models, not routes
- Document parameter names in architecture
- Maintain consistency with database field names
- Review parameter usage across components

## 13. Component Development
- Start with server components by default
- Document reasons for client components
- Follow established patterns
- Include proper TypeScript interfaces
- Implement proper error handling

## 14. Code Style and Organization

### Naming Conventions
- Use camelCase for JavaScript variables and function names
- Use PascalCase for React component names
- Use kebab-case for CSS class names
- Use descriptive and meaningful names for all entities
- Be consistent with naming throughout the project

### Code Formatting
- Maintain consistent indentation (2 spaces)
- Keep lines of code reasonably short (80-120 characters)
- Use blank lines to separate logical blocks of code
- Be consistent with the use of semicolons
- Format code according to project's ESLint configuration

### Comments and Documentation
- Add comments to explain complex logic or non-obvious code
- Use JSDoc-style comments for functions and components
- Keep comments up-to-date with code changes
- Document important decisions and their rationale
- Include usage examples for complex components



### API Design
- Keep API route handlers focused and concise
- Implement proper error handling and validation
- Follow RESTful conventions
- Document endpoints and request/response formats
- Use consistent authentication patterns

### Testing Strategy
- Write tests for critical functionality
- Follow consistent testing patterns
- Include unit, integration, and E2E tests
- Document test coverage requirements
- Maintain test data and fixtures

### Environment and Configuration
- Use .env files for configuration
- Never commit sensitive information
- Document required environment variables
- Follow consistent configuration patterns
- Validate environment setup

## 15. Documentation Rules

### Location
- All project documentation must be stored in the `/docs` directory
- No documentation files should be placed in the root directory
- Documentation should be organized by type and purpose
- Each document should have a clear, descriptive name

### Naming Conventions
- Use PascalCase for document names
- Include the document type in the name (e.g., `ARCHITECTURE.md`, `VISION.md`)
- Use descriptive names that indicate the document's purpose

### Content Organization
- Each document should have a clear structure with sections and subsections
- Use markdown formatting consistently
- Include a table of contents for longer documents
- Keep related information together in the same document

### Version Control
- Document changes should be committed with clear, descriptive messages
- Major changes should be noted in the document's history
- Keep documentation in sync with code changes 
# Holistic Development Considerations

- **Frontend-Backend Integration:** When working on frontend features that interact with the backend, always consult the API documentation (@./docs/api_design.md) to ensure proper data exchange and error handling.
- **Database Interactions:** Be mindful of the database schema (@./docs/database_schema.md) when implementing backend logic that reads or writes data. Avoid introducing schema changes without proper review.
- **Shared Components:** Prioritize the use of existing shared UI components (located in `@./components/common`) to maintain a consistent user interface across the application.
- **Impact Analysis:** Before making significant changes to architectural components, describe impacts and request approval. 
- **Logging and Monitoring:** Ensure that new features and modules include appropriate logging and monitoring mechanisms to facilitate debugging and performance analysis across the system. 
DO NOT CREATE ANY FILE  WITHOUT ASKING PERMISSION--EVER!

## Best Practices
1. Always ask before creating new files
2. Show proposed changes for review
3. Get explicit permission for any file operation
4. Document the purpose of any changes
5. Preserve file history when possible
6. Explain the reasoning behind operations
7. Provide rollback options when possible
8. Keep track of all file operations 

# File Operations Rules

## File Creation
- NEVER create new files without explicit user permission
- ALWAYS ask before creating any new file
- Wait for explicit approval before proceeding
- Document the purpose of any proposed new file

## File Modification
- ALWAYS show proposed changes for review
- Wait for user approval before applying changes
- Clearly indicate what will be modified
- Provide context for why changes are needed

## File Movement
- ALWAYS confirm source and destination paths
- Show what files will be moved
- Wait for approval before moving files
- Preserve file history when possible

## File Deletion
- NEVER delete files without explicit permission
- Show what files will be deleted
- Explain why deletion is necessary
- Wait for confirmation before proceeding

### Code Quality
Status: 🚧 In Progress
Vision: Ensure maintainable and reliable code
- Error handling/logging.
Components:
- TypeScript
- ESLint
- Prettier
- Testing

Features:
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Prettier formatting
- 📅 Unit testing
- 📅 Integration testing
- 📅 E2E testing
- 📅 Code coverage
- 📅 Performance testing

### Deployment
Status: 🚧 In Progress
Vision: Streamline deployment process
Components:
- CI/CD pipeline
- Environment management
- Monitoring
- Error tracking

Features:
- ✅ Vercel deployment
- ✅ Environment variables
- 📅 Automated testing
- 📅 Deployment previews
- 📅 Error monitoring
- 📅 Performance monitoring
- 📅 Rollback capability
- 📅 A/B testing

## Status Legend
- ✅ Implemented
- 🚧 In Progress
- 📅 Planned
- ⚠️ Needs Review
- 🔄 In Refactoring

### User Interface
Status:
Vision: Pleasing, immersive, responsive enjoyable, interface.

## Key Considerations
- Mobile-first design
- Performance optimization
- Security best practices
- User experience
- Scalability
- Maintainability 
- Define common elements at globals.css
- Only component-specific in modules
- [ ] Add reset/normalize styles
- [ ] Define base element styles
- [ ] Create utility classes

# CSS Standards

### CSS Organization
- Use logical CSS file organization
- Follow BEM methodology for class names
- Keep specificity as low as possible
- Avoid excessive selector nesting
- Use media queries for responsiveness
- Document complex CSS rules

## File Organization
- All styles MUST be in `src/styles/`
- Component styles MUST be in `src/styles/components/`
- Global styles MUST be in `src/styles/globals.css`
- Theme styles MUST be in `src/styles/themes/`
- Utility styles MUST be in `src/styles/utils/`

## Naming Conventions
- Global CSS files MUST use `.css` extension
- Module CSS files MUST use `.module.css` extension
- Theme files MUST use `[name].theme.css`
- Utility files MUST use `[name].utils.css`

## Class Naming
- Use kebab-case for class names
- Use BEM methodology for component classes
- Prefix utility classes with `u-`
- Prefix layout classes with `l-`
- Prefix theme classes with `t-`

## CSS Module Usage
- MUST use CSS Modules for component styles
- MUST use camelCase for imported class names
- MUST use meaningful class names
- MUST avoid global class names in modules

## Variables and Theming
- MUST use CSS variables for theming
- MUST define variables in `:root`
- MUST use semantic variable names
- MUST provide fallback values
- MUST use global variables for:
  - Colors
  - Spacing
  - Typography
  - Breakpoints
  - Z-indices
  - Transitions
  - Shadows
  - Border radiuses
- MUST avoid local variable definitions unless absolutely necessary
- MUST document all global variables in `globals.css`

## Media Queries
- MUST use fluid/gradient responsiveness instead of breakpoints
- MUST use CSS calc() for fluid typography
- MUST use viewport units (vw, vh) for fluid layouts
- MUST use clamp() for responsive values
- MUST use min(), max() for responsive constraints
- MUST avoid fixed breakpoints except for:
  - Mobile menu toggles
  - Layout shifts
  - Component stacking
- MUST document any necessary breakpoints

## Style Overrides
- MUST avoid style overrides
- MUST use CSS custom properties for dynamic values
- MUST use data attributes for state-based styling
- MUST use CSS cascade instead of specificity
- MUST use composition over inheritance
- MUST use utility classes for one-off styles
- MUST document any necessary overrides

## Performance
- MUST minimize selector specificity
- MUST avoid !important
- MUST use efficient selectors
- MUST minimize style duplication

## Accessibility
- MUST maintain minimum color contrast
- MUST provide focus states
- MUST support reduced motion
- MUST use relative units

## Documentation
- MUST document complex styles
- MUST explain non-obvious solutions
- MUST document breakpoints
- MUST maintain style guide

## Best Practices
- MUST use flexbox/grid for layouts
- MUST use CSS variables for repeated values
- MUST use logical properties
- MUST support RTL layouts
- MUST use modern CSS features
- MUST provide fallbacks for older browsers 

## Best Practices
1. Always use proper path separators for the current shell
2. Include error handling in scripts
3. Document shell-specific commands
4. Use relative paths when possible
5. Include comments for complex operations
6. Test commands in a safe environment first
7. Use proper quoting for paths with spaces
8. Consider cross-platform compatibility
9. All TypeScript scripts must be run with the correct TypeScript configuration file (e.g., tsconfig.scripts.json) to ensure path aliases and type checking work as intended. 

# Shell Command Standards

## Command Shell Selection
- Use PowerShell as the primary shell for Windows development
- Use Command Prompt (cmd.exe) as a fallback if PowerShell is not available
- Document any shell-specific commands in comments

## PowerShell Syntax
- Use backslashes (`\`) for paths
- Use semicolons (`;`) to separate commands
- Use `-Force` for operations that might need to overwrite
- Use `-Recurse` for directory operations
- Use `-ErrorAction SilentlyContinue` for operations that might fail

## Command Prompt Syntax
- Use backslashes (`\`) for paths
- Use `&&` to separate commands
- Use `/S` for directory operations
- Use `/Q` for quiet mode
- Use `/F` for force operations

## Directory Operations
```powershell
# PowerShell
mkdir -Force -Recurse path\to\directory
Remove-Item -Force -Recurse path\to\directory
Copy-Item -Force -Recurse source\to\destination

# Command Prompt
mkdir /S /Q path\to\directory
rmdir /S /Q path\to\directory
xcopy /S /E /Y source\to\destination
```

## File Operations
```powershell
# PowerShell
Copy-Item -Force source\to\destination
Remove-Item -Force path\to\file
Move-Item -Force source\to\destination

# Command Prompt
copy /Y source\to\destination
del /F /Q path\to\file
move /Y source\to\destination
```

## Environment Variables
```powershell
# PowerShell
$env:VARIABLE_NAME = "value"
$env:VARIABLE_NAME

# Command Prompt
set VARIABLE_NAME=value
%VARIABLE_NAME%
```

