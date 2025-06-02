# Migration Plan Report

Generated: 2025-06-02T19:47:31.514Z

## Summary

- Total Files: 130
- Files to Move: 8
- Import Fixes: 4
- Missing Files: 411

## Files to Move

### src\lib\contexts\TagContext.tsx

**Proposed Location:** src/components/shared/TagContext.tsx

**Confidence:** 0.8

**Review Notes:**
- File needs to be moved from src\lib\contexts\TagContext.tsx to src/components/shared/TagContext.tsx
- References 2 missing files

---

### src\lib\config\firebase.ts

**Proposed Location:** src/components/shared/firebase.ts

**Confidence:** 0.8

**Review Notes:**
- File needs to be moved from src\lib\config\firebase.ts to src/components/shared/firebase.ts
- References 4 missing files

---

### src\lib\scripts\migration\migrate-to-categories.ts

**Proposed Location:** src/lib/scripts/migration/migrate-to-categories.ts

**Confidence:** 0.8

**Review Notes:**
- File is in the correct location.
- Has 1 imports that need updating
- References 4 missing files

---

### src\lib\scripts\migration\list-categories.ts

**Proposed Location:** src/lib/scripts/migration/list-categories.ts

**Confidence:** 0.8

**Review Notes:**
- File is in the correct location.
- Has 1 imports that need updating
- References 1 missing files

---

### src\lib\scripts\migration\import-from-csv.ts

**Proposed Location:** src/lib/scripts/migration/import-from-csv.ts

**Confidence:** 0.8

**Review Notes:**
- File is in the correct location.
- Has 1 imports that need updating
- References 4 missing files

---

### src\lib\scripts\migration\export-to-csv.ts

**Proposed Location:** src/lib/scripts/migration/export-to-csv.ts

**Confidence:** 0.8

**Review Notes:**
- File is in the correct location.
- Has 1 imports that need updating
- References 3 missing files

---

### src\lib\config\firebase\admin.ts

**Proposed Location:** src/components/shared/admin.ts

**Confidence:** 0.8

**Review Notes:**
- File needs to be moved from src\lib\config\firebase\admin.ts to src/components/shared/admin.ts
- References 1 missing files

---

### src\lib\config\firebase\__tests__\admin.test.ts

**Proposed Location:** src/__tests__/admin.test.ts

**Confidence:** 0.8

**Review Notes:**
- File needs to be moved from src\lib\config\firebase\__tests__\admin.test.ts to src/__tests__/admin.test.ts
- References 1 missing files

---

## Import Fixes

### src\lib\scripts\migration\migrate-to-categories.ts

**Current Import:** `../lib/firebase`

**Suggested Import:** `@/components/shared/firebase`

**Confidence:** 0.9

---

### src\lib\scripts\migration\list-categories.ts

**Current Import:** `../lib/firebase`

**Suggested Import:** `@/components/shared/firebase`

**Confidence:** 0.9

---

### src\lib\scripts\migration\import-from-csv.ts

**Current Import:** `../lib/firebase`

**Suggested Import:** `@/components/shared/firebase`

**Confidence:** 0.9

---

### src\lib\scripts\migration\export-to-csv.ts

**Current Import:** `../lib/firebase`

**Suggested Import:** `@/components/shared/firebase`

**Confidence:** 0.9

---

## Missing Files

### @/components/common/Home

**Referenced in:**
- src\app\page.tsx

---

### next/font/google

**Referenced in:**
- src\app\layout.tsx

---

### @/lib/services/auth

**Referenced in:**
- src\app\layout.tsx

---

### @/components/common/LayoutWrapper

**Referenced in:**
- src\app\layout.tsx

---

### @/lib/contexts/TagContext

**Referenced in:**
- src\app\layout.tsx

---

### @/components/common/ThemeProvider

**Referenced in:**
- src\app\layout.tsx

---

### react

**Referenced in:**
- src\app\index.tsx

---

### @/lib/journal

**Referenced in:**
- src\app\index.tsx

---

### @/lib/journal

**Referenced in:**
- src\app\index.tsx

---

### @/components/CardGrid

**Referenced in:**
- src\app\index.tsx

---

### @/components/StoryCard

**Referenced in:**
- src\app\index.tsx

---

### @/styles/themes/Home.module.css

**Referenced in:**
- src\app\index.tsx

---

### ./entry

**Referenced in:**
- src\lib\types\ui.ts

---

### fs/promises

**Referenced in:**
- src\lib\scripts\migration-plan-generator.ts

---

### glob

**Referenced in:**
- src\lib\scripts\migration-plan-generator.ts

---

### path

**Referenced in:**
- src\lib\scripts\migration-plan-generator.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\services\tagService.ts

---

### @/lib/config/firebase

**Referenced in:**
- src\lib\services\tagService.ts

---

### @/lib/types/tag

**Referenced in:**
- src\lib\services\tagService.ts

---

### ./cacheService

