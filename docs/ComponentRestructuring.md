# Component Restructuring Plan

## Current Structure
```
src/
├── app/                   
│   ├── page.tsx
│   ├── layout.tsx
│   ├── index.tsx
│   ├── api/
│   │   ├── content/
│   │   ├── sections/
│   │   └── entries/
│   ├── admin/  
│   │   ├── entries/
│   │   │   └── page.tsx
│   │   ├── albums/
│   │   │   └── page.tsx
│   │   └── tags/
│   │       └── page.tsx
│   ├── albums/            
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   ├── entries/  
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   ├── tags/   
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   └── test/                         
│
├── components/
│   ├── common/            # Generic components
│   │   ├── CardGrid.tsx
│   │   ├── ContentCard.tsx
│   │   ├── Home.tsx
│   │   ├── Layout.tsx
│   │   ├── LayoutWrapper.tsx
│   │   ├── Pagination.tsx
│   │   ├── RootLayoutWrapper.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── ViewSelector.tsx
│   │   └── editor/
│   │       ├── ImageUploadDialog.tsx
│   │       └── RichTextEditor.tsx
│   │
│   ├── deprecated/        # Old components
│   │   ├── CategoryNavigation.tsx
│   │   ├── Home.tsx
│   │   ├── Layout.tsx
│   │   ├── LayoutWrapper.tsx
│   │   ├── LifeStagesSidebar.tsx
│   │   ├── Navigation.tsx
│   │   ├── SectionNavigation.tsx
│   │   ├── StoryCard.tsx
│   │   ├── StoryPage.tsx
│   │   └── ViewSelector.tsx
│   │
│   ├── features/
│   │   ├── album/
│   │   │   └── AlbumView.tsx
│   │   ├── entry/
│   │   │   ├── EntryCard.tsx
│   │   │   ├── EntryForm.tsx
│   │   │   ├── EntryPage.tsx
│   │   │   ├── EntryTemplate.tsx
│   │   │   └── TagSelector.tsx
│   │   ├── tags/
│   │   │   ├── TagBox.tsx
│   │   │   ├── TagBoxGrid.tsx
│   │   │   └── TagNavigation.tsx
│   │   └── layouts/
│   │       ├── AccordionLayout.tsx
│   │       ├── BlogLayout.tsx
│   │       ├── CardLayout.tsx
│   │       ├── MagazineLayout.tsx
│   │       └── TimelineLayout.tsx
│   │
│   ├── layouts/
│   │   ├── MagazineLayout.tsx
│   │   ├── TimelineLayout.tsx
│   │   ├── CardLayout.tsx
│   │   ├── BlogLayout.tsx
│   │   ├── CardLayout.module.css
│   │   ├── AccordionLayout.tsx
│   │   ├── BlogLayout.module.css
│   │   └── AccordionLayout.module.css
│   │
│   └── navigation/
│       ├── LifeStagesSidebar.tsx
│       ├── Navigation.tsx
│       └── SlideOutNavigation.tsx
│
└── lib/
    └── styles/
        ├── globals.css
        ├── fonts.css
        ├── app/          
        │   ├── admin/
        │   │   └── layout.module.css
        │   ├── categories/
        │   │   ├── [categoryId]/
        │   │   │   └── page.module.css
        │   │   └── page.module.css
        │   ├── edit/
        │   │   └── edit.module.css
        │   ├── tags/
        │   ├── entries.module.css
        │   ├── entries.css
        │   └── albums.css
        ├── pages/
        ├── components/   
        │   ├── navigation/
        │   │   ├── NavigationDemo.module.css
        │   │   ├── Navigation.module.css
        │   │   ├── CategoryNavigation.module.css
        │   │   ├── SlideOutNavigation.module.css
        │   │   └── NavigationSidebar.module.css
        │   ├── features/
        │   │   ├── tag/
        │   │   │   ├── tag.css
        │   │   │   ├── TagBoxGrid.module.css
        │   │   │   └── TagBox.module.css
        │   │   ├── entry/
        │   │   │   ├── EntryPage.module.css
        │   │   │   ├── EntryTemplate.module.css
        │   │   │   ├── EntryCard.module.css
        │   │   │   ├── EntryForm.module.css
        │   │   │   └── TagSelector.module.css
        │   │   └── album/
        │   │       └── AlbumView.module.css
        │   ├── common/
        │   │   ├── editor/
        │   │   │   ├── RichTextEditor.module.css
        │   │   │   └── ImageUploadDialog.module.css
        │   │   ├── ThemeToggle.module.css
        │   │   ├── ContentCard.module.css
        │   │   ├── LayoutWrapper.module.css
        │   │   └── ViewSelector.module.css
        │   ├── deprecated/
        │   │   └── LifeStagesSidebar.module.css
        │   ├── layouts/
        │   │   ├── Layout.module.css
        │   │   ├── CardGrid.module.css
        │   │   ├── TimelineLayout.module.css
        │   │   ├── BlogLayout.module.css
        │   │   ├── AccordionLayout.module.css
        │   │   ├── CardLayout.module.css
        │   │   ├── MagazineLayout.module.css
        │   │   └── PageTemplate.module.css
        │   ├── content/
        │   │   ├── StoryCard.module.css
        │   │   ├── MasonryLayout.module.css
        │   │   ├── MagazineLayout.module.css
        │   │   ├── StoryDetail.module.css
        │   │   └── TagBrowser.module.css
        │   ├── entry/
        │   │   ├── StoryPage.module.css
        │   │   └── StoryTemplate.module.css
        │   └── about/
        │       └── About.module.css
        └── themes/
```

