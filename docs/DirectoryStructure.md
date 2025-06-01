# Project Directory Structure
Last Updated: 2024-03-19

## Root Directory
```
project-root/
├── .cursor/                 # IDE specific directory
├── .git/                    # Version control
├── .next/                   # Next.js build output
├── docs/                    # Documentation
├── exports/                 # Export directory
├── node_modules/            # Dependencies
├── out/                     # Next.js static export
├── public/                  # Static assets
│   ├── images/             # Image assets
│   │   ├── icons/         # Icon assets
│   │   └── backgrounds/   # Background images
│   └── fonts/             # Font assets
├── rules/                   # Rules directory
├── src/                     # Source code
│
├── Configuration Files:
│   ├── .firebaserc         # Firebase configuration
│   ├── .gitignore          # Git ignore rules
│   ├── categories.txt      # Categories data
│   ├── debug_summary.md    # Debug documentation
│   ├── eslint.config.mjs   # ESLint configuration
│   ├── firebase.json       # Firebase configuration
│   ├── firestore.rules     # Firestore rules
│   ├── manifest.json       # Web manifest
│   ├── next.config.js      # Next.js configuration
│   ├── next.config.ts      # Next.js TypeScript config
│   ├── package.json        # NPM configuration
│   ├── package-lock.json   # NPM lock file
│   ├── Project Guide.txt   # Project documentation
│   ├── README.md           # Project readme
│   ├── tsconfig.json       # TypeScript configuration
│   └── tsconfig.scripts.json # TypeScript scripts config
```

