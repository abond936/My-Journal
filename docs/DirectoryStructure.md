# Project Directory Structure

```
src/
├── __tests__/          
│   ├── components/
│   │   ├── admin/         
│   │   │   ├── AlbumManager.tsx
│   │   │   ├── EntryManager.tsx
│   │   │   └── TagManager.tsx
│   │   │
│   │   ├── cards/         
│   │   │   ├── AlbumCard.tsx
│   │   │   ├── CardGrid.tsx
│   │   │   ├── DimensionCard.tsx
│   │   │   ├── EntryCard.tsx
│   │   │   └── TagCard.tsx
│   │   │
│   │   ├── content/       
│   │   │   ├── AlbumView.tsx
│   │   │   ├── EntryEditor.tsx
│   │   │   ├── EntryView.tsx
│   │   │   └── PhotoView.tsx
│   │   │
│   │   ├── layouts/       
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── ContentLayout.tsx
│   │   │   └── MainLayout.tsx
│   │   │
│   │   ├── navigation/    
│   │   │   ├── FilterTab.tsx
│   │   │   ├── HeaderNav.tsx
│   │   │   ├── SearchTab.tsx
│   │   │   ├── SidebarTabs.tsx
│   │   │   └── TimelineTab.tsx
│   │   │
│   │   └── shared/        
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ThemeProvider.tsx
│   │
│   └── lib/
│       ├── config/        
│       │   ├── constants.ts
│       │   └── settings.ts
│       │
│       ├── contexts/      
│       │   ├── AuthContext.tsx
│       │   └── ThemeContext.tsx
│       │
│       ├── data/          
│       │   ├── fixtures/
│       │   └── mocks/
│       │
│       ├── firebase/      
│       │   ├── config.ts
│       │   ├── auth.ts
│       │   └── storage.ts
│       │
│       ├── hooks/         
│       │   ├── useAlbums.ts
│       │   ├── useAuth.ts
│       │   └── useEntries.ts
│       │
│       ├── services/      
│       │   ├── api.ts
│       │   ├── firebase.ts
│       │   └── storage.ts
│       │
│       ├── styles/        
│       │   ├── app/       
│       │   │   ├── admin/
│       │   │   ├── albums/
│       │   │   ├── entries/
│       │   │   └── tags/
│       │   │
│       │   ├── components/
│       │   │   ├── admin/
│       │   │   ├── cards/
│       │   │   ├── content/
│       │   │   ├── layouts/
│       │   │   ├── navigation/
│       │   │   └── shared/
│       │   │
│       │   ├── globals.css
│       │   └── variables.css
│       │
│       ├── types/         
│       │   ├── album.ts
│       │   ├── entry.ts
│       │   ├── tag.ts
│       │   └── ui.ts
│       │
│       └── utils/         
│           ├── date.ts
│           ├── formatting.ts
│           └── validation.ts
│
└── app/               
    ├── admin/         
    ├── albums/        
    ├── api/           
    ├── entries/       
    ├── tags/          
    ├── test/          
    ├── index.tsx      
    ├── layout.tsx     
    └── page.tsx       
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