**Referenced in:**
- src\lib\services\tagService.ts

---

### ./firebase

**Referenced in:**
- src\lib\services\journalService.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\services\journalService.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\services\journalService.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\services\entryService.ts

---

### @/lib/config/firebase

**Referenced in:**
- src\lib\services\entryService.ts

---

### @/lib/types/entry

**Referenced in:**
- src\lib\services\entryService.ts

---

### ./cacheService

**Referenced in:**
- src\lib\services\entryService.ts

---

### ./cacheService

**Referenced in:**
- src\lib\services\entryService.ts

---

### @/lib/types/entry

**Referenced in:**
- src\lib\services\cacheService.ts

---

### @/lib/types/tag

**Referenced in:**
- src\lib\services\cacheService.ts

---

### react

**Referenced in:**
- src\lib\services\auth.tsx

---

### firebase/auth

**Referenced in:**
- src\lib\services\auth.tsx

---

### @/lib/types/album

**Referenced in:**
- src\lib\services\albumService.ts

---

### @/lib/types/entry

**Referenced in:**
- src\lib\mocks\entries.ts

---

### react

**Referenced in:**
- src\lib\hooks\useStory.ts

---

### ../journal

**Referenced in:**
- src\lib\hooks\useStory.ts

---

### react

**Referenced in:**
- src\lib\hooks\useStories.ts

---

### ../journal

**Referenced in:**
- src\lib\hooks\useStories.ts

---

### react

**Referenced in:**
- src\lib\hooks\useEntry.ts

---

### @/lib/services/entryService

**Referenced in:**
- src\lib\hooks\useEntry.ts

---

### @/lib/types/entry

**Referenced in:**
- src\lib\hooks\useEntry.ts

---

### react

**Referenced in:**
- src\lib\hooks\useEntries.ts

---

### @/lib/services/entryService

**Referenced in:**
- src\lib\hooks\useEntries.ts

---

### @/lib/types/entry

**Referenced in:**
- src\lib\hooks\useEntries.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\hooks\useEntries.ts

---

### @/lib/services/tagService

**Referenced in:**
- src\lib\contexts\TagContext.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\lib\contexts\TagContext.tsx

---

### firebase/app

**Referenced in:**
- src\lib\config\firebase.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\config\firebase.ts

---

### firebase/analytics

**Referenced in:**
- src\lib\config\firebase.ts

---

### firebase/auth

**Referenced in:**
- src\lib\config\firebase.ts

---

### next/navigation

**Referenced in:**
- src\components\navigation\SlideOutNavigation.tsx

---

### @/components/layouts/CardGrid

**Referenced in:**
- src\components\navigation\SlideOutNavigation.tsx

---

### @/styles/components/navigation/SlideOutNavigation.module.css

**Referenced in:**
- src\components\navigation\SlideOutNavigation.tsx

---

### next/link

**Referenced in:**
- src\components\navigation\Navigation.tsx

---

### next/navigation

**Referenced in:**
- src\components\navigation\Navigation.tsx

---

### @/components/common/ThemeToggle

**Referenced in:**
- src\components\navigation\Navigation.tsx

---

### @/lib/styles/components/navigation/Navigation.module.css

**Referenced in:**
- src\components\navigation\Navigation.tsx

---

### next/link

**Referenced in:**
- src\components\navigation\LifeStagesSidebar.tsx

---

### next/navigation

**Referenced in:**
- src\components\navigation\LifeStagesSidebar.tsx

---

### @/lib/config/firebase

**Referenced in:**
- src\components\navigation\LifeStagesSidebar.tsx

---

### firebase/firestore

**Referenced in:**
- src\components\navigation\LifeStagesSidebar.tsx

---

### @/lib/styles/components/deprecated/LifeStagesSidebar.module.css

**Referenced in:**
- src\components\navigation\LifeStagesSidebar.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\components\navigation\LifeStagesSidebar.tsx

---

### @/lib/contexts/TagContext

**Referenced in:**
- src\components\navigation\LifeStagesSidebar.tsx

---

### react

**Referenced in:**
- src\components\layouts\TimelineLayout.tsx

---

### ./TimelineLayout.module.css

**Referenced in:**
- src\components\layouts\TimelineLayout.tsx

---

### framer-motion

**Referenced in:**
- src\components\layouts\MagazineLayout.tsx

---

### @/types/entry

**Referenced in:**
- src\components\layouts\MagazineLayout.tsx

---

### @/styles/components/layouts/MagazineLayout.module.css

**Referenced in:**
- src\components\layouts\MagazineLayout.tsx

---

### react

**Referenced in:**
- src\components\layouts\CardLayout.tsx

---

### ./CardLayout.module.css

**Referenced in:**
- src\components\layouts\CardLayout.tsx

---

### react

**Referenced in:**
- src\components\layouts\BlogLayout.tsx

---

### ./BlogLayout.module.css

**Referenced in:**
- src\components\layouts\BlogLayout.tsx

