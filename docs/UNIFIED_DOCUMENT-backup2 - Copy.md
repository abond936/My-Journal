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

### 2.1 Entry Management System
Status: 🚧 In Progress

#### 2.1.1 Features
Vision: Create a seamless experience for capturing and organizing life's stories

Core Features:
- ✅ Basic entry creation and editing
- ✅ Entry listing and search
- Rich text editing
- 📅 Media integration
- 📅 Auto-save/draft management
- 📅 AI-assisted content creation
- 📅 Tag management

Entry Types:
- Story-focused (Question/Answer or Story)
- Reflection-focused (Lesson, Advice)

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
  `type`: 'story' | 'reflection';              // Entry type
  `status`: 'draft' | 'published';            // 📅 Planned
  `author`: string;                           // 📅 Planned ??
  `media`: string[];                          // 📅 Planned
  'visibility': 'private' | 'family' | 'public';  // 📅 Planned
}
```

#### 2.1.3 Code Components
1. **Infrastructure Components**
   - ✅ `entryService.ts` - Core CRUD operations
   - ✅ `entry.types.ts` - Core type definitions
   - ✅ `useEntry.ts` - Core entry hook
   - ✅ `useEntries.ts` - Core entries hook
   - 🚧 `useEntryEditor.ts` - Core editor state
   - 📅 `entryValidation.ts` - Data validation
   - 📅 `entrySearch.ts` - Search functionality
   - 📅 `entryStorage.ts` - Storage handling
   - 📅 `entryAI.ts` - AI integration
   - 📅 `entry.enums.ts` - Entry enums
   - 📅 `entry.constants.ts` - Entry constants
   - 📅 `entryFormatter.ts` - Content formatting
   - 📅 `entryParser.ts` - Content parsing
   - 📅 `entryHelpers.ts` - Helper functions

2. **Feature-Specific Components**
   - `components/features/entries/`
     - ✅ `EntryList.tsx` - List view
     - ✅ `EntryCard.tsx` - Card view
     - 🚧 `EntryEditor.tsx` - Editor interface
     - ✅ `EntryView.tsx` - Read view
     - 📅 `EntryForm.tsx` - Form handling
     - 📅 `EntryHeader.tsx` - Title/date/meta
     - 📅 `EntryContent.tsx` - Content display
     - 📅 `EntryActions.tsx` - Edit/delete/etc
     - 📅 `EntryMedia.tsx` - Media display
     - 📅 `EntryTags.tsx` - Tag management

3. **Pages**
   - ✅ `app/entries/page.tsx` - Entry listing
   - ✅ `app/entries/[id]/page.tsx` - Entry view
   - 🚧 `app/entries/edit/[id]/page.tsx` - Entry editor
   - 📅 `app/entries/new/page.tsx` - New entry

#### 2.1.4 Implementation Flow
1. Entry Creation
   - User initiates (`app/entries/new/page.tsx`)
   - Editor loads (`EntryEditor.tsx`)
   - Content edited (`useEntryEditor.ts`)
   - Data validated (`entryValidation.ts`)
   - Entry stored (`entryService.ts`)
   - UI updated (`useEntry.ts`)

2. Data Flow
   - Create/update entry
   - Process content
   - Update tags
   - Handle media
   - Update search index

3. Real-time Behavior
   - Listeners for data changes
   - Component state updates
   - UI re-rendering
   - Change persistence

#### 2.1.5 Open Questions
- Do we have to manage photo metadata?
- Do we need location?
- Move About to dedicated page to avoid type issues.

### 2.2. Tag System
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

Tag Dimensions:
- Who (people, relationships)
- What (topics, themes)
- When (time periods, events)
- Where (locations, places)
- About (reflections, lessons)

#### 2.2.2 Data Model
```typescript
interface Tag {
  // Core Properties
  id: string;
  name: string;
  dimension: 'about' | 'who' | 'what' | 'when' | 'where';
  parentId: string | null;
  order: number;
  isReflection: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  path: string[];           // 📅 For hierarchical queries
  entryCount: number;       // 📅 For analytics
  description: string;      // 📅 For better organization
  color: string;           // 📅 For visual distinction
}
```

#### 2.2.3 Code Components
1. **Infrastructure Components**
   - ✅ `tagService.ts` - Core CRUD operations
   - ✅ `tag.types.ts` - Core type definitions
   - ✅ `useTag.ts` - Core tag hook
   - ✅ `useTags.ts` - Core tags hook
   - 📅 `tagValidation.ts` - Data validation
   - 📅 `tagSearch.ts` - Search functionality
   - 📅 `tagAnalytics.ts` - Analytics
   - 📅 `tagAI.ts` - AI suggestions
   - 📅 `tag.enums.ts` - Tag enums
   - 📅 `tag.constants.ts` - Tag constants
   - 📅 `tagHelpers.ts` - Helper functions

2. **Feature-Specific Components**
   - `components/features/tag/`
     - ✅ `TagList.tsx` - List view
     - ✅ `TagTree.tsx` - Hierarchical view
     - ✅ `TagForm.tsx` - Creation/editing
     - 📅 `TagAnalytics.tsx` - Analytics display
     - 📅 `TagSuggestions.tsx` - AI suggestions
     - 📅 `TagBulkActions.tsx` - Bulk operations
     - 📅 `TagImportExport.tsx` - Import/export

3. **Pages**
   - ✅ `app/tags/page.tsx` - Tag listing
   - ✅ `app/tags/[id]/page.tsx` - Tag view
   - 📅 `app/tags/analytics/page.tsx` - Analytics
   - 📅 `app/tags/import/page.tsx` - Import
   - 📅 `app/tags/export/page.tsx` - Export

#### 2.2.4 Implementation Flow
1. Tag Creation
   - User initiates (`TagForm.tsx`)
   - Data validated (`tagValidation.ts`)
   - Tag stored (`tagService.ts`)
   - Tree updated (`TagTree.tsx`)
   - UI refreshed (`useTags.ts`)

2. Data Flow
   - Create/update tag
   - Update parent-child relationships
   - Update entry references
   - Refresh tag tree
   - Update analytics

3. Real-time Behavior
   - Listeners for tag changes
   - Tree view updates
   - Entry count updates
   - Search index updates

#### 2.2.5 Open Questions
- How do we best handle reflection tags?
- Should we move About to a dedicated page to avoid type issues?
- How should we handle life stages in the tag system?

### 2.3. Question System
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

#### 2.3.2 Data Model
```typescript
interface Question {
  // Core Properties
  id: string;
  text: string;
  type: 'story' | 'reflection';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  category: string;        // 📅 For organization
  difficulty: number;      // 📅 For progression
  usageCount: number;      // 📅 For popularity
  lastUsed: Date;         // 📅 For recency
  isCustom: boolean;      // 📅 To distinguish user-created
  authorId?: string;      // 📅 For custom questions
  
