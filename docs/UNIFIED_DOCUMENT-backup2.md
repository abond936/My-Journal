# My Journal - Unified Project Documentation

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

### 2.1 Administration

Entries

Albums

Tags
---------------------------------------------------------------------
## Entry Creation
Status: 🚧 In Progress

Create a seamless experience for capturing and organizing life's stories

Core Features:
- ✅ Basic entry creation and editing
- ✅ Entry listing and search
- Rich text editing
- 📅 Media integration
- 📅 Auto-save/draft management
- 📅 AI-assisted content creation
- 📅 Tag management
- 📅 Access from anywhere in the app.

#### Open Questions
- Do we have to manage photo metadata?
- Move About to dedicated page to avoid type issues.
---------------------------------------------------------------------
### Tag System
Status: 🚧 In Progress

#### 2.2.1 Features
Vision: Enable intuitive organization and discovery of stories through multi-dimensional tagging

Core Features:
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

#### 2.2.5 Open Questions
- How do we best handle reflection tags?
- Should we move About to a dedicated page to avoid type issues?
- How should we handle life stages in the tag system?
---------------------------------------------------------------------
### Question System
Status: 📅 Planned

#### 2.3.1 Features
Vision: Provide thoughtful prompts to inspire meaningful stories and reflections

Core Features:
- 📅 Question library management
  - Standard question templates
  - Custom question creation
  - Question categorization
  - Question tagging
- 📅 Answer tracking
  - Track which questions have been answered
  - Link questions to their entry answers
  - Track answer history
- 📅 Question discovery
  - Tag-based browsing
  - AI suggestions
  - Recently used
  - Popular questions

Question Types:
- Story prompts
- Reflection prompts
- Life stage specific
- Theme based
---------------------------------------------------------------------
#### Open Questions
- How should we handle question templates vs custom questions?
- Should questions be tied to specific life stages?
- How do we track question effectiveness?
- Should we implement a question rating system?
- How do we handle question suggestions based on previous answers?
---------------------------------------------------------------------
### Media System
Status: 🚧 In Progress

Seamlessly integrate photos and videos to enrich stories

Core Features:
- 📅 Google Photos Integration
  - OAuth2 authentication
  - Album synchronization
  - Photo selection
  - Metadata import
  - Update tracking
- 📅 Media Management
  - Image upload
  - Image optimization
  - Format conversion
  - Lazy loading
  - Progressive loading
  - Cache management
- 📅 Media Organization
  - Album management
  - Tag association
  - Entry linking
  - Search functionality
  - Face detection
  - Location tagging

Media Types:
- Images (primary)
- Videos (future)
- Audio (future)

#### Open Questions
- What type of media storage needs do we have?
  - Application assets
  - User content
- Do we need to store content or can we rely on Google?
- Can we manage metadata in photos as opposed to locally?
- How do we handle media backup and recovery?
- What's the best approach for media optimization?

### 3. User Interface
Status: 📅 Planned

Create an immersive, responsive reading experience that adapts to different content types and user preferences

Core Features:
- 📅 Layout Options
  - Blog style (traditional)
  - Magazine style (grid-based)
  - Timeline view (chronological)
  - Card layout (visual)
  - Accordion view (space-efficient)
- 📅 Reading Experience
  - Responsive design
  - Mobile-first approach
  - Sub-2 second load times
  - Progressive loading
  - Smooth transitions
- 📅 Social Features
  - Like functionality
  - Comment capability
  - No sharing features
  - No content creation for family users
  - Story of the Day/Week/Month feature

Layout Types:
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

#### 3.5 Open Questions
- What is the difference between index, layout and page in the root directory?
- What state issues do we need to be aware of in this app?
- What are error boundaries and how should we implement them?
- How do we handle layout transitions?
- Should we implement layout-specific caching?

### 3.6 Story of the Day
Status: 📅 Planned

Provide a daily curated story experience that encourages regular engagement and discovery

Core Features:
- 📅 Story Selection
  - Algorithmic selection from unviewed stories
  - Avoids recently viewed stories
  - Considers story quality and relevance
  - Balances different story types
  - Respects user preferences
- 📅 User Preferences
  - Opt-in/opt-out control
  - Viewing history tracking
  - Reset viewing history option
  - Notification preferences
  - Time of day preference