---

### ./AccordionLayout.module.css

**Referenced in:**
- src\components\layouts\AccordionLayout.tsx

---

### react

**Referenced in:**
- src\components\common\ViewSelector.tsx

---

### @/styles/components/common/ViewSelector.module.css

**Referenced in:**
- src\components\common\ViewSelector.tsx

---

### @/components/common/ThemeProvider

**Referenced in:**
- src\components\common\ThemeToggle.tsx

---

### react

**Referenced in:**
- src\components\common\ThemeToggle.tsx

---

### @/lib/styles/components/common/ThemeToggle.module.css

**Referenced in:**
- src\components\common\ThemeToggle.tsx

---

### react

**Referenced in:**
- src\components\common\ThemeProvider.tsx

---

### @/lib/services/auth

**Referenced in:**
- src\components\common\RootLayoutWrapper.tsx

---

### @/components/common/LayoutWrapper

**Referenced in:**
- src\components\common\RootLayoutWrapper.tsx

---

### @/lib/contexts/TagContext

**Referenced in:**
- src\components\common\RootLayoutWrapper.tsx

---

### react

**Referenced in:**
- src\components\common\Pagination.tsx

---

### next/navigation

**Referenced in:**
- src\components\common\LayoutWrapper.tsx

---

### @/components/navigation/Navigation

**Referenced in:**
- src\components\common\LayoutWrapper.tsx

---

### @/components/navigation/LifeStagesSidebar

**Referenced in:**
- src\components\common\LayoutWrapper.tsx

---

### @/lib/styles/components/common/LayoutWrapper.module.css

**Referenced in:**
- src\components\common\LayoutWrapper.tsx

---

### @/components/navigation/Navigation

**Referenced in:**
- src\components\common\Layout.tsx

---

### @/components/navigation/TagNavigation

**Referenced in:**
- src\components\common\Layout.tsx

---

### @/styles/components/layout/Layout.module.css

**Referenced in:**
- src\components\common\Layout.tsx

---

### react

**Referenced in:**
- src\components\common\Home.tsx

---

### next/navigation

**Referenced in:**
- src\components\common\Home.tsx

---

### @/lib/styles/themes/Home.module.css

**Referenced in:**
- src\components\common\Home.tsx

---

### react

**Referenced in:**
- src\components\common\ContentCard.tsx

---

### next/link

**Referenced in:**
- src\components\common\ContentCard.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\components\common\ContentCard.tsx

---

### @/lib/styles/components/common/ContentCard.module.css

**Referenced in:**
- src\components\common\ContentCard.tsx

---

### react

**Referenced in:**
- src\components\cards\CardGrid.tsx

---

### @/components/common/ContentCard

**Referenced in:**
- src\components\cards\CardGrid.tsx

---

### @/lib/styles/components/cards/CardGrid.module.css

**Referenced in:**
- src\components\cards\CardGrid.tsx

---

### react

**Referenced in:**
- src\components\deprecated\ViewSelector.tsx

---

### ./ViewSelector.module.css

**Referenced in:**
- src\components\deprecated\ViewSelector.tsx

---

### react

**Referenced in:**
- src\components\deprecated\StoryPage.tsx

---

### ../styles/components/story/StoryPage.module.css

**Referenced in:**
- src\components\deprecated\StoryPage.tsx

---

### react

**Referenced in:**
- src\components\deprecated\StoryCard.tsx

---

### next/link

**Referenced in:**
- src\components\deprecated\StoryCard.tsx

---

### ../styles/components/content/StoryCard.module.css

**Referenced in:**
- src\components\deprecated\StoryCard.tsx

---

### react

**Referenced in:**
- src\components\deprecated\SectionNavigation.tsx

---

### next/link

**Referenced in:**
- src\components\deprecated\SectionNavigation.tsx

---

### next/navigation

**Referenced in:**
- src\components\deprecated\SectionNavigation.tsx

---

### next/link

**Referenced in:**
- src\components\deprecated\Navigation.tsx

---

### ../styles/components/navigation/Navigation.module.css

**Referenced in:**
- src\components\deprecated\Navigation.tsx

---

### next/link

**Referenced in:**
- src\components\deprecated\LifeStagesSidebar.tsx

---

### next/navigation

**Referenced in:**
- src\components\deprecated\LifeStagesSidebar.tsx

---

### ../styles/components/navigation/LifeStagesSidebar.module.css

**Referenced in:**
- src\components\deprecated\LifeStagesSidebar.tsx

---

### next/navigation

**Referenced in:**
- src\components\deprecated\LayoutWrapper.tsx

---

### ./Navigation

**Referenced in:**
- src\components\deprecated\LayoutWrapper.tsx

---

### @/components/deprecated/LifeStagesSidebar

**Referenced in:**
- src\components\deprecated\LayoutWrapper.tsx

---

### ./Navigation

**Referenced in:**
- src\components\deprecated\Layout.tsx

---

### ./CategoryNavigation