## Source Directory (src/)
```
src/
├── app/                     # Next.js app router
│   ├── admin/              # Admin section
│   │   ├── albums/
│   │   │   └── page.tsx (12KB, 348 lines)
│   │   ├── entries/
│   │   │   └── page.tsx (19KB, 545 lines)
│   │   ├── tags/
│   │   │   ├── page.tsx (28KB, 842 lines)
│   │   │   └── SortableTag.tsx (1.2KB, 54 lines)
│   │   └── layout.tsx (1.5KB, 56 lines)
│   │
│   ├── albums/             # Album management
│   ├── api/                # API routes
│   ├── edit/               # Edit interface
│   ├── entries/            # Entry management
│   │   ├── [id]/
│   │   │   ├── edit/
│   │   │   └── page.tsx (1KB, 31 lines)
│   │   ├── category/
│   │   │   └── [categoryId]/
│   │   │       ├── page.module.css (1.4KB, 98 lines)
│   │   │       └── page.tsx (352B, 16 lines)
│   │   ├── new/
│   │   │   └── page.tsx (743B, 31 lines)
│   │   └── page.tsx (5KB, 167 lines)
│   │
│   ├── stories/            # Story management
│   ├── storyTemplates/     # Story templates
│   ├── tags/               # Tag management
│   ├── test/               # Test directory
│   ├── favicon.ico         # Favicon
│   ├── index.tsx (2.7KB, 85 lines)
│   ├── layout.tsx (860B, 30 lines)
│   └── page.tsx (256B, 9 lines)
│
├── components/             # React components
│   ├── common/            # Common components
│   │   ├── editor/
│   │   │   ├── ImageUploadDialog.tsx (3.5KB, 116 lines)
│   │   │   └── RichTextEditor.tsx (4.4KB, 144 lines)
│   │   ├── Layout.tsx (1.1KB, 44 lines)
│   │   ├── Home.tsx (1.4KB, 57 lines)
│   │   ├── LayoutWrapper.tsx (1KB, 30 lines)
│   │   ├── ContentCard.tsx (4.6KB, 148 lines)
│   │   ├── RootLayoutWrapper.tsx (735B, 27 lines)
│   │   ├── ViewSelector.tsx (1.3KB, 40 lines)
│   │   └── Pagination.tsx (3.7KB, 112 lines)
│   │
│   ├── deprecated/        # Deprecated components
│   │   ├── Navigation.tsx
│   │   ├── LayoutWrapper.tsx
│   │   ├── Home.tsx
│   │   ├── LifeStagesSidebar.tsx
│   │   ├── CategoryNavigation.tsx
│   │   ├── ViewSelector.tsx
│   │   ├── MagazineLayout.tsx
│   │   ├── StoryPage.tsx
│   │   ├── StoryTemplate.tsx
│   │   ├── StoryCard.tsx
│   │   ├── SectionNavigation.tsx
│   │   └── README.md
│   │
│   ├── features/          # Feature components
│   │   ├── entry/
│   │   │   ├── EntryPage.tsx (1.8KB, 64 lines)
│   │   │   ├── EntryTemplate.tsx (3.6KB, 118 lines)
│   │   │   ├── EntryCard.tsx (1.9KB, 76 lines)
│   │   │   ├── EntryForm.tsx (6.4KB, 221 lines)
│   │   │   └── TagSelector.tsx (5.6KB, 186 lines)
│   │   ├── story/        # Empty directory
│   │   └── album/
│   │       └── AlbumView.tsx (3.9KB, 128 lines)
│   │
│   ├── layouts/          # Layout components
│   │   ├── MagazineLayout.tsx (3.6KB, 128 lines)
│   │   ├── TimelineLayout.module.css (2.7KB, 175 lines)
│   │   ├── TimelineLayout.tsx (2.6KB, 83 lines)
│   │   ├── CardLayout.tsx (1.9KB, 71 lines)
│   │   ├── BlogLayout.tsx (2KB, 73 lines)
│   │   ├── CardLayout.module.css (1.8KB, 117 lines)
│   │   ├── AccordionLayout.tsx (2.7KB, 91 lines)
│   │   ├── BlogLayout.module.css (1.5KB, 104 lines)
│   │   ├── AccordionLayout.module.css (2.1KB, 144 lines)
│   │   └── CardGrid.tsx (2.7KB, 114 lines)
│   │
│   └── navigation/       # Navigation components
│       ├── LifeStagesSidebar.tsx (4.5KB, 153 lines)
│       ├── Navigation.tsx (3.1KB, 114 lines)
│       ├── SlideOutNavigation.tsx (4.1KB, 161 lines)
│       ├── TagBoxGrid.tsx (1.3KB, 49 lines)
│       ├── TagBox.tsx (1.5KB, 59 lines)
│       └── TagNavigation.tsx (809B, 32 lines)
│
├── lib/                  # Core functionality
│   ├── config/          # Configuration
│   │   └── firebase/    # Firebase configuration
│   │       ├── admin.ts
│   │       ├── client.ts
│   │       └── rules.ts
│   │
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom hooks
│   │   ├── useStory.ts (932B, 35 lines)
│   │   ├── useStories.ts (1.4KB, 47 lines)
│   │   ├── useEntry.ts (1.4KB, 55 lines)
│   │   └── useEntries.ts (2.5KB, 87 lines)
│   │
│   ├── mocks/          # Mock data
│   ├── scripts/        # Utility scripts
│   │   ├── firebase/   # Firebase scripts
│   │   ├── tags/       # Tag management scripts
│   │   ├── entries/    # Entry management scripts
│   │   ├── utils/      # Utility scripts
│   │   └── migration/  # Migration scripts
│   │
│   ├── services/       # API services
│   │   ├── auth.d.ts (256B, 13 lines)
│   │   ├── tagService.ts (4.9KB, 177 lines)
│   │   ├── albumService.ts (1.6KB, 55 lines)
│   │   ├── entryService.ts (6.9KB, 254 lines)
│   │   ├── cacheService.ts (1.6KB, 73 lines)
│   │   └── auth.tsx (1.8KB, 79 lines)
│   │
│   ├── styles/         # Styling
│   │   ├── components/ # Component styles
│   │   ├── layouts/    # Layout styles
│   │   └── globals.css # Global styles
│   │
│   ├── types/          # TypeScript types
│   │   ├── album.ts (225B, 11 lines)
│   │   ├── tag.ts (237B, 10 lines)
│   │   ├── entry.ts (1.2KB, 43 lines)
│   │   └── ui.ts (917B, 26 lines)
│   │
│   ├── auth.tsx (643B, 32 lines)
│   ├── firebase.ts (836B, 25 lines)
│   ├── journal.ts (2.4KB, 87 lines)
│   ├── supabase.ts (415B, 13 lines)
│   └── tags.ts (1.5KB, 46 lines)
│
├── data/              # Data directory
│   └── migration/     # Migration data
│       └── firebase/  # Firebase migration data
│
└── types/            # TypeScript types
```

## Notes
1. File sizes are shown in KB (kilobytes)
2. Line counts are approximate
3. Some directories may be empty or not fully explored
4. Configuration files at root level may need reorganization

## Recent Changes
1. Moved deprecated components to `components/deprecated/`
2. Organized scripts by purpose in `lib/scripts/`
3. Moved Firebase configuration to `lib/config/firebase/`
4. Moved styles to `lib/styles/`
5. Moved migration data to `data/migration/`
6. Organized public assets in `public/images/`

## Recommendations
1. Move configuration files to appropriate directories
2. Organize components by feature
3. Consolidate duplicate files
4. Add proper testing structure
5. Review and document custom patterns 