- 📅 Story Display
  - Featured story presentation
  - Story preview
  - Quick navigation
  - Social interactions
  - Related stories

#### 3.6.5 Open Questions
- How should we handle timezone differences for daily updates?
- What metrics should we use to measure story quality?
- How do we balance different types of stories?
- Should we implement a fallback system for story selection?
- How do we handle cases where there are no eligible stories?

### 3.7 Navigation
Status: 📅 Planned

#### 3.7.1 Features
Vision: Provide intuitive, context-aware navigation that helps users easily find and explore content

Core Features:
- 📅 Main Navigation
  - Top navigation bar
  - Mobile-responsive menu
  - Quick access to key features
  - User status display
  - Theme toggle
  - Search access
- 📅 Tag Navigation
  - Tree-based structure
  - Expandable sections
  - Entry count display
  - Active state tracking
  - URL synchronization
  - Dimension filtering
- 📅 Life Stages Navigation
  - Life stage grouping
  - Timeline view
  - Tag filtering
  - Entry progression
  - Visual indicators
  - Date-based organization
- 📅 Context Navigation
  - Breadcrumb trails
  - Related content
  - Intra-content navigation
  - Back/forward history
  - Quick return to home


```
interface LifeStageSettings {
  // Core Properties
  id: string;
  userId: string;
  stages: {
    [stage: string]: {
      startYear: number;
      startMonth: number;
      endYear?: number;
      endMonth?: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  displayOrder: string[];  // 📅 Stage display order
  activeStage: string;    // 📅 Currently active stage
  stageColors: {          // 📅 Visual customization
    [stage: string]: string;
  };
}
```

#### 3.7.5 Open Questions
- How do we handle deep linking to specific navigation states?
- What's the best way to manage navigation history for large numbers of entries?
- How should we handle navigation state persistence?
- What's the optimal way to structure the tag tree for performance?
- How do we handle navigation conflicts between different navigation types?

## 4. Authentication System
Status: ✅ Operational

Provide secure, simple, and reliable authentication for family members while maintaining appropriate access controls

Core Features:
- ✅ User Authentication
  - Email/password login
  - Session management
  - Secure token handling
  - Password recovery
  - Remember me option
- ✅ Role Management
  - Author role (full access)
  - Family role (viewing only)
  - Role-based permissions
  - Access control
  - Feature restrictions
- 📅 User Management
  - User registration
  - Profile management
  - Activity tracking
  - Last login tracking
  - Account settings
- 📅 Security Features
  - Password hashing
  - Session timeout
  - Login attempt limits
  - Device tracking
  - Security logging

#### Open Questions
- What additional security measures should we implement?
- How should we handle session persistence across devices?
- What's the best approach for role-based feature access?
- How do we handle account recovery for forgotten passwords?
- Should we implement two-factor authentication?

## 5. Backup System
Status: 🚧 In Progress

Vision: Ensure data safety and easy recovery through automated, reliable backup processes

Core Features:
- ✅ Basic Backup
  - Manual backup creation
  - Backup listing
  - Manual restore
  - Backup verification
  - Basic metadata tracking
- 📅 Automated Backup
  - Scheduled backups
  - Incremental backups
  - Backup rotation
  - Retention policies
  - Failure notifications
- 📅 Cloud Integration
  - OneDrive integration
  - Backup synchronization
  - Cloud storage management
  - Version tracking
  - Conflict resolution
- 📅 Recovery Features
  - Point-in-time recovery
  - Selective restore
  - Backup preview
  - Recovery testing
  - Backup validation

#### 5.5 Open Questions
- How do we handle backup conflicts during active use?
- What's the best strategy for backing up media files?
- How should we handle backup encryption?
- What's the optimal backup frequency?
- How do we handle backup failures during the process?

## 6. AI Integration
Status: 📅 Planned

Vision: Enhance content creation and organization through intelligent AI assistance while preserving the authentic voice of the author

Core Features:
- 📅 Content Assistance
  - Writing suggestions
  - Structure guidance
  - Content completeness
  - Style preservation
  - Grammar checking
  - Tone analysis
- 📅 Tag Management
  - Tag suggestions
  - Tag organization
  - Tag relationships
  - Tag validation
  - Tag cleanup