## New Structure
```
src/                                            * All Source code
├── app/                   
│   ├── page.tsx          
│   ├── layout.tsx        
│   ├── index.tsx         
│   ├── api/                                    * All API Routes
│   │   ├── content/
│   │   ├── sections/
│   │   └── entries/
│   ├── admin/                                  * Administration Routes
│   │   ├── entries/
│   │   │   └── page.tsx
│   │   ├── albums/
│   │   │   └── page.tsx
│   │   └── tags/
│   │       └── page.tsx
│   ├── albums/                                 * Album Routes
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   ├── entries/                                * Entry Routes
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── edit/
│   │   │       └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   └── tags/                                   * Tag Routes
│       ├── [id]/
│       │   ├── page.tsx
│       │   └── edit/
│       │       └── page.tsx
│       └── new/
│           └── page.tsx
│
├── components/
│   ├── layouts/
│   │   └── MainLayout.tsx
│   │
│   ├── navigation/
│   │   ├── HeaderNav.tsx
│   │   ├── SidebarTabs.tsx
│   │   ├── FilterTab.tsx
│   │   ├── TimelineTab.tsx
│   │   └── SearchTab.tsx
│   │
│   ├── cards/
│   │   ├── DimensionCard.tsx
│   │   ├── TagCard.tsx
│   │   ├── EntryCard.tsx
│   │   ├── AlbumCard.tsx
│   │   └── CardGrid.tsx
│   │
│   ├── content/
│   │   ├── EntryView.tsx
│   │   ├── EntryEditor.tsx
│   │   ├── AlbumView.tsx
│   │   └── AlbumEditor.tsx
│   │
│   └── admin/
│       ├── TagManager.tsx
│       ├── EntryManager.tsx
│       └── AlbumManager.tsx
│
└── lib/                                         * All app resources organized here
    ├── config/
    ├── contexts/
    ├── firebase/
    ├── hooks/
    ├── mocks/
    ├── scripts/
    ├── services/
    └── styles/                                  * Structure mirrors app/ and components/
        ├── globals.css
        ├── fonts.css
        ├── app/           
        │   ├── admin/
        │   │   └── layout.module.css
        │   ├── tags/
        │   ├── entries.module.css
        │   ├── entries.css
        │   └── albums.css
        ├── components/                 # Component-level styles (mirrors components/)
        │   ├── layout/
        │   │   └── MainLayout.module.css
        │   ├── navigation/
        │   │   ├── HeaderNav.module.css
        │   │   ├── SidebarTabs.module.css
        │   │   ├── FilterTab.module.css
        │   │   ├── TimelineTab.module.css
        │   │   └── SearchTab.module.css
        │   ├── cards/
        │   │   ├── DimensionCard.module.css
        │   │   ├── TagCard.module.css
        │   │   ├── EntryCard.module.css
        │   │   ├── AlbumCard.module.css
        │   │   └── CardGrid.module.css
        │   ├── content/
        │   │   ├── EntryView.module.css
        │   │   ├──EntryEditor.module.css
        │   |   ├── AlbumView.module.css
        │   |   └── AlbumEditor.module.css
        │   └── admin/
        │       ├── TagManager.module.css
        │       ├── EntryManager.module.css
        │       └── AlbumManager.module.css
        └── themes/

        type

```