  // Answer Tracking
  answeredEntries: {      // 📅 Track which entries answer this question
    entryId: string;
    answeredAt: Date;
  }[];
  isAnswered: boolean;    // 📅 Quick check if question has been answered
}
```

#### 2.3.3 Code Components
1. **Infrastructure Components**
   - 📅 `questionService.ts` - Core CRUD operations
   - 📅 `question.types.ts` - Core type definitions
   - 📅 `useQuestion.ts` - Core question hook
   - 📅 `useQuestions.ts` - Core questions hook
   - 📅 `questionValidation.ts` - Data validation
   - 📅 `questionSearch.ts` - Search functionality
   - 📅 `questionAI.ts` - AI suggestions
   - 📅 `question.enums.ts` - Question enums
   - 📅 `question.constants.ts` - Question constants
   - 📅 `questionHelpers.ts` - Helper functions

2. **Feature-Specific Components**
   - `components/features/questions/`
     - 📅 `QuestionList.tsx` - List view
     - 📅 `QuestionForm.tsx` - Creation/editing
     - 📅 `QuestionBrowser.tsx` - Discovery interface
     - 📅 `QuestionSuggestions.tsx` - AI suggestions
     - 📅 `QuestionStatus.tsx` - Answer tracking display
     - 📅 `QuestionAnalytics.tsx` - Usage analytics

3. **Pages**
   - 📅 `app/questions/page.tsx` - Question listing
   - 📅 `app/questions/[id]/page.tsx` - Question view
   - 📅 `app/questions/new/page.tsx` - New question
   - 📅 `app/questions/analytics/page.tsx` - Analytics

#### 2.3.4 Implementation Flow
1. Question Creation
   - User initiates (`QuestionForm.tsx`)
   - Data validated (`questionValidation.ts`)
   - Question stored (`questionService.ts`)
   - Tags updated
   - UI refreshed (`useQuestions.ts`)

2. Answer Flow
   - Question selected
   - Entry created as answer
   - Question's `answeredEntries` updated
   - Question's `isAnswered` status updated
   - Analytics updated

3. Discovery Flow
   - User browses questions
   - AI suggests relevant questions
   - Questions filtered by tags
   - Usage tracked

#### 2.3.5 Open Questions
- How should we handle question templates vs custom questions?
- Should questions be tied to specific life stages?
- How do we track question effectiveness?
- Should we implement a question rating system?
- How do we handle question suggestions based on previous answers?

### 2.4. Media System
Status: 🚧 In Progress

#### 2.4.1 Features
Vision: Seamlessly integrate photos and videos to enrich stories

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

#### 2.4.2 Data Model
```typescript
interface Media {
  // Core Properties
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
    takenAt: Date;
  };
  source: 'local' | 'google-photos' | 'cloud';
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  caption: string;         // 📅 User description
  order: number;          // 📅 Display order
  entryId?: string;       // 📅 Linked entry
  tags: string[];         // 📅 Associated tags
  faces?: string[];       // 📅 Detected faces
  location?: {           // 📅 Location data
    latitude: number;
    longitude: number;
    name: string;
  };
  albumId?: string;      // 📅 Album association
  isFavorite: boolean;   // 📅 User favorites
}