- 📅 Content Analysis
  - Theme detection
  - Sentiment analysis
  - Key point extraction
  - Summary generation
  - Related content
- 📅 Question Generation
  - Story prompts
  - Reflection prompts
  - Follow-up questions
  - Theme-based questions
  - Life stage questions

#### 6.5 Open Questions
- How do we ensure AI suggestions maintain the author's voice?
- What's the best way to handle AI confidence thresholds?
- How should we implement feedback loops for AI improvement?
- What's the optimal balance between AI assistance and human control?
- How do we handle potentially sensitive content in AI analysis?

## 7. Technical Infrastructure
Status: 🚧 In Progress
Provide a robust, scalable, and maintainable foundation
Description: Core technical systems and architecture

### 7.1 Performance Requirements
- Initial page load under 2 seconds
- Efficient data caching
- Optimized media delivery
- Progressive loading
- Responsive design
- Mobile-first approach

### 7.2 Frontend Architecture
Status: 🚧 In Progress
Create a responsive, performant user interface

#### 7.2.1 Core Features
- ✅ Next.js 14 app router
- ✅ React Server Components
- ✅ TypeScript integration
- ✅ CSS Modules
- 📅 Performance optimization
- 📅 Progressive enhancement
- 📅 Accessibility improvements
- 📅 Internationalization
- 📅 Theme system

#### 7.2.2 UI Components
- ✅ React components
- ✅ State management
- ✅ Routing
- ✅ API integration
- 📅 Advanced caching
- 📅 Service worker
- 📅 Performance monitoring

#### 7.2.3 Themes and Layouts
- ✅ Light and dark themes
- 📅 Multiple layout options
- 📅 Customizable components
- 📅 Responsive design
- 📅 Performance optimization

### 7.3 Backend Architecture
Status: 🚧 In Progress
Provide reliable and efficient data management

#### 7.3.1 Storage
- ✅ Firestore for content
- ✅ Cloud Storage for media
- 📅 Local storage for offline access
- 📅 Regular backups
- 📅 Data migration support

#### 7.3.2 Security
- ✅ Firebase Authentication
- ✅ Role-based access control
- 📅 Content protection
- 📅 API security
- 📅 Data encryption

#### 7.3.3 Components
- ✅ API routes
- ✅ Database operations
- ✅ Authentication
- 📅 File handling
- 📅 API versioning
- 📅 Rate limiting
- 📅 Caching
- 📅 WebSocket support
- 📅 GraphQL support


### 7.9 Open Questions
- What additional security measures should we implement?
- How should we handle session persistence across devices?
- What's the best approach for role-based feature access?
- How do we handle account recovery for forgotten passwords?
- Should we implement two-factor authentication?
- What's the optimal backup frequency?
- How do we handle backup failures during the process?
- What's the best strategy for backing up media files?
- How should we handle backup encryption?
- Editor - Is a separate route needed for entry editor?
- Structure - Need to reconcile disparate directory structures -- config/scripts.
- Structure - Create full tree with all actual and needed components.


## 13. Component Development
- Start with server components by default
- Document reasons for client components
- Follow established patterns
- Include proper TypeScript interfaces
- Implement proper error handling

## 14. Code Style and Organization

### Code Formatting
- Maintain consistent indentation (2 spaces)
- Keep lines of code reasonably short (80-120 characters)
- Use blank lines to separate logical blocks of code
- Be consistent with the use of semicolons
- Format code according to project's ESLint configuration



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

## File Deletion
- NEVER delete files without explicit permission
- Show what files will be deleted
- Explain why deletion is necessary
- Wait for confirmation before proceeding

### Code Quality
Status: 🚧 In Progress
Vision: Ensure maintainable and reliable code

- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Prettier formatting
- 📅 Unit testing
- 📅 Integration testing
- 📅 E2E testing
- 📅 Code coverage
- 📅 Performance testing
--------------------------------------------------------
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
------------------------------------------------------------------
### User Interface
Status:
Pleasing, immersive, responsive enjoyable, interface.

## Key Considerations
- Mobile-first design
- Performance optimization
- Security best practices
- User experience
- Scalability
- Maintainability 
- Define common elements at globals.css
- Only component-specific in modules
- Add reset/normalize styles
- Define base element styles
- Create utility classes