**Referenced in:**
- src\components\deprecated\Layout.tsx

---

### ../styles/components/layout/Layout.module.css

**Referenced in:**
- src\components\deprecated\Layout.tsx

---

### react

**Referenced in:**
- src\components\deprecated\Home.tsx

---

### ../styles/themes/Home.module.css

**Referenced in:**
- src\components\deprecated\Home.tsx

---

### next/link

**Referenced in:**
- src\components\deprecated\CategoryNavigation.tsx

---

### next/navigation

**Referenced in:**
- src\components\deprecated\CategoryNavigation.tsx

---

### @/lib/config/firebase

**Referenced in:**
- src\components\deprecated\CategoryNavigation.tsx

---

### firebase/firestore

**Referenced in:**
- src\components\deprecated\CategoryNavigation.tsx

---

### ../styles/components/navigation/CategoryNavigation.module.css

**Referenced in:**
- src\components\deprecated\CategoryNavigation.tsx

---

### react

**Referenced in:**
- src\app\entries\page.tsx

---

### @/lib/services/entryService

**Referenced in:**
- src\app\entries\page.tsx

---

### @/lib/types/entry

**Referenced in:**
- src\app\entries\page.tsx

---

### @/lib/types/ui

**Referenced in:**
- src\app\entries\page.tsx

---

### next/link

**Referenced in:**
- src\app\entries\page.tsx

---

### @/components/cards/CardGrid

**Referenced in:**
- src\app\entries\page.tsx

---

### @/components/layouts/AccordionLayout

**Referenced in:**
- src\app\entries\page.tsx

---

### @/components/layouts/BlogLayout

**Referenced in:**
- src\app\entries\page.tsx

---

### @/lib/contexts/TagContext

**Referenced in:**
- src\app\entries\page.tsx

---

### @/lib/styles/app/entries.module.css

**Referenced in:**
- src\app\entries\page.tsx

---

### react

**Referenced in:**
- src\app\albums\page.tsx

---

### @/styles/pages/albums.module.css

**Referenced in:**
- src\app\albums\page.tsx

---

### next/link

**Referenced in:**
- src\app\admin\layout.tsx

---

### next/navigation

**Referenced in:**
- src\app\admin\layout.tsx

---

### @/lib/styles/app/admin/layout.module.css

**Referenced in:**
- src\app\admin\layout.tsx

---

### @/lib/services/entryService

**Referenced in:**
- src\__tests__\unit\services\entryService.test.ts

---

### @/lib/types/entry

**Referenced in:**
- src\__tests__\unit\services\entryService.test.ts

---

### firebase/firestore

**Referenced in:**
- src\__tests__\unit\services\entryService.test.ts

---

### @/lib/config/firebase

**Referenced in:**
- src\__tests__\unit\services\entryService.test.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\tags\updateStoryTags2.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\tags\updateStoryTags2.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\tags\updateStoryTags2.ts

---

### ../src/lib/firebase

**Referenced in:**
- src\lib\scripts\tags\updateStoryTags.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\scripts\tags\updateStoryTags.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\tags\update-tag-name.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\tags\update-tag-name.ts

---

### fs

**Referenced in:**
- src\lib\scripts\tags\update-category-ids.ts

---

### path

**Referenced in:**
- src\lib\scripts\tags\update-category-ids.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\tags\update-category-ids.ts

---

### csv-stringify/sync

**Referenced in:**
- src\lib\scripts\tags\update-category-ids.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\tags\recommend-categories.ts

---

### fs

**Referenced in:**
- src\lib\scripts\tags\recommend-categories.ts

---

### path

**Referenced in:**
- src\lib\scripts\tags\recommend-categories.ts

---

### fs

**Referenced in:**
- src\lib\scripts\tags\migrate-to-categories.ts

---

### path

**Referenced in:**
- src\lib\scripts\tags\migrate-to-categories.ts

---

### jsdom

**Referenced in:**
- src\lib\scripts\tags\migrate-to-categories.ts

---

### @/lib/config/firebase

**Referenced in:**
- src\lib\scripts\tags\migrate-to-categories.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\scripts\tags\migrate-to-categories.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\tags\migrate-to-categories.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\tags\migrate-to-categories.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\tags\migrate-to-categories.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\tags\list-categories.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\tags\list-categories.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\tags\list-categories.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\tags\importCategories2.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\tags\importCategories2.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\tags\importCategories2.ts

---

### fs

**Referenced in:**
- src\lib\scripts\tags\importCategories2.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\tags\importCategories.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\tags\importCategories.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\tags\importCategories.ts

---

### fs

**Referenced in:**
- src\lib\scripts\tags\importCategories.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\tags\import-categories.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\tags\import-categories.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\tags\import-categories.ts

---

### fs

**Referenced in:**
- src\lib\scripts\tags\import-categories.ts

---

### uuid