interface Album {
  // Core Properties
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  coverImageId: string;  // 📅 Album cover
  mediaCount: number;    // 📅 Total media
  tags: string[];        // 📅 Album tags
  isPublic: boolean;     // 📅 Visibility
}
```

#### 2.4.3 Code Components
1. **Infrastructure Components**
   - 🚧 `mediaService.ts` - Core CRUD operations
   - 🚧 `media.types.ts` - Core type definitions
   - 🚧 `useMedia.ts` - Core media hook
   - 🚧 `useAlbums.ts` - Core album hook
   - 📅 `mediaValidation.ts` - Data validation
   - 📅 `mediaSearch.ts` - Search functionality
   - 📅 `mediaOptimization.ts` - Image optimization
   - 📅 `mediaStorage.ts` - Storage handling
   - 📅 `googlePhotosService.ts` - Google Photos integration
   - 📅 `media.enums.ts` - Media enums
   - 📅 `media.constants.ts` - Media constants
   - 📅 `mediaHelpers.ts` - Helper functions

2. **Feature-Specific Components**
   - `components/features/media/`
     - 🚧 `MediaGallery.tsx` - Gallery view
     - 🚧 `MediaUploader.tsx` - Upload interface
     - 🚧 `MediaViewer.tsx` - Media display
     - 📅 `MediaEditor.tsx` - Editing interface
     - 📅 `AlbumManager.tsx` - Album management
     - 📅 `MediaBrowser.tsx` - Discovery interface
     - 📅 `MediaAnalytics.tsx` - Usage analytics

3. **Pages**
   - 🚧 `app/media/page.tsx` - Media listing
   - 🚧 `app/media/[id]/page.tsx` - Media view
   - 📅 `app/media/upload/page.tsx` - Upload page
   - 📅 `app/media/albums/page.tsx` - Albums
   - 📅 `app/media/albums/[id]/page.tsx` - Album view

#### 2.4.4 Implementation Flow
1. Media Upload
   - User initiates upload (`MediaUploader.tsx`)
   - File processed (`mediaOptimization.ts`)
   - Metadata extracted
   - Media stored (`mediaStorage.ts`)
   - Database updated (`mediaService.ts`)
   - UI refreshed (`useMedia.ts`)

2. Google Photos Integration
   - User authenticates
   - Albums synced
   - Photos imported
   - Metadata preserved
   - Updates tracked

3. Media Display
   - Media loaded
   - Progressive loading
   - Cache management
   - Lazy loading
   - Format optimization

#### 2.4.5 Open Questions
- What type of media storage needs do we have?
  - Application assets
  - User content
- Do we need to store content or can we rely on Google?
- Can we manage metadata in photos as opposed to locally?
- How do we handle media backup and recovery?
- What's the best approach for media optimization?

### 3. Layouts/User Interaction
Status: 📅 Planned

#### 3.1 Features
Vision: Create an immersive, responsive reading experience that adapts to different content types and user preferences

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

#### 3.2 Data Model
```typescript
interface LayoutSettings {
  // Core Properties
  id: string;
  userId: string;
  currentLayout: 'blog' | 'magazine' | 'timeline' | 'card' | 'accordion';
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  preferences: {
    showTags: boolean;        // 📅 Tag visibility
    showDates: boolean;       // 📅 Date visibility
    showMedia: boolean;       // 📅 Media visibility
    showRelated: boolean;     // 📅 Related entries
    showComments: boolean;    // 📅 Comments visibility
  };
  theme: {
    mode: 'light' | 'dark';   // 📅 Theme mode
    fontSize: number;         // 📅 Text size
    spacing: number;          // 📅 Content spacing
  };
}
```

#### 3.3 Code Components
1. **Infrastructure Components**
   - 📅 `layoutService.ts` - Layout management
   - 📅 `layout.types.ts` - Type definitions
   - 📅 `useLayout.ts` - Layout hook
   - 📅 `useTheme.ts` - Theme hook
   - 📅 `layoutValidation.ts` - Data validation
   - 📅 `layoutConstants.ts` - Layout constants
   - 📅 `layoutHelpers.ts` - Helper functions

2. **Feature-Specific Components**
   - `components/features/layouts/`
     - 📅 `BlogLayout.tsx` - Blog style
     - 📅 `MagazineLayout.tsx` - Magazine style
     - 📅 `TimelineLayout.tsx` - Timeline view
     - 📅 `CardLayout.tsx` - Card view
     - 📅 `AccordionLayout.tsx` - Accordion view
     - 📅 `LayoutSwitcher.tsx` - Layout controls
     - 📅 `ThemeSwitcher.tsx` - Theme controls
     - 📅 `SocialFeatures.tsx` - Social interactions

3. **Pages**
   - 📅 `app/layouts/page.tsx` - Layout settings
   - 📅 `app/layouts/preview/page.tsx` - Layout preview
   - 📅 `app/layouts/customize/page.tsx` - Layout customization

#### 3.4 Implementation Flow
1. Layout Selection
   - User selects layout (`LayoutSwitcher.tsx`)
   - Settings updated (`layoutService.ts`)
   - Components re-rendered
   - State persisted
   - UI refreshed

2. Theme Management
   - Theme selected (`ThemeSwitcher.tsx`)
   - Preferences saved
   - Styles applied
   - Transitions handled
   - State persisted

3. Social Features
   - Like/Comment initiated
   - State updated
   - UI refreshed
   - Analytics tracked

#### 3.5 Open Questions
- What is the difference between index, layout and page in the root directory?
- What state issues do we need to be aware of in this app?
- What are error boundaries and how should we implement them?
- How do we handle layout transitions?
- Should we implement layout-specific caching?

### 3.6 Story of the Day
Status: 📅 Planned

#### 3.6.1 Features
Vision: Provide a daily curated story experience that encourages regular engagement and discovery

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

#### 3.6.2 Data Model
```typescript
interface StoryOfTheDay {
  // Core Properties
  id: string;
  entryId: string;
  date: Date;
  status: 'pending' | 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  metrics: {
    viewCount: number;      // 📅 Total views
    likeCount: number;      // 📅 Total likes
    commentCount: number;   // 📅 Total comments
  };
  userInteractions: {       // 📅 Track user engagement
    userId: string;
    viewedAt: Date;
    liked: boolean;
    commented: boolean;
  }[];
}

