# Deprecated Components

This directory contains components that are being phased out in favor of newer implementations. These components are kept for reference during the migration process.

## Components

### Navigation.tsx
- **Original Location**: `src/components/Navigation.tsx`
- **New Implementation**: `src/components/navigation/Navigation.tsx`
- **Reason for Deprecation**: Simpler implementation being replaced by a more feature-complete version with theme toggle, active link highlighting, and proper path aliases.

### LayoutWrapper.tsx
- **Original Location**: `src/components/LayoutWrapper.tsx`
- **New Implementation**: `src/components/common/LayoutWrapper.tsx`
- **Reason for Deprecation**: Being replaced by a more feature-complete version with better styling organization and additional functionality.

### Layout.tsx
- **Original Location**: `src/components/Layout.tsx`
- **New Implementation**: `src/components/common/Layout.tsx`
- **Reason for Deprecation**: Being replaced by a more feature-complete version with better organization and additional functionality.

### Home.tsx
- **Original Location**: `src/components/Home.tsx`
- **New Implementation**: `src/components/common/Home.tsx`
- **Reason for Deprecation**: Being replaced by a more feature-complete version with better organization and additional functionality.

### LifeStagesSidebar.tsx
- **Original Location**: `src/components/LifeStagesSidebar.tsx`
- **New Implementation**: `src/components/navigation/LifeStagesSidebar.tsx`
- **Reason for Deprecation**: Being replaced by a more feature-complete version with Firebase integration, entry count display, tag selection, and better error handling.

### CategoryNavigation.tsx
- **Original Location**: `src/components/CategoryNavigation.tsx`
- **New Implementation**: Replaced by tag-based navigation system
- **Reason for Deprecation**: Being replaced by a more modern tag-based navigation system that better integrates with the current data model.

### ViewSelector.tsx
- **Original Location**: `src/components/ViewSelector.tsx`
- **New Implementation**: `src/components/common/ViewSelector.tsx`
- **Reason for Deprecation**: Being replaced by a version with better path aliases, CSS organization, and mobile responsiveness.

### MagazineLayout.tsx
- **Original Location**: `src/components/MagazineLayout.tsx`
- **New Implementation**: `src/components/layouts/MagazineLayout.tsx`
- **Reason for Deprecation**: Being replaced by a more feature-complete version with better organization and styling.

### StoryPage.tsx, StoryTemplate.tsx, StoryCard.tsx
- **Original Location**: `src/components/StoryPage.tsx`, `src/components/StoryTemplate.tsx`, `src/components/StoryCard.tsx`
- **New Implementation**: Replaced by new entry components in features/entries/
- **Reason for Deprecation**: Being replaced by a more modern implementation with better organization and features.

### SectionNavigation.tsx
- **Original Location**: `src/components/SectionNavigation.tsx`
- **New Implementation**: Replaced by tag-based navigation system
- **Reason for Deprecation**: Being replaced by a more modern tag-based navigation system that better integrates with the current data model.

## Recent Changes
- Moved all deprecated components to `src/components/deprecated/`
- Removed duplicate components from root components directory
- Updated import paths in new implementations
- Organized CSS files in `src/lib/styles/`

## TODO
- [x] Review these components for any unique functionality not present in new implementations
- [x] Test both versions in the running application
- [x] Document any differences in behavior
- [ ] Plan for complete removal after migration is complete

## Migration Status
- Status: 🚧 In Progress
- Last Updated: 2024-03-19
- Part of Phase 1.2: Code Organization in MigrationPlan.md 