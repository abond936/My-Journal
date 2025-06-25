1. Card Model
Source: src/lib/types/card.ts
Fields:
id, title, title_lowercase, subtitle, excerpt, content (string or object), type (story, qa, quote, callout, gallery, collection), status (draft, published), displayMode (inline, navigate, static)
coverImageId (references a Media document)
contentMedia (array), galleryMedia (array of objects with mediaId, caption, order, objectPosition)
Tag dimensions: who, what, when, where, reflection (arrays of tag IDs)
tags (direct), inheritedTags (ancestors), tagPathsMap (record), filterTags (record)
childrenIds (array), createdAt, updatedAt
Notes:
Tag expansion and filter logic are built-in.
Gallery/media is normalized by ID, not embedded objects.
2. Tag Model
Source: src/lib/types/tag.ts
Fields:
id, name, dimension (who, what, when, where, reflection), parentId, path (array of ancestor IDs), order, description, entryCount, albumCount, createdAt, updatedAt
Notes:
Hierarchical, supports multi-dimensional filtering.
Some fields are planned or deprecated (e.g., albumCount).
3. Media Model
Source: src/lib/types/photo.ts
Fields:
id, filename, width, height, storageUrl, storagePath, source (local-drive, upload, paste, onedrive, google-photos), sourcePath, caption, status (raw, processed, archived), createdAt, updatedAt
Notes:
All media is referenced by ID in cards.
Media normalization and migration are ongoing.
4. Card Service Logic
Source: src/lib/services/cardService.ts
Key Functions:
addCard, createCard, updateCard, getCardById, getCardsByIds, getPaginatedCardsByIds, bulkUpdateTags, deleteCard, searchCards, getCards
Tag Expansion:
Uses getTagAncestors and getTagPathsMap from tagDataAccess to compute inheritedTags, tagPathsMap, and filterTags on every create/update.
Notes:
All tag logic is delegated to tagDataAccess.
Defensive coding to avoid accidental field deletion in Firestore.
5. Tag Data Access & Expansion
Source: src/lib/firebase/tagDataAccess.ts
Key Functions:
getAllTags: Fetches all tags from Firestore.
getTagAncestors: Recursively finds all ancestor tags for a given set of tag IDs.
getTagPathsMap: Builds a map of tag paths for efficient querying.
Notes:
All tag expansion and hierarchy logic is centralized here.
Cards never mutate tag hierarchy directly.
6. Media Import & Processing
Source: src/lib/services/images/imageImportService.ts
Key Functions:
createMediaAsset: Handles file processing, uploads to Firebase Storage, and creates the canonical Media document.
importFromLocalDrive, importFromBuffer: Import images from local or buffer.
deleteMediaAsset: Deletes both Firestore doc and storage file.
Notes:
All media is stored in the media collection.
Uses Sharp for image analysis and processing.
Handles both local and uploaded images; 
7. Critical Divergences from Project.md
Card, Tag, and Media schemas are more detailed and normalized in code than described in Project.md.
All tag expansion/filtering is handled in tagDataAccess.ts, not in card logic.
Media is always referenced by ID; legacy embedded photo objects should have been migrated out.
Some fields in Tag (e.g., albumCount) are deprecated or not used.
8. What the AI Must Do (Codebase-Driven)
Always reference the actual type definitions in src/lib/types/ before proposing model changes.
Use service functions (cardService.ts, tagDataAccess.ts, imageImportService.ts) for all business logic—never duplicate or bypass them.
When working with tags, always use the tag service for expansion and hierarchy.
When working with media, always reference by ID and use the media service for import/delete.
If Project.md and the codebase disagree, the codebase is the source of truth.
If unsure about a field or logic, cite the code and ask for clarification.