interface StoryOfTheDayPreferences {
  // Core Properties
  userId: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  notificationTime: string;  // 📅 Preferred time for notifications
  viewingHistory: {         // 📅 Track viewed stories
    entryId: string;
    viewedAt: Date;
  }[];
  preferences: {
    includeReflections: boolean;  // 📅 Include reflection entries
    includeStories: boolean;      // 📅 Include story entries
    maxRecentDays: number;        // 📅 Days to avoid recently viewed
  };
}
```

#### 3.6.3 Code Components
1. **Infrastructure Components**
   - 📅 `storyOfTheDayService.ts` - Core CRUD operations
   - 📅 `storyOfTheDay.types.ts` - Type definitions
   - 📅 `useStoryOfTheDay.ts` - Core hook
   - 📅 `useStoryOfTheDayPreferences.ts` - Preferences hook
   - 📅 `storyOfTheDaySelection.ts` - Selection algorithm
   - 📅 `storyOfTheDayValidation.ts` - Data validation
   - 📅 `storyOfTheDayAnalytics.ts` - Analytics tracking

2. **Feature-Specific Components**
   - `components/features/storyOfTheDay/`
     - 📅 `StoryOfTheDayCard.tsx` - Featured story display
     - 📅 `StoryOfTheDayPreferences.tsx` - User preferences
     - 📅 `StoryOfTheDayHistory.tsx` - Viewing history
     - 📅 `StoryOfTheDayMetrics.tsx` - Engagement metrics
     - 📅 `StoryOfTheDayNotification.tsx` - Notification component

3. **Pages**
   - 📅 `app/story-of-the-day/page.tsx` - Main story page
   - 📅 `app/story-of-the-day/preferences/page.tsx` - Preferences page
   - 📅 `app/story-of-the-day/history/page.tsx` - Viewing history

#### 3.6.4 Implementation Flow
1. Story Selection
   - Check user preferences
   - Filter out recently viewed
   - Apply selection algorithm
   - Update story status
   - Notify users

2. User Interaction
   - Track story views
   - Update viewing history
   - Record engagement metrics
   - Update analytics
   - Trigger notifications

3. Preference Management
   - Save user preferences
   - Update notification settings
   - Manage viewing history
   - Apply preference changes
   - Refresh story selection

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

#### 3.7.2 Data Model
```typescript
interface NavigationState {
  // Core Properties
  id: string;
  userId: string;
  currentPath: string;
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  history: {              // 📅 Navigation history
    path: string;
    timestamp: Date;
    title: string;
  }[];
  preferences: {
    showTags: boolean;    // 📅 Tag visibility
    showLifeStages: boolean;  // 📅 Life stages visibility
    expandedSections: string[];  // 📅 Expanded navigation sections
    recentPaths: string[];  // 📅 Recently visited paths
  };
}

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

#### 3.7.3 Code Components
1. **Infrastructure Components**
   - 📅 `navigationService.ts` - Navigation state management
   - 📅 `navigation.types.ts` - Type definitions
   - 📅 `useNavigation.ts` - Core navigation hook
   - 📅 `useLifeStages.ts` - Life stages hook
   - 📅 `navigationValidation.ts` - Data validation
   - 📅 `navigationConstants.ts` - Navigation constants
   - 📅 `navigationHelpers.ts` - Helper functions

2. **Feature-Specific Components**
   - `components/features/navigation/`
     - 📅 `TopNavigation.tsx` - Main navigation bar
     - 📅 `MobileMenu.tsx` - Mobile navigation
     - 📅 `TagTree.tsx` - Tag navigation
     - 📅 `LifeStagesNav.tsx` - Life stages navigation
     - 📅 `Breadcrumbs.tsx` - Breadcrumb navigation
     - 📅 `QuickNav.tsx` - Quick navigation menu
     - 📅 `NavigationHistory.tsx` - Navigation history

