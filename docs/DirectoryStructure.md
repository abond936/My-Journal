# Project Directory Structure

```
src/
├── __tests__/          # Test files
│   ├── components/
│   │   ├── admin/         # Admin interface components
│   │   │   ├── AlbumManager.tsx
│   │   │   ├── EntryManager.tsx
│   │   │   └── TagManager.tsx
│   │   │
│   │   ├── cards/         # Card components
│   │   │   ├── AlbumCard.tsx
│   │   │   ├── CardGrid.tsx
│   │   │   ├── DimensionCard.tsx
│   │   │   ├── EntryCard.tsx
│   │   │   └── TagCard.tsx
│   │   │
│   │   ├── content/       # Content viewing components
│   │   │   ├── AlbumView.tsx
│   │   │   ├── EntryEditor.tsx
│   │   │   ├── EntryView.tsx
│   │   │   └── PhotoView.tsx
│   │   │
│   │   ├── layouts/       # Layout components
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── ContentLayout.tsx
│   │   │   └── MainLayout.tsx
│   │   │
│   │   ├── navigation/    # Navigation components
│   │   │   ├── FilterTab.tsx
│   │   │   ├── HeaderNav.tsx
│   │   │   ├── SearchTab.tsx
│   │   │   ├── SidebarTabs.tsx
│   │   │   └── TimelineTab.tsx
│   │   │
│   │   └── shared/        # Truly reusable components
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ThemeProvider.tsx
│   │
│   └── lib/
│       ├── config/        # Configuration files
│       │   ├── constants.ts
│       │   └── settings.ts
│       │
│       ├── contexts/      # React contexts
│       │   ├── AuthContext.tsx
│       │   └── ThemeContext.tsx
│       │
│       ├── data/          # Static data and mocks
│       │   ├── fixtures/
│       │   └── mocks/
│       │
│       ├── firebase/      # Firebase configuration and utilities
│       │   ├── config.ts
│       │   ├── auth.ts
│       │   └── storage.ts
│       │
│       ├── hooks/         # Custom React hooks
│       │   ├── useAlbums.ts
│       │   ├── useAuth.ts
│       │   └── useEntries.ts
│       │
│       ├── services/      # Service layer
│       │   ├── api.ts
│       │   ├── firebase.ts
│       │   └── storage.ts
│       │
│       ├── styles/        # Global styles and CSS modules
│       │   ├── components/
│       │   │   ├── admin/
│       │   │   ├── cards/
│       │   │   ├── content/
│       │   │   ├── layouts/
│       │   │   ├── navigation/
│       │   │   └── shared/
│       │   │
│       │   ├── app/       # App-specific styles
│       │   │   ├── admin/
│       │   │   ├── albums/
│       │   │   ├── entries/
│       │   │   └── tags/
│       │   │
│       │   ├── globals.css
│       │   └── variables.css
│       │
│       ├── types/         # TypeScript type definitions
│       │   ├── album.ts
│       │   ├── entry.ts
│       │   ├── tag.ts
│       │   └── ui.ts
│       │
│       └── utils/         # Utility functions
│           ├── date.ts
│           ├── formatting.ts
│           └── validation.ts
│
└── app/                # Next.js app directory
    ├── admin/         # Admin routes
    ├── albums/        # Album routes
    ├── api/           # API routes
    ├── entries/       # Entry routes
    ├── tags/          # Tag routes
    ├── test/          # Test routes
    ├── index.tsx      # Home page
    ├── layout.tsx     # Root layout
    └── page.tsx       # Root page
```

## Directory Structure Notes

### App Directory
- Contains all Next.js routes and pages
- Organized by feature (admin, albums, entries, tags)
- Includes API routes and test routes
- Root layout and pages for the main application structure

### Components Directory
- Organized by function rather than feature
- Clear separation between different types of components
- Shared components are isolated in their own directory
- Each component type has its own directory for better organization

### Lib Directory
- Contains all shared resources and utilities
- Organized by type (config, contexts, data, etc.)
- Styles mirror the component and app structure
- Types are centralized for better type safety and reuse

### Test Directory
- Mirrors the main application structure
- Separate directories for different types of tests
- Includes integration tests for complex features 