1. Application Architecture
Framework: Next.js (App Router), React 19, TypeScript.
Backend: Firebase (Firestore, Auth, Storage), custom API routes.
Core Concepts: Cards (content units), Tags (hierarchical/dimensional), Media (images/files), Admin vs. View modes.
2. Page & Layout Structure
src/app/layout.tsx:
Root layout, applies global providers and theming.
src/app/view/
Public-facing content viewing.
layout.tsx: Layout for all view pages.
page.tsx: Likely the main content feed or landing page.
[id]/CardDetailPage.tsx: Renders a single card in detail, including children, gallery, and content.
src/app/admin/
Admin-only features for managing cards, tags, and other resources.
layout.tsx: Admin layout, navigation, and access control.
card-admin/: Card management (list, create, edit, bulk actions).
tag-admin/: Tag management (hierarchy, drag-and-drop, editing).
3. View vs. Admin
View:
For all users (or public).
Focused on consuming content: viewing cards, galleries, and navigating via tags.
No editing or admin controls.
Admin:
Restricted to admin users.
Full CRUD for cards and tags, bulk actions, drag-and-drop, and advanced management.
UI for creating, editing, deleting, and organizing content.
4. Viewing a Card (src/app/view/[id]/CardDetailPage.tsx)
Data: Receives a Card object (cardData).
Header: Renders title, subtitle, and (if present) rich text content using TipTapRenderer.
Children: Uses CardProvider to fetch and render child cards (nested structure).
Gallery:
If the card is a gallery or has gallery media, displays images using getDisplayUrl for proper URL resolution.
Supports horizontal scroll for galleries.
Cover Image:
If present, rendered above content.
Display Modes:
inline: Expands/collapses in place.
navigate: Links to a dedicated card view page.
Infinite Scroll:
Uses IntersectionObserver to load more children as the user scrolls.
5. Creating/Editing a Card (src/app/admin/card-admin/[id]/CardAdminClientPage.tsx & CardForm.tsx)
Form Fields:
Title, content (rich text), cover image, gallery images, tags, children, status, type, etc.
Image Integration:
Cover Image:
Uses CoverPhotoContainer and PhotoPicker to select/upload an image.
Stores reference as coverImageId (not the image itself).
Fetches and caches media details for display.
Gallery:
Uses GalleryManager and PhotoPicker for multi-image selection.
Stores gallery as an array of media IDs.
Allows adding/removing images from the gallery.
Content Images:
Rich text editor supports image embedding via PhotoPicker.
Tag Assignment:
Uses MacroTagSelector for multi-select tag assignment.
Tags are grouped by dimension (who, what, when, where, reflection).
Children:
Uses ChildCardManager to link child cards.
Save/Delete:
Handles both creation and update via API.
On delete, checks for parent cards and warns if the card is a child elsewhere.
Bulk Actions:
In the card list, supports bulk update of fields/tags and bulk delete.
6. Tag Administration (src/app/admin/tag-admin/page.tsx & TagTreeView)
Tag Model:
id, name, dimension, parentId, order, path, etc.
UI Structure:
Tags are displayed in a tree, grouped by dimension.
Drag-and-drop to reorder (within a parent) or reparent (move to a new parent).
Order is managed by a numeric order field, recalculated on move.
Editing:
Inline editing of tag names.
Add child tags with a + button.
Delete tags (with logic to handle children: promote or cascade delete).
Persistence:
All changes are sent to the backend via API and reflected in Firestore.
Uses SWR for data fetching and optimistic UI updates.
Error Handling:
UI displays errors and loading states for all tag operations.
7. Image Integration (src/components/admin/card-admin/CardForm.tsx, imageImportService.ts)
PhotoPicker:
Central component for selecting/uploading images for cover, gallery, or content.
Supports local drive, upload, and (planned) OneDrive/Google Photos.
Media Storage:
All images are stored in the media collection, referenced by ID.
Images are processed (Sharp), uploaded to Firebase Storage, and metadata is saved.
Display:
Uses getDisplayUrl to resolve the correct URL for any image.
Gallery and cover images are fetched and cached for fast display.
Known Issues:
OneDrive integration is not fully operational.
Some legacy cards may have embedded photo objects instead of media IDs.
Media normalization (resizing, format conversion) is planned but not fully implemented.
8. Summary of Key Flows
Viewing a Card:
Loads card data, renders title, subtitle, content, cover, gallery, and children.
Uses providers for context and infinite scroll for children.
Creating/Editing a Card:
Presents a form with all fields, supports image and tag selection, and child linking.
Handles save/delete with backend API, updates UI optimistically.
Tag Administration:
Presents a drag-and-drop tree grouped by dimension.
Supports inline editing, reordering, reparenting, and deletion.
All changes are persisted and reflected in the UI.