**Referenced in:**
- src\lib\scripts\tags\import-categories.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\tags\cleanup-tags.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\tags\cleanup-tags.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\tags\cleanup-tags.ts

---

### ../data/tags

**Referenced in:**
- src\lib\scripts\tags\cleanup-tags.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\tags\cleanup-orphaned-tags.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\tags\cleanup-orphaned-tags.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\tags\cleanup-orphaned-tags.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\tags\cleanup-orphaned-tags.ts

---

### path

**Referenced in:**
- src\lib\scripts\tags\cleanup-orphaned-tags.ts

---

### fs

**Referenced in:**
- src\lib\scripts\migration\update-entries.ts

---

### path

**Referenced in:**
- src\lib\scripts\migration\update-entries.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\migration\update-entries.ts

---

### @/lib/config/firebase

**Referenced in:**
- src\lib\scripts\migration\update-entries.ts

---

### @/lib/types/tag

**Referenced in:**
- src\lib\scripts\migration\update-entries.ts

---

### @/lib/data/tags

**Referenced in:**
- src\lib\scripts\migration\update-entries.ts

---

### fs

**Referenced in:**
- src\lib\scripts\migration\restore-entries.ts

---

### path

**Referenced in:**
- src\lib\scripts\migration\restore-entries.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\migration\restore-entries.ts

---

### @/lib/config/firebase

**Referenced in:**
- src\lib\scripts\migration\restore-entries.ts

---

### @/lib/types/tag

**Referenced in:**
- src\lib\scripts\migration\restore-entries.ts

---

### @/lib/data/tags

**Referenced in:**
- src\lib\scripts\migration\restore-entries.ts

---

### fs

**Referenced in:**
- src\lib\scripts\migration\recommend-tags.ts

---

### path

**Referenced in:**
- src\lib\scripts\migration\recommend-tags.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\migration\recommend-tags.ts

---

### @/lib/config/firebase

**Referenced in:**
- src\lib\scripts\migration\recommend-tags.ts

---

### @/lib/types/tag

**Referenced in:**
- src\lib\scripts\migration\recommend-tags.ts

---

### @/lib/data/tags

**Referenced in:**
- src\lib\scripts\migration\recommend-tags.ts

---

### fs

**Referenced in:**
- src\lib\scripts\migration\migrate-to-categories.ts

---

### path

**Referenced in:**
- src\lib\scripts\migration\migrate-to-categories.ts

---

### jsdom

**Referenced in:**
- src\lib\scripts\migration\migrate-to-categories.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\scripts\migration\migrate-to-categories.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\scripts\migration\list-categories.ts

---

### fs

**Referenced in:**
- src\lib\scripts\migration\import-tags.ts

---

### path

**Referenced in:**
- src\lib\scripts\migration\import-tags.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\migration\import-tags.ts

---

### @/lib/config/firebase

**Referenced in:**
- src\lib\scripts\migration\import-tags.ts

---

### @/lib/types/tag

**Referenced in:**
- src\lib\scripts\migration\import-tags.ts

---

### @/lib/data/tags

**Referenced in:**
- src\lib\scripts\migration\import-tags.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\scripts\migration\import-from-csv.ts

---

### fs

**Referenced in:**
- src\lib\scripts\migration\import-from-csv.ts

---

### path

**Referenced in:**
- src\lib\scripts\migration\import-from-csv.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\migration\import-from-csv.ts

---

### fs

**Referenced in:**
- src\lib\scripts\migration\extract-headings.ts

---

### path

**Referenced in:**
- src\lib\scripts\migration\extract-headings.ts

---

### jsdom

**Referenced in:**
- src\lib\scripts\migration\extract-headings.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\scripts\migration\export-to-csv.ts

---

### fs

**Referenced in:**
- src\lib\scripts\migration\export-to-csv.ts

---

### path

**Referenced in:**
- src\lib\scripts\migration\export-to-csv.ts

---

### fs

**Referenced in:**
- src\lib\scripts\entries\update-story-codes.ts

---

### path

**Referenced in:**
- src\lib\scripts\entries\update-story-codes.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\entries\update-story-codes.ts

---

### csv-stringify/sync

**Referenced in:**
- src\lib\scripts\entries\update-story-codes.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\entries\update-stories.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\entries\update-stories.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\entries\update-stories.ts

---

### fs

**Referenced in:**
- src\lib\scripts\entries\update-stories.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\entries\sample-entries.ts

---

### path

**Referenced in:**
- src\lib\scripts\entries\sample-entries.ts

---

### ../config/firebase/admin

**Referenced in:**
- src\lib\scripts\entries\sample-entries.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\entries\restore-stories.ts

---

### fs

**Referenced in:**
- src\lib\scripts\entries\restore-stories.ts

---

### fs

**Referenced in:**
- src\lib\scripts\entries\compare-stories.ts

---

### path

**Referenced in:**
- src\lib\scripts\entries\compare-stories.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\entries\compare-stories.ts

---

### csv-stringify/sync

