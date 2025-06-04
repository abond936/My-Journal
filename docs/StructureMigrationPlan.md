# Structure Migration Plan

This document outlines the step-by-step plan for migrating the current project structure to the new organization.

## Phase 1: Layout Components
1. **Rename and Move Layout Components**
   - `AppLayout.tsx` → `ViewLayout.tsx`
   - `AppWrapper.tsx` → `RootWrapper.tsx`
   - Move `AdminLayout.tsx` from `app/admin/` to `components/layouts/`
   - Delete deprecated `LayoutWrapper.tsx`

2. **Update Layout Imports**
   - Update imports in `app/layout.tsx` to use new component names
   - Update imports in admin and view pages to use new layout components

## Phase 2: Admin Components
1. **Restructure Admin Components**
   - Move admin components to their new locations:
     ```
     components/admin/
     ├── AlbumManager/
     │   ├── AlbumManager.tsx
     │   ├── AlbumForm.tsx
     │   ├── AlbumList.tsx
     │   └── AlbumManager.module.css
     ├── EntryManager/
     │   ├── EntryManager.tsx
     │   ├── EntryForm.tsx
     │   ├── EntryList.tsx
     │   └── EntryManager.module.css
     └── TagManager/
         ├── TagManager.tsx
         ├── TagForm.tsx
         ├── TagList.tsx
         └── TagManager.module.css
     ```

2. **Update Admin Routes**
   - Update imports in admin pages to point to new component locations
   - Update any relative imports within admin components

## Phase 3: View Components
1. **Create View Structure**
   ```
   components/view/
   ├── AlbumView/
   │   ├── AlbumView.tsx
   │   ├── AlbumCard.tsx
   │   └── AlbumView.module.css
   ├── EntryView/
   │   ├── EntryView.tsx
   │   ├── EntryCard.tsx
   │   └── EntryView.module.css
   └── TagView/
       ├── TagView.tsx
       ├── TagCard.tsx
       └── TagView.module.css
   ```

2. **Move and Update View Components**
   - Move existing view components to new locations
   - Update imports and relative paths
   - Ensure CSS modules are properly co-located

## Phase 4: Navigation Components
1. **Organize Navigation**
   ```
   components/navigation/
   ├── AdminSidebar.tsx
   ├── ViewSidebar.tsx
   ├── SidebarTabs.tsx
   └── TagTree.tsx
   ```

2. **Update Navigation Imports**
   - Update all imports referencing navigation components
   - Ensure proper integration with new layout components

## Phase 5: Common Components
1. **Organize Common Components**
   ```
   components/common/
   ├── ErrorBoundary.tsx
   ├── LoadingSpinner.tsx
   └── ThemeProvider.tsx
   ```

2. **Update Common Component Imports**
   - Update all imports referencing common components
   - Ensure proper integration with new structure

## Phase 6: Library Code
1. **Organize Library Code**
   ```
   lib/
   ├── config/
   ├── contexts/
   ├── firebase/
   ├── hooks/
   ├── scripts/
   ├── services/
   ├── types/
   └── utils/
   ```

2. **Update Library Imports**
   - Update all imports referencing library code
   - Ensure proper integration with new structure

## Phase 7: Testing and Validation
1. **Test Each Section**
   - Test admin functionality
   - Test view functionality
   - Test navigation
   - Test layouts
   - Test common components

2. **Fix Any Issues**
   - Address any import errors
   - Fix any broken functionality
   - Update any missed references

## Migration Notes
- Each phase should be completed and tested before moving to the next
- Keep track of any issues encountered during migration
- Update this document with any changes or additional steps needed
- Consider creating a backup branch before starting migration 