3. **Pages**
   - 📅 `app/navigation/settings/page.tsx` - Navigation settings
   - 📅 `app/navigation/history/page.tsx` - Navigation history
   - 📅 `app/life-stages/settings/page.tsx` - Life stages settings

#### 3.7.4 Implementation Flow
1. Navigation State Management
   - Track current path
   - Update navigation history
   - Sync URL state
   - Update breadcrumbs
   - Handle navigation events

2. Life Stages Management
   - Load life stage settings
   - Update active stage
   - Filter content by stage
   - Update visual indicators
   - Sync with navigation

3. Tag Navigation
   - Load tag tree
   - Handle expansion state
   - Update active tags
   - Filter content
   - Sync with URL

#### 3.7.5 Open Questions
- How do we handle deep linking to specific navigation states?
- What's the best way to manage navigation history for large numbers of entries?
- How should we handle navigation state persistence?
- What's the optimal way to structure the tag tree for performance?
- How do we handle navigation conflicts between different navigation types?

## 4. Authentication System
Status: ✅ Operational

#### 4.1 Features
Vision: Provide secure, simple, and reliable authentication for family members while maintaining appropriate access controls

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

#### 4.2 Data Model
```typescript
interface User {
  // Core Properties
  id: string;
  email: string;
  role: 'author' | 'family';
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  displayName: string;     // 📅 User's display name
  preferences: {          // 📅 User preferences
    layout: string;
    theme: string;
    notifications: boolean;
  };
  lastLogin: Date;        // 📅 Last login timestamp
  viewHistory: string[];  // 📅 Recent view history
  security: {            // 📅 Security settings
    lastPasswordChange: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date;
  };
}

interface Session {
  // Core Properties
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;

  // Planned Properties
  device: {              // 📅 Device information
    type: string;
    browser: string;
    os: string;
  };
  location: {           // 📅 Location data
    ip: string;
    country?: string;
  };
  isActive: boolean;    // 📅 Session status
}
```

#### 4.3 Code Components
1. **Infrastructure Components**
   - ✅ `authService.ts` - Core authentication
   - ✅ `auth.types.ts` - Type definitions
   - ✅ `useAuth.ts` - Core auth hook
   - ✅ `useSession.ts` - Session management
   - 📅 `authValidation.ts` - Data validation
   - 📅 `authSecurity.ts` - Security features
   - 📅 `authLogger.ts` - Security logging

2. **Feature-Specific Components**
   - `components/features/auth/`
     - ✅ `LoginForm.tsx` - Login interface
     - ✅ `RegisterForm.tsx` - Registration form
     - ✅ `PasswordReset.tsx` - Password recovery
     - 📅 `ProfileSettings.tsx` - Profile management
     - 📅 `SecuritySettings.tsx` - Security options
     - 📅 `SessionManager.tsx` - Session control
     - 📅 `RoleManager.tsx` - Role management

3. **Pages**
   - ✅ `app/auth/login/page.tsx` - Login page
   - ✅ `app/auth/register/page.tsx` - Registration
   - ✅ `app/auth/reset/page.tsx` - Password reset
   - 📅 `app/auth/profile/page.tsx` - Profile page
   - 📅 `app/auth/security/page.tsx` - Security settings

#### 4.4 Implementation Flow
1. Authentication Flow
   - User submits credentials
   - Validate input
   - Check security limits
   - Verify credentials
   - Create session
   - Update user state

2. Session Management
   - Create session token
   - Track session state
   - Handle expiration
   - Manage refresh
   - Handle logout

3. Security Management
   - Track login attempts
   - Monitor session activity
   - Handle security events
   - Update security logs
   - Manage account locks

#### 4.5 Open Questions
- What additional security measures should we implement?
- How should we handle session persistence across devices?
- What's the best approach for role-based feature access?
- How do we handle account recovery for forgotten passwords?
- Should we implement two-factor authentication?

## 5. Backup System
Status: 🚧 In Progress

#### 5.1 Features
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

#### 5.2 Data Model
```typescript
interface Backup {
  // Core Properties
  id: string;
  timestamp: Date;
  type: 'auto' | 'manual';
  status: 'pending' | 'completed' | 'failed';
  size: number;
  path: string;

  // Planned Properties
  metadata: {            // 📅 Backup contents
    entryCount: number;
    mediaCount: number;
    tagCount: number;
    userCount: number;
  };
  checksum: string;      // 📅 Data integrity
  retention: Date;       // 📅 Expiration date
  notes: string;         // 📅 User notes
  storage: {            // 📅 Storage details
    location: 'local' | 'onedrive';
    path: string;
    version: string;
  };
}

interface BackupSettings {
  // Core Properties
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  schedule: {           // 📅 Backup schedule
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    days: string[];
  };
  retention: {          // 📅 Retention policy
    maxBackups: number;
    maxAge: number;
    keepVersions: boolean;
  };
  storage: {           // 📅 Storage settings
    primary: 'local' | 'onedrive';
    secondary?: 'local' | 'onedrive';
    compression: boolean;
  };
  notifications: {     // 📅 Notification settings
    onSuccess: boolean;
    onFailure: boolean;
    onWarning: boolean;
    recipients: string[];
  };
}
```