**Referenced in:**
- src\lib\scripts\entries\compare-stories.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\firebase\test-firestore2.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\firebase\test-firestore2.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\firebase\test-firestore.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\firebase\test-firestore.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\firebase\test-firebase-config.ts

---

### path

**Referenced in:**
- src\lib\scripts\firebase\test-firebase-config.ts

---

### @/lib/config/firebase/admin

**Referenced in:**
- src\lib\scripts\firebase\test-firebase-config.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\firebase\migrate-entries.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\firebase\migrate-entries.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\firebase\migrate-entries.ts

---

### path

**Referenced in:**
- src\lib\scripts\firebase\migrate-entries.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\firebase\migrate-collections.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\firebase\migrate-collections.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\firebase\migrate-collections.ts

---

### path

**Referenced in:**
- src\lib\scripts\firebase\migrate-collections.ts

---

### fs

**Referenced in:**
- src\lib\scripts\firebase\migrate-collections.ts

---

### firebase-admin/app

**Referenced in:**
- src\lib\scripts\firebase\list-collections.ts

---

### firebase-admin/firestore

**Referenced in:**
- src\lib\scripts\firebase\list-collections.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\firebase\list-collections.ts

---

### path

**Referenced in:**
- src\lib\scripts\firebase\list-collections.ts

---

### fs

**Referenced in:**
- src\lib\scripts\firebase\list-collections.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\firebase\backup-firestore.ts

---

### path

**Referenced in:**
- src\lib\scripts\firebase\backup-firestore.ts

---

### @/lib/config/firebase/admin

**Referenced in:**
- src\lib\scripts\firebase\backup-firestore.ts

---

### path

**Referenced in:**
- src\lib\scripts\firebase\backup-firestore.ts

---

### fs

**Referenced in:**
- src\lib\scripts\firebase\backup-firestore.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\utils\test-csv2.ts

---

### fs

**Referenced in:**
- src\lib\scripts\utils\test-csv2.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\utils\test-csv.ts

---

### fs

**Referenced in:**
- src\lib\scripts\utils\test-csv.ts

---

### ../../config/firebase

**Referenced in:**
- src\lib\scripts\utils\import-from-csv.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\scripts\utils\import-from-csv.ts

---

### fs

**Referenced in:**
- src\lib\scripts\utils\import-from-csv.ts

---

### path

**Referenced in:**
- src\lib\scripts\utils\import-from-csv.ts

---

### csv-parse/sync

**Referenced in:**
- src\lib\scripts\utils\import-from-csv.ts

---

### ../../config/firebase

**Referenced in:**
- src\lib\scripts\utils\export-to-csv.ts

---

### firebase/firestore

**Referenced in:**
- src\lib\scripts\utils\export-to-csv.ts

---

### fs

**Referenced in:**
- src\lib\scripts\utils\export-to-csv.ts

---

### path

**Referenced in:**
- src\lib\scripts\utils\export-to-csv.ts

---

### dotenv

**Referenced in:**
- src\lib\scripts\utils\backup-codebase.ts

---

### path

**Referenced in:**
- src\lib\scripts\utils\backup-codebase.ts

---

### path

**Referenced in:**
- src\lib\scripts\utils\backup-codebase.ts

---

### fs

**Referenced in:**
- src\lib\scripts\utils\backup-codebase.ts

---

### archiver

**Referenced in:**
- src\lib\scripts\utils\backup-codebase.ts

---

### child_process

**Referenced in:**
- src\lib\scripts\utils\backup-codebase.ts

---

### firebase-admin

**Referenced in:**
- src\lib\config\firebase\admin.ts

---

### react

**Referenced in:**
- src\components\features\tags\TagNavigation.tsx

---

### next/link

**Referenced in:**
- src\components\features\tags\TagNavigation.tsx

---

### next/navigation

**Referenced in:**
- src\components\features\tags\TagNavigation.tsx

---

### @/lib/styles/components/features/tag/TagNavigation.module.css

**Referenced in:**
- src\components\features\tags\TagNavigation.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\components\features\tags\TagNavigation.tsx

---

### react

**Referenced in:**
- src\components\features\tags\TagBoxGrid.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\components\features\tags\TagBoxGrid.tsx

---

### ./TagBox

**Referenced in:**
- src\components\features\tags\TagBoxGrid.tsx

---

### @/lib/styles/components/features/tag/TagBoxGrid.module.css

**Referenced in:**
- src\components\features\tags\TagBoxGrid.tsx

---

### react

**Referenced in:**
- src\components\features\tags\TagBox.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\components\features\tags\TagBox.tsx

---

### @/lib/styles/components/features/tag/TagBox.module.css

**Referenced in:**
- src\components\features\tags\TagBox.tsx

---

### @/styles/components/features/album/AlbumView.module.css

**Referenced in:**
- src\components\features\album\AlbumView.tsx

---

### firebase/firestore

**Referenced in:**
- src\components\features\entry\TagSelector.tsx

