# Project Structure

```
src/app/
├── admin/                              # Admin area
│   ├── album-management/               # Album management
│   │   ├── album-management.module.css
│   │   └── page.tsx                    # List albums
│   │   ├── new/                        # Create new album
│   │   │   └── page.tsx
│   │   └── [id]/                       # Edit specific album
│   │       └── edit/
│   │           └── page.tsx
│   │
│   ├── entry-management/               # Entry management
│   │   ├── entry-management.module.css
│   │   └── page.tsx                    # List entries
│   │   ├── new/                        # Create new entry
│   │   │   └── page.tsx
│   │   └── [id]/                       # Edit specific entry
│   │       └── edit/
│   │           └── page.tsx
│   │
│   ├── tag-management/                 # Tag management
│   │   ├── tag-management.module.css
│   │   └── page.tsx                    # List tags
│   │   ├── new/                        # Create new tag
│   │   │   └── page.tsx
│   │   └── [id]/                       # Edit specific tag
│   │       └── edit/
│   │           └── page.tsx
│   │
│   └── layout.tsx                      # Admin layout
│
├── view/                               # Public viewing area
│   ├── album-view/                     # Album viewing
│   │   ├── album-view.module.css
│   │   └── page.tsx                    # List albums
│   │   └── [id]/                       # View specific album
│   │       └── page.tsx
│   │
│   ├── entry-view/                     # Entry viewing
│   │   ├── entry-view.module.css
│   │   └── page.tsx                    # List entries
│   │   └── [id]/                       # View specific entry
│   │       └── page.tsx
│   │
│   └── tag-view/                       # Tag viewing
│       ├── tag-view.module.css
│       └── page.tsx                    # List tags
│       └── [id]/                       # View specific tag
│           └── page.tsx
│
├── layout.tsx                          # Root layout
└── page.tsx                            # Home page
|
├── components/
│   ├── admin/
│   │   ├── AlbumManager/
│   │   │   ├── AlbumManager.module.css
│   │   │   ├── AlbumManager.tsx
│   │   │   ├── AlbumForm.tsx
│   │   │   └── AlbumList.tsx
│   │   ├── EntryManager/
│   │   │   ├── EntryManager.module.css
│   │   │   ├── EntryManager.tsx
│   │   │   ├── EntryForm.tsx
│   │   │   └── EntryList.tsx
│   │   └── TagManager/
│   │       ├── TagManager.module.css
│   │       ├── TagManager.tsx
│   │       ├── TagForm.tsx
│   │       └── TagList.tsx
│   ├── common/
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ThemeProvider.tsx
│   ├── layouts/
│   │   ├── AdminLayout.tsx
│   │   ├── ViewLayout.tsx
│   │   └── RootWrapper.tsx
│   ├── navigation/
│   │   ├── AdminSidebar.tsx
│   │   ├── ContentSidebar.tsx
│   │   ├── SidebarTabs.tsx
│   │   └── TagTree.tsx
│   └── view/
│       ├── AlbumView/
│       │   ├── AlbumCard.tsx
│       │   ├── AlbumView.module.css
│       │   └── AlbumView.tsx
│       ├── EntryView/
│       │   ├── EntryCard.tsx
│       │   ├── EntryView.module.css
│       │   └── EntryView.tsx
│       └── TagView/
│           ├── TagCard.tsx
│           ├── TagView.module.css
│           └── TagView.tsx
│
├── lib/
│   ├── config/
│   ├── contexts/
│   ├── firebase/
│   ├── hooks/
│   ├── scripts/
│   ├── services/
│   │   ├── albumService.ts
│   │   ├── entryService.ts
│   │   └── tagService.ts
│   ├── types/
│   │   ├── album.ts
│   │   ├── entry.ts
│   │   └── tag.ts
│   └── utils/
│       ├── albumUtils.ts
│       ├── entryUtils.ts
│       └── tagUtils.ts
```