#### 5.3 Code Components
1. **Infrastructure Components**
   - ✅ `backupService.ts` - Core backup operations
   - ✅ `backup.types.ts` - Type definitions
   - ✅ `useBackup.ts` - Core backup hook
   - 📅 `backupScheduler.ts` - Schedule management
   - 📅 `backupValidation.ts` - Data validation
   - 📅 `backupStorage.ts` - Storage handling
   - 📅 `backupNotification.ts` - Notification system

2. **Feature-Specific Components**
   - `components/features/backup/`
     - ✅ `BackupList.tsx` - Backup listing
     - ✅ `BackupCreate.tsx` - Manual backup
     - ✅ `BackupRestore.tsx` - Restore interface
     - 📅 `BackupSettings.tsx` - Settings management
     - 📅 `BackupMonitor.tsx` - Status monitoring
     - 📅 `BackupHistory.tsx` - History view
     - 📅 `BackupPreview.tsx` - Content preview

3. **Pages**
   - ✅ `app/backup/page.tsx` - Backup management
   - ✅ `app/backup/restore/page.tsx` - Restore page
   - 📅 `app/backup/settings/page.tsx` - Settings page
   - 📅 `app/backup/history/page.tsx` - History page

#### 5.4 Implementation Flow
1. Backup Creation
   - Collect data
   - Validate content
   - Compress data
   - Generate checksum
   - Store backup
   - Update metadata

2. Automated Backup
   - Check schedule
   - Verify storage
   - Create backup
   - Rotate old backups
   - Send notifications
   - Update status

3. Restore Process
   - Select backup
   - Verify integrity
   - Prepare restore
   - Execute restore
   - Validate restore
   - Update system

#### 5.5 Open Questions
- How do we handle backup conflicts during active use?
- What's the best strategy for backing up media files?
- How should we handle backup encryption?
- What's the optimal backup frequency?
- How do we handle backup failures during the process?

## 6. AI Integration
Status: 📅 Planned

#### 6.1 Features
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

#### 6.2 Data Model
```typescript
interface AISuggestion {
  // Core Properties
  id: string;
  type: 'content' | 'tag' | 'question' | 'analysis';
  content: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  context: {            // 📅 Suggestion context
    entryId?: string;
    tags?: string[];
    theme?: string;
  };
  metadata: {          // 📅 Additional data
    source: string;
    model: string;
    parameters: Record<string, any>;
  };
  status: {           // 📅 Suggestion status
    isAccepted: boolean;
    isRejected: boolean;
    feedback?: string;
  };
}

interface AISettings {
  // Core Properties
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;

  // Planned Properties
  preferences: {      // 📅 User preferences
    enableContentSuggestions: boolean;
    enableTagSuggestions: boolean;
    enableQuestionGeneration: boolean;
    enableAnalysis: boolean;
  };
  style: {           // 📅 Style preferences
    tone: string;
    formality: string;
    length: string;
  };
  filters: {         // 📅 Content filters
    topics: string[];
    themes: string[];
    tags: string[];
  };
}
```

#### 6.3 Code Components
1. **Infrastructure Components**
   - 📅 `aiService.ts` - Core AI operations
   - 📅 `ai.types.ts` - Type definitions
   - 📅 `useAI.ts` - Core AI hook
   - 📅 `aiValidation.ts` - Data validation
   - 📅 `aiProcessing.ts` - Content processing
   - 📅 `aiAnalysis.ts` - Content analysis
   - 📅 `aiGeneration.ts` - Content generation

2. **Feature-Specific Components**
   - `components/features/ai/`
     - 📅 `ContentSuggestions.tsx` - Writing suggestions
     - 📅 `TagSuggestions.tsx` - Tag recommendations
     - 📅 `QuestionGenerator.tsx` - Question creation
     - 📅 `ContentAnalysis.tsx` - Content insights
     - 📅 `AISettings.tsx` - AI preferences
     - 📅 `SuggestionHistory.tsx` - Past suggestions
     - 📅 `FeedbackCollector.tsx` - User feedback

3. **Pages**
   - 📅 `app/ai/suggestions/page.tsx` - AI suggestions
   - 📅 `app/ai/analysis/page.tsx` - Content analysis
   - 📅 `app/ai/settings/page.tsx` - AI settings
   - 📅 `app/ai/history/page.tsx` - Suggestion history

#### 6.4 Implementation Flow
1. Content Processing
   - Analyze content
   - Generate suggestions
   - Validate output
   - Present options
   - Track feedback

2. Tag Management
   - Analyze content
   - Suggest tags
   - Validate relationships
   - Update tag tree
   - Track usage

