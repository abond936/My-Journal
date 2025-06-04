# Codebase Reorganization Plan

## Rationale

The application is composed of three primary elements:
    - Albums - Collections of images
    - Entries - Text with embedded images
    - Tags - Heirachical categorization of albums and entries

The directory structure is aligned principally around the two primary functions of:
    - Administration - Adding, changing, deleting the elements: albums, entries and tags.
    - Consumption - Viewing the elements (albums and entries) filtered by tags. 

The strucutre is secondarily aligned by the elements of the application:
    - Albums
    - Entries
    - Tags

app/ routes are organized by admin/ and view/
components/ not specific to admin or view are in common/ 

## 1. Navigation Components
Current Location: `src/components/navigation/`
```
Navigation.tsx → Move to src/components/common/
SlideOutNavigation.tsx → Move to src/components/view/
AdminSidebar.tsx → Keep in src/components/admin/
AdminFAB.tsx → Keep in src/components/admin/
AdminSidebar.module.css → Keep in src/components/admin/
LifeStagesSidebar.tsx → Rename to TagTree.tsx and move to src/components/common/
```

## 2. Layout Components
Current Location: `src/components/layouts/`
```
ViewLayout.tsx → Keep in src/components/view/
ViewLayout.module.css → Keep in src/components/view/
AppWrapper.tsx → Move to src/components/common/
AppLayout.tsx → Move to src/components/common/
AppLayout.module.css → Move to src/components/common/
AppFrame.tsx → Keep in src/components/view/
AppFrame.module.css → Keep in src/components/view/
PageTemplate.module.css → Move to src/components/view/
```

## 3. Common Components
Current Location: `src/components/common/`
```
Home.tsx → Move to src/components/view/
ContentCard.tsx → Move to src/components/view/
ThemeToggle.tsx → Keep in place
ThemeProvider.tsx → Keep in place
ContentCard.module.css → Move to src/components/view/
Pagination.tsx → Keep in place
editor/ → Keep contents in common/ (remove editor/ directory)
```

## 4. Card Components
Current Location: `src/components/cards/`
```
CardGrid.tsx → Move to src/components/view/
CardGrid.module.css → Move to src/components/view/
```

## 5. Feature Components
Current Location: `src/components/features/`

### Entry Components
```
EntryForm.tsx → Move to src/components/admin/entry-admin/
EntryTemplate.tsx → Move to src/components/view/entry-view/
EntryPage.tsx → Move to src/components/view/entry-view/
EntryCard.tsx → Move to src/components/view/entry-view/
TagSelector.tsx → Move to src/components/common/
TagSelector.module.css → Move to src/components/common/
EntryForm.module.css → Move to src/components/admin/entry-admin/
```

### Album Components
```
AlbumView.tsx → Move to src/components/view/album-view/
```

### Tag Components
Current Location: `src/components/features/tags/`
```
TagNavigation.tsx → Move to src/components/common/ (keep name)
TagBox.tsx → Move to src/components/common/
TagBoxGrid.tsx → Move to src/components/common/
```

### Tag Styles
Current Location: `src/app/view/tag-view/`
```
TagBox.module.css → Move to src/components/common/
TagBoxGrid.module.css → Move to src/components/common/
TagNavigation.module.css → Move to src/components/common/
```

## 6. Directory Structure Changes
```
Delete: src/components/features/ (after migration)
Delete: src/components/cards/ (after migration)
Delete: src/components/navigation/ (after migration)
Delete: src/components/layouts/ (after migration)
Delete: src/components/common/editor/ (after migration)
```

## 7. Import Updates Required
- Update all import paths in moved files
- Update all references to moved components
- Update all style imports

## 8. Verification Steps
1. Verify all imports after each move
2. Verify component functionality after each move
3. Verify style imports and CSS modules
4. Verify navigation functionality
5. Verify admin functionality
6. Verify view functionality 

## 10. Deprecated Components
Current Location: `src/components/deprecated/`
```
Navigation.tsx → Delete (superseded by current Navigation.tsx)
LifeStagesSidebar.tsx → Delete (superseded by TagTree)
LayoutWrapper.tsx → Delete (superseded by new layout components)
StoryPage.tsx → Delete (superseded by new entry components)
StoryCard.tsx → Delete (superseded by new entry components)
CategoryNavigation.tsx → Delete (replaced by tag system)
SectionNavigation.tsx → Delete (replaced by new admin navigation)
```

## 11. Directory Structure Changes
```
Delete: src/components/deprecated/ (after migration)
```

## 12. App Directory Structure
Current Location: `src/app/`

### Test Tools
Current Location: `src/app/test/`
```
component-inspector/ → Move to src/lib/tools/
palette/ → Move to src/lib/tools/
tag-colors/ → Move to src/lib/tools/
font/ → Move to src/lib/tools/
theme/ → Move to src/lib/tools/
navigation/ → Move to src/lib/tools/
```

### API Routes
Current Location: `src/app/api/`
```
component-errors/ → Keep in place (development tool)
components/ → Keep in place (development tool)
content/ → Keep in place (legacy route)
sections/ → Keep in place (legacy route)
entries/ → Keep in place (active CRUD API)
```

## 13. Directory Structure Changes
```
Create: src/lib/tools/ (for test tools)
Delete: src/app/test/ (after migration)
```

Note: API routes are kept in app/api/ to follow Next.js App Router conventions. 