---

### @/lib/config/firebase

**Referenced in:**
- src\components\features\entry\TagSelector.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\components\features\entry\TagSelector.tsx

---

### @/styles/components/features/entry/TagSelector.module.css

**Referenced in:**
- src\components\features\entry\TagSelector.tsx

---

### next/navigation

**Referenced in:**
- src\components\features\entry\EntryTemplate.tsx

---

### @/lib/types/entry

**Referenced in:**
- src\components\features\entry\EntryTemplate.tsx

---

### @/lib/services/entryService

**Referenced in:**
- src\components\features\entry\EntryTemplate.tsx

---

### @/styles/components/features/entry/EntryTemplate.module.css

**Referenced in:**
- src\components\features\entry\EntryTemplate.tsx

---

### react

**Referenced in:**
- src\components\features\entry\EntryPage.tsx

---

### @/types/entry

**Referenced in:**
- src\components\features\entry\EntryPage.tsx

---

### @/styles/components/features/entry/EntryPage.module.css

**Referenced in:**
- src\components\features\entry\EntryPage.tsx

---

### @/lib/types/entry

**Referenced in:**
- src\components\features\entry\EntryForm.tsx

---

### @/lib/services/entryService

**Referenced in:**
- src\components\features\entry\EntryForm.tsx

---

### ./TagSelector

**Referenced in:**
- src\components\features\entry\EntryForm.tsx

---

### @/components/common/editor/RichTextEditor

**Referenced in:**
- src\components\features\entry\EntryForm.tsx

---

### @/styles/components/features/entry/EntryForm.module.css

**Referenced in:**
- src\components\features\entry\EntryForm.tsx

---

### react

**Referenced in:**
- src\components\features\entry\EntryCard.tsx

---

### next/link

**Referenced in:**
- src\components\features\entry\EntryCard.tsx

---

### @/styles/components/features/entry/EntryCard.module.css

**Referenced in:**
- src\components\features\entry\EntryCard.tsx

---

### react

**Referenced in:**
- src\components\common\editor\RichTextEditor.tsx

---

### @tiptap/react

**Referenced in:**
- src\components\common\editor\RichTextEditor.tsx

---

### @tiptap/starter-kit

**Referenced in:**
- src\components\common\editor\RichTextEditor.tsx

---

### @tiptap/extension-link

**Referenced in:**
- src\components\common\editor\RichTextEditor.tsx

---

### @tiptap/extension-image

**Referenced in:**
- src\components\common\editor\RichTextEditor.tsx

---

### @/styles/components/common/editor/RichTextEditor.module.css

**Referenced in:**
- src\components\common\editor\RichTextEditor.tsx

---

### firebase/storage

**Referenced in:**
- src\components\common\editor\ImageUploadDialog.tsx

---

### @/styles/components/common/editor/ImageUploadDialog.module.css

**Referenced in:**
- src\components\common\editor\ImageUploadDialog.tsx

---

### react

**Referenced in:**
- src\app\test\theme\page.tsx

---

### ./ThemeTestPage.module.css

**Referenced in:**
- src\app\test\theme\page.tsx

---

### ./TagColorsTest.module.css

**Referenced in:**
- src\app\test\tag-colors\page.tsx

---

### ./PaletteTest.module.css

**Referenced in:**
- src\app\test\palette\page.tsx

---

### @/components/layouts/CardGrid

**Referenced in:**
- src\app\test\navigation\page.tsx

---

### @/components/navigation/SlideOutNavigation

**Referenced in:**
- src\app\test\navigation\page.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\app\test\navigation\page.tsx

---

### ./FontTestPage.module.css

**Referenced in:**
- src\app\test\font\page.tsx

---

### firebase/firestore

**Referenced in:**
- src\app\tags\[id]\page.tsx

---

### @/lib/config/firebase

**Referenced in:**
- src\app\tags\[id]\page.tsx

---

### @/lib/types/entry

**Referenced in:**
- src\app\tags\[id]\page.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\app\tags\[id]\page.tsx

---

### @/components/layouts/CardLayout

**Referenced in:**
- src\app\tags\[id]\page.tsx

---

### @/components/layouts/TimelineLayout

**Referenced in:**
- src\app\tags\[id]\page.tsx

---

### @/components/layouts/AccordionLayout

**Referenced in:**
- src\app\tags\[id]\page.tsx

---

### @/components/layouts/BlogLayout

**Referenced in:**
- src\app\tags\[id]\page.tsx

---

### react

**Referenced in:**
- src\app\test\home\page.tsx

---

### @/components/layouts/CardGrid

**Referenced in:**
- src\app\test\home\page.tsx

---

### @/styles/themes/Home.module.css

**Referenced in:**
- src\app\test\home\page.tsx

---

### ./ComponentInspector.module.css

**Referenced in:**
- src\app\test\component-inspector\page.tsx

---

### react

**Referenced in:**
- src\app\entries\new\page.tsx

---