3. Question Generation
   - Analyze context
   - Generate questions
   - Validate relevance
   - Track usage
   - Collect feedback

#### 6.5 Open Questions
- How do we ensure AI suggestions maintain the author's voice?
- What's the best way to handle AI confidence thresholds?
- How should we implement feedback loops for AI improvement?
- What's the optimal balance between AI assistance and human control?
- How do we handle potentially sensitive content in AI analysis?

## 7. Technical Infrastructure
Status: 🚧 In Progress
Vision: Provide a robust, scalable, and maintainable foundation
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
Vision: Create a responsive, performant user interface

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
Vision: Provide reliable and efficient data management

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

### 7.4 Directory Structure
```
project-root/
├── app/                      # ✅ Next.js app router
│   ├── (auth)/              # ✅ Authentication routes
│   │   ├── login/           # ✅ Login page
│   │   ├── register/        # ✅ Registration page
│   │   └── reset/           # ✅ Password reset
│   ├── entries/             # ✅ Entry management
│   │   ├── [id]/            # ✅ Entry view/edit
│   │   └── new/             # ✅ New entry
│   ├── tags/                # ✅ Tag management
│   │   └── [id]/            # ✅ Tag view
│   ├── media/               # 📅 Media management
│   │   ├── upload/          # 📅 Upload interface
│   │   └── [id]/            # 📅 Media view
│   ├── backup/              # ✅ Backup management
│   │   ├── restore/         # ✅ Restore interface
│   │   └── settings/        # 📅 Backup settings
│   ├── ai/                  # 📅 AI features
│   │   ├── suggestions/     # 📅 AI suggestions
│   │   └── settings/        # 📅 AI settings
│   └── layout.tsx           # ✅ Root layout
├── src/
│   ├── components/          # ✅ React components
│   │   ├── common/          # ✅ Shared components
│   │   ├── features/        # ✅ Feature components
│   │   │   ├── entries/     # ✅ Entry components
│   │   │   ├── tags/        # ✅ Tag components
│   │   │   ├── media/       # 📅 Media components
│   │   │   ├── backup/      # ✅ Backup components
│   │   │   └── ai/          # 📅 AI components
│   │   ├── layouts/         # ✅ Layout components
│   │   └── ui/              # ✅ UI components
│   ├── lib/                 # ✅ Core functionality
│   │   ├── hooks/           # ✅ Custom hooks
│   │   │   ├── useEntry.ts  # ✅ Entry hook
│   │   │   ├── useTags.ts   # ✅ Tags hook
│   │   │   ├── useMedia.ts  # 📅 Media hook
│   │   │   ├── useBackup.ts # ✅ Backup hook
│   │   │   └── useAI.ts     # 📅 AI hook
│   │   ├── services/        # ✅ API services
│   │   │   ├── entryService.ts    # ✅ Entry service
│   │   │   ├── tagService.ts      # ✅ Tag service
│   │   │   ├── mediaService.ts    # 📅 Media service
│   │   │   ├── backupService.ts   # ✅ Backup service
│   │   │   └── aiService.ts       # 📅 AI service
│   │   ├── scripts/         # ✅ Utility scripts
│   │   │   ├── firebase/    # ✅ Firebase scripts
│   │   │   └── migrations/  # ✅ Database migrations
│   │   ├── types/           # ✅ TypeScript types
│   │   └── utils/           # ✅ Utility functions
│   └── styles/              # ✅ Styling
│       ├── components/      # ✅ Component styles
│       ├── layouts/         # ✅ Layout styles
│       └── globals.css      # ✅ Global styles
├── public/                  # ✅ Static assets
│   ├── images/             # ✅ Image assets
│   │   ├── app/           # ✅ App images
│   │   ├── icons/         # ✅ App icons
│   │   └── cache/         # 📅 Image cache
│   └── fonts/             # ✅ Font files
├── docs/                   # ✅ Documentation
│   ├── api/               # ✅ API documentation
│   ├── components/        # ✅ Component docs
│   └── guides/            # ✅ User guides
├── tests/                 # 📅 Testing
│   ├── unit/             # 📅 Unit tests
│   ├── integration/      # 📅 Integration tests
│   └── e2e/              # 📅 E2E tests
└── scripts/              # ✅ Utility scripts
    ├── migrations/       # ✅ Database migrations
    └── backups/          # ✅ Backup operations
```

### 7.5 Development Rules and Guidelines

#### 7.5.1 Directory Naming
- Use lowercase with hyphens for directory names
- Keep names short but descriptive
- Follow established patterns for similar directories
- Avoid special characters in directory names

#### 7.5.2 File Organization
- Group related files together
- Keep file paths reasonably short
- Use consistent naming patterns
- Avoid deep nesting (max 4 levels recommended)

#### 7.5.3 Documentation
- Keep all documentation in `/docs`
- Use PascalCase for documentation file names
- Include document type in the name (e.g., `ProjectGuide.md`, `Vision.md`)
- Use descriptive names that indicate the document's purpose
- Maintain consistent formatting
- Include README files in key directories