### next/navigation

**Referenced in:**
- src\app\entries\new\page.tsx

---

### @/components/features/entry/EntryForm

**Referenced in:**
- src\app\entries\new\page.tsx

---

### @/lib/types/entry

**Referenced in:**
- src\app\entries\new\page.tsx

---

### @/styles/pages/entries/new.module.css

**Referenced in:**
- src\app\entries\new\page.tsx

---

### @/lib/hooks/useEntry

**Referenced in:**
- src\app\entries\[id]\page.tsx

---

### @/components/features/entry/EntryTemplate

**Referenced in:**
- src\app\entries\[id]\page.tsx

---

### next/navigation

**Referenced in:**
- src\app\entries\[id]\page.tsx

---

### @/styles/app/entries/entry.module.css

**Referenced in:**
- src\app\entries\[id]\page.tsx

---

### next/server

**Referenced in:**
- src\app\api\content\route.ts

---

### @/lib/journal

**Referenced in:**
- src\app\api\content\route.ts

---

### next/server

**Referenced in:**
- src\app\api\sections\route.ts

---

### @/lib/journal

**Referenced in:**
- src\app\api\sections\route.ts

---

### next/server

**Referenced in:**
- src\app\api\entries\route.ts

---

### @/types/entry

**Referenced in:**
- src\app\api\entries\route.ts

---

### @/lib/config/firebase

**Referenced in:**
- src\app\api\entries\route.ts

---

### firebase/firestore

**Referenced in:**
- src\app\api\entries\route.ts

---

### fs/promises

**Referenced in:**
- src\app\api\components\route.ts

---

### path

**Referenced in:**
- src\app\api\components\route.ts

---

### fs

**Referenced in:**
- src\app\api\components\route.ts

---

### fs/promises

**Referenced in:**
- src\app\api\component-errors\route.ts

---

### path

**Referenced in:**
- src\app\api\component-errors\route.ts

---

### @dnd-kit/sortable

**Referenced in:**
- src\app\admin\tags\SortableTag.tsx

---

### @dnd-kit/utilities

**Referenced in:**
- src\app\admin\tags\SortableTag.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\app\admin\tags\SortableTag.tsx

---

### @/styles/pages/admin/tags.module.css

**Referenced in:**
- src\app\admin\tags\SortableTag.tsx

---

### react

**Referenced in:**
- src\app\admin\tags\page.tsx

---

### @/lib/services/tagService

**Referenced in:**
- src\app\admin\tags\page.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\app\admin\tags\page.tsx

---

### @/lib/styles/app/admin/tags.module.css

**Referenced in:**
- src\app\admin\tags\page.tsx

---

### react

**Referenced in:**
- src\app\admin\entries\page.tsx

---

### @/lib/services/entryService

**Referenced in:**
- src\app\admin\entries\page.tsx

---

### @/lib/services/tagService

**Referenced in:**
- src\app\admin\entries\page.tsx

---

### @/lib/types/entry

**Referenced in:**
- src\app\admin\entries\page.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\app\admin\entries\page.tsx

---

### @/lib/styles/app/admin/entries.module.css

**Referenced in:**
- src\app\admin\entries\page.tsx

---

### react

**Referenced in:**
- src\app\admin\albums\page.tsx

---

### @/lib/services/albumService

**Referenced in:**
- src\app\admin\albums\page.tsx

---

### @/lib/services/tagService

**Referenced in:**
- src\app\admin\albums\page.tsx

---

### @/lib/types/album

**Referenced in:**
- src\app\admin\albums\page.tsx

---

### @/lib/types/tag

**Referenced in:**
- src\app\admin\albums\page.tsx

---

### @/lib/styles/app/admin/albums.module.css

**Referenced in:**
- src\app\admin\albums\page.tsx

---

### @/lib/config/firebase/admin

**Referenced in:**
- src\__tests__\unit\config\firebase\admin.test.ts

---

### firebase-admin

**Referenced in:**
- src\__tests__\unit\config\firebase\admin.test.ts

---

### ../admin

**Referenced in:**
- src\lib\config\firebase\__tests__\admin.test.ts

---

### react

**Referenced in:**
- src\app\entries\[id]\edit\page.tsx

---

### next/navigation

**Referenced in:**
- src\app\entries\[id]\edit\page.tsx

---

### @/lib/services/entryService

**Referenced in:**
- src\app\entries\[id]\edit\page.tsx

---

### @/lib/types/entry

**Referenced in:**
- src\app\entries\[id]\edit\page.tsx

---

### @/components/features/entry/EntryForm

**Referenced in:**
- src\app\entries\[id]\edit\page.tsx

---

### @/styles/pages/edit.module.css

**Referenced in:**
- src\app\entries\[id]\edit\page.tsx

---

### next/server

**Referenced in:**
- src\app\api\content\[id]\route.ts

---

### @/lib/journal

**Referenced in:**
- src\app\api\content\[id]\route.ts

---