#### 7.5.4 Source Code
- Follow Next.js 14 conventions
- Organize by feature when possible
- Keep components focused and modular
- Maintain clear separation of concerns

#### 7.5.5 Testing
- Keep tests close to the code they test
- Use consistent test file naming
- Maintain test directory structure
- Include test utilities and fixtures

### 7.6 Directory Structure Consistency

#### 7.6.1 App Router Structure
- All routes MUST be created within the `app/` directory
- Route groups MUST use `(group)` syntax for organization
- Dynamic routes MUST use `[param]` syntax
- Layout files MUST be named `layout.tsx`
- Page files MUST be named `page.tsx`
- Loading states MUST be in `loading.tsx`
- Error boundaries MUST be in `error.tsx`
- Not found pages MUST be in `not-found.tsx`

#### 7.6.2 Component Organization
- Shared components MUST be in `src/components/`
- Feature components MUST be in `src/components/features/`
- Layout components MUST be in `src/components/layouts/`
- UI components MUST be in `src/components/ui/`
- Private components MUST use `_` prefix (e.g., `_components/`)
- Component files MUST be PascalCase
- Component styles MUST be in `src/styles/components/`
- No co-location of styles is permitted

#### 7.6.3 API and Services
- API routes MUST be in `app/api/`
- API handlers MUST be in `route.ts` files
- Service modules MUST be in `src/lib/api/`
- Firebase services MUST be in `src/lib/api/firebase/`
- External API integrations MUST be in `src/lib/api/[service]/`

#### 7.6.4 Data Management
- Database models MUST be in `src/types/models/`
- Database queries MUST be in `src/lib/db/queries/`
- Data hooks MUST be in `src/lib/hooks/`
- State management MUST be in `src/lib/state/`

#### 7.6.5 Media and Assets
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

#### 7.6.6 Authentication
- Auth components MUST be in `src/components/features/auth/`
- Auth utilities MUST be in `src/lib/auth/`
- Auth hooks MUST be in `src/lib/hooks/auth/`
- Protected routes MUST be in `app/(auth)/`

#### 7.6.7 Documentation
- Project docs MUST be in `docs/`
- API docs MUST be in `docs/api/`
- Component docs MUST be in `docs/components/`
- README files MUST be in all major directories
- Documentation MUST be in Markdown format

#### 7.6.8 Testing
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

#### 7.6.9 Configuration
- Environment files MUST be in root directory
- Build config MUST be in root directory
- TypeScript config MUST be in root directory
- ESLint config MUST be in root directory
- Style config MUST be in root directory
- Firebase config MUST be in `src/lib/config/`

#### 7.6.10 Code Organization
- Utility functions MUST be in `src/utils/`
- Custom hooks MUST be in `src/lib/hooks/`
- Constants MUST be in `src/lib/constants/`
- Types MUST be in `src/types/`
- Styles MUST be in `src/styles/`

#### 7.6.11 File Naming
- React components MUST be PascalCase
- Utility files MUST be camelCase
- Test files MUST end with `.test.ts` or `.test.tsx`
- Style files MUST be `[name].module.css`
- Type files MUST be `[name].types.ts`

### 7.7 Import Path Rules

#### 7.7.1 Use Absolute Imports with `@/` Alias
- All imports MUST use the `@/` alias pointing to `src/`
- Example: `import { Entry } from '@/types/entry'`
- This makes imports more maintainable and less brittle to file moves

#### 7.7.2 Import Order
1. External dependencies first
2. Internal absolute imports (with `@/`) second
3. Relative imports last (if absolutely necessary)

#### 7.7.3 Service Imports
- All service imports MUST come from `@/lib/services/`
- Example: `import { db } from '@/lib/services/firebase'`
- No direct imports from external services (e.g., Firebase) in components

#### 7.7.4 Configuration Imports
- All configuration imports MUST come from `@/lib/config/`
- Example: `import { firebaseConfig } from '@/lib/config/firebase'`

#### 7.7.5 Data Management Imports
- All data management imports MUST come from `@/lib/data/`
- Example: `import { getEntry } from '@/lib/data/entryService'`

### 7.8 Hook Rules

#### 7.8.1 Centralized Hook Location
- All hooks MUST be in `src/lib/hooks/`
- No hooks should exist outside this directory
- This makes hooks easily discoverable and maintainable

#### 7.8.2 Hook Naming Convention
- All hooks MUST be prefixed with `use`
- Example: `useEntry`, `useStories`, `useAuth`
- The filename MUST match the hook name
- Example: `useEntry.ts` for the `useEntry` hook

#### 7.8.3 Hook Organization
- Group related hooks in the same file
- Keep hooks focused on a single responsibility
- Export hooks individually for better tree-shaking
- Example: `export const useEntry = () => { ... }`

#### 7.8.4 Hook Dependencies
- Hooks MUST import from services, not directly from Firebase or other external sources
- Example: `import { getEntry } from '@/lib/data/entryService'` instead of direct Firebase imports
- This ensures proper abstraction and maintainability

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

