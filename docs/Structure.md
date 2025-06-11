# Application Structure Audit

## Directory: `src/app`

This directory contains the root of the Next.js application, including the main entry point and global layouts.

### File: `src/app/layout.tsx` *ok*
*   **Imports:**
    *   `@/lib/contexts/TagContext` -> `TagProvider`
    *   `@/components/common/ThemeProvider`
*   **Imported By:**
    *   Root of the Next.js application.
*   **Purpose:**
    *   Sets up the root `<html>` and `<body>` tags and wraps the entire application in global context providers (`ThemeProvider`, `TagProvider`).
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/app/page.tsx` *ok. 
*   **Imports:**
    *   `next/link`
*   **Imported By:**
    *   Next.js router for the `/` path.
*   **Purpose:**
    *   Renders the main landing page with the "Enter" button.
*   **Initial Assessment:**
    *   `Live Path`

## Directory: `src/app/admin`

This directory contains the routes and layouts for the administration section of the application.

### File: `src/app/admin/layout.tsx` *ok.*
*   **Imports:**
    *   `@/components/view/ViewLayout`
    *   `@/components/admin/AdminFAB`
*   **Imported By:**
    *   Next.js router for all routes under `/admin`.
*   **Purpose:**
    *   Provides the main layout for the entire admin section. It re-uses the `ViewLayout` and adds an admin-specific Floating Action Button (`AdminFAB`).
*   **Initial Assessment:**
    *   `Live Path`

## Directory: `src/app/admin/album-admin`

Contains the pages for listing, creating, and editing albums.

### File: `src/app/admin/album-admin/page.tsx` *ok. Change css case?*
*   **Imports:**
    *   `@/lib/services/tagService`
    *   `@/lib/types/album`
    *   `@/lib/types/photo`
    *   `@/lib/types/tag`
    *   `@/components/PhotoPicker`
    *   `next/link`
*   **Imported By:**
    *   Next.js router for `/admin/album-admin`
*   **Purpose:**
    *   Displays a comprehensive dashboard for managing all albums. It includes a table of albums, statistics, search and filter functionality, and controls for bulk actions like deleting or updating status.
*   **Initial Assessment:**
    *   `Live Path`

### Directory: `src/app/admin/album-admin/new` 

Contains the page for creating a new album.

#### File: `src/app/admin/album-admin/new/page.tsx` - *Needs significant improvement. Change css case?*
*   **Imports:**
    *   `next/navigation` -> `useRouter`
    *   `@/lib/types/album`
*   **Imported By:**
    *   Next.js router for `/admin/album-admin/new`.
*   **Purpose:**
    *   Provides a simple form to create a new album with a title and description. It calls the `/api/albums` POST endpoint on save.
*   **Initial Assessment:**
    *   `Live Path`

### Directory: `src/app/admin/album-admin/[id]/edit` 

Contains the page for editing an existing album.

#### File: `src/app/admin/album-admin/[id]/edit/page.tsx` *ok. Change css case?*
*   **Imports:**
    *   `next/navigation` -> `useRouter`, `useParams`
    *   `@/lib/types/album`
    *   `@/lib/types/photo`
    *   `@/components/admin/album-admin/AlbumForm`
    *   `@/components/admin/album-admin/PhotoManager`
    *   `@/components/PhotoPicker`
    *   `@/components/admin/album-admin/AlbumStyleSelector`
*   **Imported By:**
    *   Next.js router for `/admin/album-admin/[id]/edit`.
*   **Purpose:**
    *   Provides a comprehensive editor for a single album. It uses multiple sub-components to manage the album's details, its collection of photos, and its visual style.
*   **Initial Assessment:**
    *   `Live Path`

---

## Directory: `src/app/admin/entry-admin`

Contains the pages for listing, creating, and editing entries.

### File: `src/app/admin/entry-admin/page.tsx` *ok. Change css case?*
*   **Imports:**
    *   `next/navigation` -> `useRouter`
    *   `@/lib/services/entryService`
    *   `@/lib/services/tagService`
    *   `@/lib/types/entry`
    *   `@/lib/types/tag`
*   **Imported By:**
    *   Next.js router for `/admin/entry-admin`.
*   **Purpose:**
    *   Displays a comprehensive dashboard for managing all entries. It includes a table of entries, statistics, search and filter functionality, and controls for bulk actions. It directly calls services to perform its functions.
*   **Initial Assessment:**
    *   `Live Path`

### Directory: `src/app/admin/entry-admin/new` 

Contains the page for creating a new entry.

#### File: `src/app/admin/entry-admin/new/page.tsx` *ok. Change css case?*
*   **Imports:**
    *   `next/navigation` -> `useRouter`
    *   `@/lib/services/entryService` -> `createEntry`
    *   `@/lib/types/entry`
    *   `@/components/admin/entry-admin/EntryForm`
*   **Imported By:**
    *   Next.js router for `/admin/entry-admin/new`.
*   **Purpose:**
    *   Provides a form (`EntryForm`) to create a new entry. It calls the `createEntry` service on submit.
*   **Initial Assessment:**
    *   `Live Path`

### Directory: `src/app/admin/entry-admin/[id]/edit` 

Contains the page for editing an existing entry.

#### File: `src/app/admin/entry-admin/[id]/edit/page.tsx`*ok. Change css case?*
*   **Imports:**
    *   `next/navigation` -> `useRouter`
    *   `@/lib/hooks/useEntry`
    *   `@/lib/types/entry`
    *   `@/components/admin/entry-admin/EntryForm`
*   **Imported By:**
    *   Next.js router for `/admin/entry-admin/[id]/edit`.
*   **Purpose:**
    *   Provides a form (`EntryForm`) to edit an existing entry. It uses the `useEntry` hook to fetch the initial data.
*   **Initial Assessment:**
    *   `Live Path`

## Directory: `src/app/admin/tag-admin`

Contains the page and components for managing the tag hierarchy. Unlike other admin sections, it does not use separate `new` or `edit` pages, opting for an all-in-one interface.

### File: `src/app/admin/tag-admin/page.tsx` *ok. Needs improvement.*
*   **Imports:**
    *   `@/lib/services/tagService`
    *   `@/lib/types/tag`
*   **Imported By:**
    *   Next.js router for `/admin/tag-admin`.
*   **Purpose:**
    *   A highly complex, single-page application for all tag management. It handles viewing the tag hierarchy, inline creation, editing, deletion, re-parenting, and re-ordering of tags. It contains a significant amount of business logic directly within the component.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/app/admin/tag-admin/SortableTag.tsx` *ok*
*   **Imports:**
    *   `@dnd-kit/sortable`
    *   `@dnd-kit/utilities`
    *   `@/lib/types/tag`
*   **Imported By:**
    *   This file is not currently imported by any other file.
*   **Purpose:**
    *   A wrapper component intended to make tags draggable and sortable using the `dnd-kit` library. Logic exists to only enable drag-and-drop when the shift key is held.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - The component is fully implemented but is not used within the main `page.tsx`. This suggests it was part of a feature that was either abandoned or not yet completed.

---

## Directory: `src/app/api`

Contains the server-side API routes for the application. These routes are the bridge between the client-side components and the server-side services.

### Directory: `src/app/api/albums`

Contains the API routes for managing albums.

#### File: `src/app/api/albums/route.ts` *ok*
*   **Imports:**
    *   `next/server` -> `NextResponse`
    *   `@/lib/services/albumService` -> `createAlbum`, `getAllAlbums`
*   **Imported By:**
    *   Client-side components via `fetch('/api/albums')`.
*   **Purpose:**
    *   Handles `GET` requests to fetch all albums and `POST` requests to create a new album. It calls the corresponding functions in `albumService`.
*   **Initial Assessment:**
    *   `Live Path`

#### Directory: `src/app/api/albums/[id]`

Contains the API routes for managing a single album.

##### File: `src/app/api/albums/[id]/route.ts` *ok*
*   **Imports:**
    *   `next/server` -> `NextResponse`, `NextRequest`
    *   `@/lib/services/albumService` -> `updateAlbum`, `deleteAlbum`, `getAlbumById`
*   **Imported By:**
    *   Client-side components via `fetch('/api/albums/[id]')`.
*   **Purpose:**
    *   Handles `GET` (for one), `PATCH`, and `DELETE` requests for a single album, identified by its ID. It calls the corresponding functions in `albumService`.
*   **Initial Assessment:**
    *   `Live Path`

### Directory: `src/app/api/content` 

Contains the API route responsible for fetching the combined content for the main view.

#### File: `src/app/api/content/route.ts` *ok*
*   **Imports:**
    *   `next/server` -> `NextResponse`, `NextRequest`
    *   `@/lib/services/entryService` -> `getEntries`
    *   `@/lib/services/albumService` -> `getAlbums`
    *   `@/lib/config/firebase/admin` -> `adminDb` (for DocumentSnapshot)
*   **Imported By:**
    *   `@/lib/hooks/useContent`
*   **Purpose:**
    *   A critical endpoint that fetches both entries and albums from their respective services. It handles pagination for both content types simultaneously, combines the results, sorts them by creation date, and returns them to the main content view.
*   **Initial Assessment:**
    *   `Live Path`

---

### Directory: `src/app/api/entries`

Contains the API routes for managing entries. This section has significant architectural issues.

#### File: `src/app/api/entries/route.ts` *ok, Refactor*
*   **Imports:**
    *   `next/server` -> `NextResponse`
    *   `@/types/entry`
    *   `@/lib/config/firebase` -> `db` (Client SDK)
    *   `firebase/firestore` (Client SDK)
*   **Imported By:**
    *   Client-side components via `fetch('/api/entries')`.
*   **Purpose:**
    *   Handles `GET` to fetch all entries and `POST` to create a new entry.
    *   **Architectural Issue:** This file incorrectly contains functions (`GET_BY_ID`, `PUT`, `DELETE`) that should be in the `[id]/route.ts` file. Furthermore, it bypasses the service layer (`entryService`) and uses the **client-side** Firestore SDK directly on the server, which is incorrect.
*   **Initial Assessment:**
    *   `Live Path (but needs immediate refactoring)`

#### Directory: `src/app/api/entries/[id]`

Contains the API route for managing a single entry.

##### File: `src/app/api/entries/[id]/route.ts` *ok, Refactor*
*   **Imports:**
    *   `next/server` -> `NextResponse`
    *   `@/lib/config/firebase` -> `db` (Client SDK)
    *   `firebase/firestore` (Client SDK)
    *   `@/lib/types/entry`
*   **Imported By:**
    *   `@/lib/hooks/useEntry` via `fetch('/api/entries/[id]')`.
*   **Purpose:**
    *   Handles `GET` requests for a single entry.
    *   **Architectural Issue:** This route also bypasses the service layer and uses the **client-side** Firestore SDK. It duplicates the `GET` functionality found in the parent `route.ts` and is missing the `PATCH` and `DELETE` handlers.
*   **Initial Assessment:**
    *   `Live Path (but needs immediate refactoring)`

### Directory: `src/app/api/tags` ok - We want to include counts.

Contains the API routes for fetching tag data.

#### File: `src/app/api/tags/route.ts` *Ensure counts up-to-date?*
*   **Imports:**
    *   `next/server` -> `NextResponse`
    *   `@/lib/config/firebase/admin` -> `adminDb`
    *   `@/lib/types/tag`
*   **Imported By:**
    *   `@lib/contexts/TagContext`
*   **Purpose:**
    *   Fetches all tags from Firestore, orders them hierarchically, and returns them. It correctly uses the Admin SDK. It appears to return count fields (`entryCount`, `albumCount`) that may or may not be up-to-date.
*   **Initial Assessment:**
    *   `Live Path`

#### Directory: `src/app/api/tags/tree` *Deleted*

##### File: `src/app/api/tags/tree/route.ts` *Deleted*
*   **Imports:**
    *   `next/server` -> `NextResponse`
    *   `@/lib/config/firebase/admin` -> `adminDb`
    *   `@/lib/types/tag`
*   **Imported By:**
    *   Not currently imported by any file.
*   **Purpose:**
    *   This route fetches all tags and all entries, then calculates the number of entries associated with each tag. It seems to be a more explicit way of calculating `entryCount` than what the main `/api/tags` route provides.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - Its functionality appears to be a more resource-intensive version of a feature already present in the main `/api/tags` route, and it is not currently used anywhere in the application.

---

### Directory: `src/app/api/component-errors` *Deleted*

An unconventional API route for logging client-side errors.

#### File: `src/app/api/component-errors/route.ts` *Deleted*
*   **Imports:**
    *   `next/server` -> `NextResponse`
    *   `fs`
    *   `path`
*   **Imported By:**
    *   Not currently imported by any file, but intended to be called by a client-side error handler.
*   **Purpose:**
    *   Provides `POST` and `GET` methods to write and read client-side error messages to a local `component-errors.json` file on the server. This is a non-standard and potentially insecure method for error logging. The `GET` request also clears out errors older than one hour.
*   **Initial Assessment:**
    *   `Utility/Provider` - This is a developer utility, not part of the core application data flow. Its existence and implementation are questionable.

---

### Directory: `src/app/api/components` *Deleted*

An unconventional API route for listing component files.

#### File: `src/app/api/components/route.ts` *Deleted*
*   **Imports:**
    *   `fs/promises`
    *   `path`
    *   `fs`
*   **Imported By:**
    *   Not currently imported by any file.
*   **Purpose:**
    *   Provides a `GET` method that scans the `src/components` directory on the server's file system and returns a JSON array of all found components, noting the existence of corresponding `.module.css` and `.test.tsx` files.
*   **Initial Assessment:**
    *   `Utility/Provider` - This is a developer utility, not part of the application's data flow.

## Directory: `src/app/api/photos` *Rename to images? Organize around services?*

Contains the many API routes related to the photo service abstraction layer. This directory is significantly more complex than documented.

### Directory: `src/app/api/photos/album` - *Deleted*

An empty directory, possibly a placeholder.

*   **Initial Assessment:**
    *   `Potentially Obsolete`


### Directory: `src/app/api/photos/folder-contents` *ok, Reorganize*

Route for getting the contents of a specific folder from the local photo source.

#### File: `src/app/api/photos/folder-contents/route.ts` *Rename local-contents?*
*   **Imports:**
    *   `next/server` -> `NextResponse`
    *   `@/lib/services/localPhotoService` -> `getFolderContents`
*   **Imported By:**
    *   `@/components/PhotoPicker`
*   **Purpose:**
    *   Handles a `POST` request containing a `folderPath`. It calls the `localPhotoService` to get the images within that specific folder.
*   **Initial Assessment:**
    *   `Live Path`

### Directory: `src/app/api/photos/folder-tree` *ok, reorganize*

Route for getting the entire folder structure from the local photo source.

#### File: `src/app/api/photos/folder-tree/route.ts`
*   **Imports:**
    *   `next/server` -> `NextResponse`
    *   `@/lib/services/localPhotoService` -> `getFolderTree`
*   **Imported By:**
    *   `@/components/PhotoPicker`
*   **Purpose:**
    *   Handles a `GET` request to fetch the complete, nested folder structure from the local photo source, which is then used to build the tree view in the `PhotoPicker`.
*   **Initial Assessment:**
    *   `Live Path`

### Directory: `src/app/api/photos/image` *Consolidate*

Contains redundant routes for serving image files from the local file system.

#### File: `src/app/api/photos/image/route.ts`
*   **Imports:**
    *   `next/server` -> `NextRequest`, `NextResponse`
    *   `fs`, `path`, `mime-types`
*   **Imported By:**
    *   Likely used by client-side components to construct `<img>` `src` URLs.
*   **Purpose:**
    *   Serves an image file from the local file system. It takes a plain text `filePath` as a query parameter and includes a security check to prevent directory traversal.
*   **Initial Assessment:**
    *   `Live Path (but potentially redundant)`

#### Directory: `src/app/api/photos/image/[id]` *ok*

##### File: `src/app/api/photos/image/[id]/route.ts`
*   **Imports:**
    *   `next/server` -> `NextResponse`
    *   `@/lib/services/onedrive/config` -> `getConfig`
    *   `fs`, `path`
*   **Imported By:**
    *   Unknown.
*   **Purpose:**
    *   Also serves an image file from the local file system. However, it takes a **base64-encoded** path as a route parameter (`[id]`). This is a second, parallel implementation for serving images.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - This implementation is redundant with the other `image` route and its usage is unclear. It should be consolidated.

---

### Directory: `src/app/api/photos/preview/[id]` *ok*

A third, redundant route for serving image files.

#### File: `src/app/api/photos/preview/[id]/route.ts`
*   **Imports:**
    *   `next/server` -> `NextResponse`, `NextRequest`
    *   `fs/promises`, `path`
*   **Imported By:**
    *   Unknown.
*   **Purpose:**
    *   Serves an image file from the local file system, taking a base64-encoded path as a route parameter. It appears functionally identical to `/api/photos/image/[id]/route.ts`, but is labeled as a "preview". It serves the full, raw image without any processing.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - This is a third, redundant image-serving implementation that creates significant confusion.

### Directory: `src/app/api/photos/source-collections` *ok*

Routes for interacting with "Source Collections" from external providers (specifically OneDrive).

#### File: `src/app/api/photos/source-collections/route.ts`
*   **Imports:**
    *   `next/server` -> `NextResponse`, `NextRequest`
    *   `@/lib/services/onedrive/graphService` -> `listFolderContents`
    *   `@/lib/types/album` -> `SourceCollection`
    *   `next-auth/next` -> `getServerSession`
    *   `@/app/api/auth/[...nextauth]/route` -> `authOptions`
*   **Imported By:**
    *   Unknown.
*   **Purpose:**
    *   Handles a `GET` request to list folders from the root of a connected OneDrive account, treating them as "Source Collections". It uses `next-auth` for authentication, which seems to be an isolated implementation detail.
*   **Initial Assessment:**
    *   `Live Path (for incomplete feature)` - This is part of the OneDrive integration which is not yet complete.

#### Directory: `src/app/api/photos/source-collections/[id]` *ok*

An empty directory, likely a placeholder for fetching a single source collection.

*   **Initial Assessment:**
    *   `Potentially Obsolete`

### Directory: `src/app/api/photos/thumbnail/[id]` *Consolidate*

A fourth, redundant route for serving image files.

#### File: `src/app/api/photos/thumbnail/[id]/route.ts`
*   **Imports:**
    *   `next/server` -> `NextResponse`, `NextRequest`
    *   `fs/promises`, `path`
*   **Imported By:**
    *   Unknown.
*   **Purpose:**
    *   This is a fourth implementation for serving a raw image file from the local file system. It is a direct copy of `/api/photos/preview/[id]/route.ts` and serves the full-resolution image, not a thumbnail.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - The existence of four different image-serving routes is a major architectural flaw. This one is especially misleadingly named.

### Directory: `src/app/api/photos/upload` 

Route for handling file uploads to Firebase Storage.

#### File: `src/app/api/photos/upload/route.ts` *ok*
*   **Imports:**
    *   `next/server` -> `NextRequest`, `NextResponse`
    *   `@/lib/firebase/admin` -> `getAdminApp`
    *   `firebase-admin/storage`
    *   `uuid`, `sharp`
*   **Imported By:**
    *   Likely used by components that have an "upload" feature, such as the `EntryForm`.
*   **Purpose:**
    *   Provides a `POST` endpoint to upload a file. It saves the file to a public Firebase Storage bucket with a unique name, uses `sharp` to get image dimensions, and returns the public URL and metadata.
*   **Initial Assessment:**
    *   `Live Path`

## Directory: `src/app/view`

This directory contains the main public-facing routes for viewing content.

### File: `src/app/view/layout.tsx` *ok*
*   **Imports:**
    *   `@/components/view/ViewLayout`
    *   `@/lib/contexts/FilterContext` -> `FilterProvider`
*   **Imported By:**
    *   Next.js router for all routes under `/view`.
*   **Purpose:**
    *   Wraps all view pages with the `FilterProvider` and the main `ViewLayout`.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/app/view/page.tsx` *ok*
*   **Imports:**
    *   `@/components/view/CardGrid`
    *   `@/lib/hooks/useContent`
    *   `@/components/view/ContentTypeFilter`
    *   `@/components/admin/AdminFAB`
*   **Imported By:**
    *   Next.js router for the `/view` path.
*   **Purpose:**
    *   The main content browsing page. It uses the `useContent` hook to fetch and display a grid of entry and album cards, implements infinite scroll, and includes the `ContentTypeFilter`.
*   **Initial Assessment:**
    *   `Live Path`

### Directory: `src/app/view/album-view/[id]`

Route for displaying a single album.

#### File: `src/app/view/album-view/[id]/page.tsx` *ok - Needs significant work*
*   **Imports:**
    *   `@/lib/types/album`
    *   `@/components/view/album/AlbumLayout`
*   **Imported By:**
    *   Next.js router for `/view/album-view/[id]`.
*   **Purpose:**
    *   Fetches a single album from the `/api/albums/[id]` endpoint and renders it using the `AlbumLayout` component.
*   **Initial Assessment:**
    *   `Live Path`

### Directory: `src/app/view/entry-view/[id]`

Route for displaying a single entry.

#### File: `src/app/view/entry-view/[id]/page.tsx` *ok - Needs significant work*
*   **Imports:**
    *   `@/lib/hooks/useEntry`
    *   `@/components/view/entry/EntryLayout`
*   **Imported By:**
    *   Next.js router for `/view/entry-view/[id]`.
*   **Purpose:**
    *   Uses the `useEntry` hook to fetch a single entry and renders it using the `EntryLayout` component.
*   **Initial Assessment:**
    *   `Live Path`

## Directory: `src/components` 

Contains shared React components used across the application.

### File: `src/components/PhotoPicker.tsx` *ok*
*   **Imports:**
    *   `next/image`
    *   `@/lib/services/photos/photoService`
    *   `@/lib/types/photo`
*   **Imported By:**
    *   `@/components/EntryCoverPhoto.tsx`
    *   `@/app/admin/album-admin/page.tsx`
    *   `@/app/admin/album-admin/[id]/edit/page.tsx`
*   **Purpose:**
    *   A comprehensive, modal-based component for selecting photos. It features a file-tree view for navigating folders and a grid view for selecting one or more photos. It uses the `photoService` to abstract the data source.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/EntryCoverPhoto.tsx` *Deleted*
*   **Imports:**
    *   `next/image`
    *   `@/lib/services/photos/photoService`
    *   `./PhotoPicker`
*   **Imported By:**
    *   Unknown (grep search failed).
*   **Purpose:**
    *   A component designed to select a cover photo for an entry. It displays the current cover photo or a placeholder, and opens the `PhotoPicker` to select a new one.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - This component is broken. It attempts to call `PhotoPicker` with incorrect props (`mode`, `onSelect`). Given that the `EntryForm` (where this would logically be used) has its own cover photo logic, this component is likely unused and was created during an earlier stage of development.

### File: `src/components/AlbumGrid.tsx` *Deleted*
*   **Imports:**
    *   `next/image`, `next/link`
    *   `@/lib/services/photos/photoService`
*   **Imported By:**
    *   Unknown (grep search failed).
*   **Purpose:**
    *   Displays a grid of photos for a given album, including the album's title and description. It has props for linking to an associated entry and handling clicks on individual photos.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - Its purpose seems to overlap significantly with `view/album/AlbumLayout.tsx`. It's unclear where this component would be used. The `src` attribute for the `Image` (`file://${photo.path}`) is also a potential issue for web deployment.

## Directory: `src/components/admin` 

Contains components used exclusively within the admin section.

### File: `src/components/admin/AdminSidebar.tsx`*ok*
*   **Imports:**
    *   `next/link`, `next/navigation`
*   **Imported By:**
    *   Not currently imported. It appears to have been replaced by the `AdminFAB` and the main navigation in `ViewLayout`.
*   **Purpose:**
    *   A simple vertical navigation bar with links to the main admin pages (Entries, Albums, Tags). It highlights the active link based on the current path.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

### File: `src/components/admin/AlbumPhotoManager.tsx` *Deleted*
*   **Imports:**
    *   `@/lib/types/album`
    *   `../PhotoPicker`
    *   `@/lib/services/photos/photoService`
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   A modal-based component for managing the photos within a single album. It allows for adding, removing, reordering (via drag-and-drop), and captioning photos, as well as setting the cover image.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - This component is broken. It calls `PhotoPicker` with a `multiSelect` prop which does not exist (`initialMode="multi"` is the correct prop). It appears to be a leftover from a different implementation than the one currently used on the album edit page (`/admin/album-admin/[id]/edit`).

### File: `src/components/admin/AdminFAB.tsx` *ok*
*   **Imports:**
    *   `next/link`
*   **Imported By:**
    *   `@/app/admin/layout.tsx`
    *   `@/app/view/page.tsx`
*   **Purpose:**
    *   A Floating Action Button (FAB) that provides quick links to create a new entry or a new album. It has an expanded state to show the two options.
*   **Initial Assessment:**
    *   `Live Path`

## Directory: `src/components/admin/album-admin`

Contains components used specifically on the album administration pages.

### File: `src/components/admin/album-admin/AlbumForm.tsx` *ok*
*   **Imports:**
    *   `@/lib/types/album`, `@/lib/types/photo`
    *   `../entry-admin/CoverPhotoContainer`
*   **Imported By:**
    *   `@/app/admin/album-admin/[id]/edit/page.tsx`
*   **Purpose:**
    *   A form for editing the metadata of an album (title, description, caption, cover photo). It reuses the `CoverPhotoContainer` component from the entry admin section.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/admin/album-admin/PhotoManager.tsx` *ok*
*   **Imports:**
    *   `react-photo-album`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
    *   `@/lib/types/album`
*   **Imported By:**
    *   `@/app/admin/album-admin/[id]/edit/page.tsx`
*   **Purpose:**
    *   A sophisticated component for managing the photos within an album. It uses `react-photo-album` to create a visually pleasing grid and integrates `dnd-kit` to allow for drag-and-drop reordering of photos.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/admin/album-admin/AlbumStyleSelector.tsx` *ok, Needs work.*
*   **Imports:**
    *   `@/lib/types/album`
*   **Imported By:**
    *   `@/app/admin/album-admin/[id]/edit/page.tsx`
*   **Purpose:**
    *   Allows the user to select a visual style for the album from a predefined list. It currently uses a hardcoded list of mock styles.
*   **Initial Assessment:**
    *   `Live Path`

---

## Directory: `src/components/admin/entry-admin`

Contains components used specifically on the entry administration pages.

### File: `src/components/admin/entry-admin/EntryForm.tsx` *ok*
*   **Imports:**
    *   `@/lib/types/entry`, `@/lib/types/photo`
    *   `@/lib/services/entryService`, `@/lib/services/tagService`
    *   `@/components/common/TagSelector`
    *   `@/components/common/RichTextEditor`
    *   `./CoverPhotoContainer`
    *   `@/components/PhotoPicker`
*   **Imported By:**
    *   `@/app/admin/entry-admin/new/page.tsx`
    *   `@/app/admin/entry-admin/[id]/edit/page.tsx`
*   **Purpose:**
    *   The primary component for creating and editing an entry. It's a large, complex form that includes a title, a rich text editor, a tag selector, and a cover photo container. It handles all logic for data state, validation, and submission.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/admin/entry-admin/CoverPhotoContainer.tsx` *Move to common/?*
*   **Imports:**
    *   `@/lib/types/photo`
    *   `@/components/PhotoPicker`
*   **Imported By:**
    *   `@/components/admin/album-admin/AlbumForm.tsx`
    *   `@/components/admin/entry-admin/EntryForm.tsx`
*   **Purpose:**
    *   A dedicated component for managing a cover photo. It allows adding, changing, and removing a cover photo via the `PhotoPicker`. It also includes a unique "repositioning" feature that allows the user to adjust the `object-position` of the image with sliders, providing a focal point for the cover photo.
*   **Initial Assessment:**
    *   `Live Path`

## Directory: `src/components/common`

Contains a large number of shared components used throughout the application.

### File: `src/components/common/AppLayout.tsx` *Deleted*
*   **Imports:**
    *   `next/navigation`
    *   `./Navigation`
    *   `./TagTree`
*   **Imported By:**
    *   Not currently imported. Appears to have been superseded by `ViewLayout`.
*   **Purpose:**
    *   An earlier version of the main application layout. It includes logic to show/hide the `Navigation` and `TagTree` sidebar based on the current route. It has a toggle button for the sidebar.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

### File: `src/components/common/AppWrapper.tsx` *Deleted*
*   **Imports:**
    *   `@/components/view/ViewLayout`
    *   `@/lib/contexts/TagContext`
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   Appears to be an unnecessary wrapper. It gets the `setSelectedTag` function from the `TagContext` and passes it down to `ViewLayout`. This can be done more directly.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

### File: `src/components/common/FigureWithImageView.tsx` *ok*
*   **Imports:**
    *   `@tiptap/react`
    *   `next/image`
*   **Imported By:**
    *   `@/lib/tiptap/FigureWithImage.ts` (as a Tiptap node view)
*   **Purpose:**
    *   A custom Tiptap component that defines how images (`<figure>` and `<img>`) are rendered within the rich text editor. It correctly uses the Next.js `Image` component for optimized, responsive images and provides the editable `<figcaption>`.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/common/ImageToolbar.tsx` *Deleted*
*   **Imports:**
    *   `@tiptap/core`
*   **Imported By:**
    *   `@/components/common/RichTextEditor.tsx`
*   **Purpose:**
    *   A floating toolbar that appears when an image is selected in the Tiptap editor. It provides buttons to control the image's size, alignment, and aspect ratio. It communicates the chosen action back to the `RichTextEditor`.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/common/ImageUploadDialog.tsx` *Deleted*
*   **Imports:**
    *   `firebase/storage`
*   **Imported By:**
    *   Not currently imported. It appears to have been superseded by the `PhotoPicker` and the `/api/photos/upload` route.
*   **Purpose:**
    *   A modal dialog for uploading an image directly from the user's computer to Firebase Storage. It includes a progress bar and basic validation.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - The current implementation for adding images to the editor uses the `PhotoPicker` (for local drive "uploads") or pasting, not this direct upload dialog. This component also uses the client-side Firebase Storage SDK, which may be undesirable.

### File: `src/components/common/Navigation.tsx` *ok*
*   **Imports:**
    *   `next/link`, `next/navigation`
    *   `./ThemeToggle`
*   **Imported By:**
    *   `@/components/view/ViewLayout`
*   **Purpose:**
    *   The main top navigation bar for the application. It includes the logo, links to "Content" and "Admin", and the `ThemeToggle` component. It also contains logic for a responsive hamburger menu on mobile.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/common/Pagination.tsx` *Deleted*
*   **Imports:**
    *   `react`
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   This is a non-rendering component that contains vanilla JavaScript logic to control a paginated layout. It directly queries and manipulates the DOM for elements with classes like `.page`, which is a fragile, non-React pattern. It seems designed for a "book-like" two-page spread on desktop.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

### File: `src/components/common/RichTextEditor.tsx` *ok*
*   **Imports:**
    *   `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-blockquote`
    *   `@/lib/tiptap/extensions/FigureWithImage`
    *   `@/components/PhotoPicker`
    *   `./ImageToolbar`
    *   `@/lib/types/photo`
*   **Imported By:**
    *   `@/components/admin/entry-admin/EntryForm.tsx`
    *   `@/components/view/entry/EntryLayout.tsx` (as a non-editable renderer)
*   **Purpose:**
    *   A sophisticated rich text editor based on Tiptap. It includes standard formatting, a custom node for figures with images, a floating toolbar for image manipulation, and handlers for uploading images via paste or drag-and-drop. It exposes an imperative handle (`ref`) to allow parent components to get its content and add images programmatically.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/common/TagBox.tsx` & `TagBoxGrid.tsx` *Both deleted (w/css)*
*   **Imports:**
    *   `@/lib/types/tag`
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   `TagBox` is a presentational component for displaying a single tag with its name, description, and content counts. `TagBoxGrid` arranges these boxes in a grid, sorting them and assigning sizes based on content count.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - These seem to be part of a `tag-view` page that doesn't exist.

### File: `src/components/common/TagNavigation.tsx` *Deleted*
*   **Imports:**
    *   `next/link`, `next/navigation`, `@/lib/types/tag`
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   A simple navigation list of tags, presumably to switch between different tag detail pages.
*   **Initial Assessment:**
    *   `Potentially Obsolete` - Part of the same unimplemented `tag-view` concept.

### File: `src/components/common/TagSelector.tsx` *. Will be needed for albums edit and new also. Refactor*
*   **Imports:**
    *   `firebase/firestore`, `@/lib/config/firebase` (Client SDK)
    *   `@/lib/types/tag`
*   **Imported By:**
    *   `@/components/admin/entry-admin/EntryForm.tsx`
*   **Purpose:**
    *   A hierarchical, selectable tree of tags used in the entry form. It allows filtering tags by dimension and searching.
    *   **Architectural Issue:** This component fetches its own data directly from Firestore using the **client-side SDK**, which violates the established architecture of using API routes.
*   **Initial Assessment:**
    *   `Live Path (but needs refactoring)`

### File: `src/components/common/TagTree.tsx` *ok, Refactor.*
*   **Imports:**
    *   `@/lib/types/tag`
*   **Imported By:**
    *   `@/components/view/ViewLayout.tsx` (via `TagSidebar`)
*   **Purpose:**
    *   The main tag navigation sidebar for the `/view` route. It displays tags in a collapsible tree structure, showing entry counts for each.
    *   **Architectural Issue:** It fetches data from `/api/tags/tree`, which is a resource-intensive endpoint that we previously identified as `Potentially Obsolete`. It should likely be using the main `/api/tags` route or the `TagContext`.
*   **Initial Assessment:**
    *   `Live Path (but needs refactoring)`

### File: `src/components/common/ThemeProvider.tsx` *ok*
*   **Imports:**
    *   `react`
*   **Imported By:**
    *   `@/app/layout.tsx`
*   **Purpose:**
    *   A standard React context provider for managing the application's theme (light/dark). It handles persisting the theme to local storage and setting the `data-theme` attribute on the `<html>` element.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/common/ThemeToggle.tsx` *ok*
*   **Imports:**
    *   `./ThemeProvider`
*   **Imported By:**
    *   `@/components/common/Navigation.tsx`
*   **Purpose:**
    *   A simple button that uses the `useTheme` hook to toggle between light and dark themes.
*   **Initial Assessment:**
    *   `Live Path`

## Directory: `src/components/view`

Contains components used in the public-facing content viewing areas of the application.

### File: `src/components/view/AppFrame.tsx` *Deleted*
*   **Imports:**
    *   `next/navigation`, `./common/Navigation`, `./common/TagTree`
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   A duplicate of `src/components/common/AppLayout.tsx`. It's an early version of the main application layout.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

### File: `src/components/view/CardGrid.tsx` *ok*
*   **Imports:**
    *   `./ContentCard`
*   **Imported By:**
    *   `@/app/view/page.tsx`
*   **Purpose:**
    *   Responsible for rendering a grid of `ContentCard` components. It defines various content types and assigns a random size to cards if one isn't provided.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/view/ContentCard.tsx` *ok*
*   **Imports:**
    *   `next/link`
    *   `@/lib/types/tag`, `@/lib/types/photo`
    *   `swiper/react`, `swiper/modules`
*   **Imported By:**
    *   `./CardGrid.tsx`
*   **Purpose:**
    *   The core component for displaying a single piece of content (entry, album, or tag) in the main grid. It has different rendering logic for each type. For albums, it uses the `Swiper` library to create a slideshow of images within the card.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/view/ContentTypeFilter.tsx` *ok, but not working no. Rename ContentFilter?* 
*   **Imports:**
    *   `@/lib/contexts/FilterContext`
*   **Imported By:**
    *   `@/app/view/page.tsx`
*   **Purpose:**
    *   A set of buttons that allows the user to filter the main content view by type (All, Entries, Albums). It uses the `FilterContext` to manage the state. It also shows sub-filters when 'Entries' is selected.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/components/view/Home.tsx` *ok*
*   **Imports:**
    *   `next/navigation`
*   **Imported By:**
    *   Not currently imported. The functionality is now directly in `/app/page.tsx`.
*   **Purpose:**
    *   The component for the main landing page, featuring a welcome message and an "Enter" button.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

### File: `src/components/view/SlideOutNavigation.tsx` *Deleted*
*   **Imports:**
    *   `next/navigation`
    *   `./CardGrid`
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   A completely different navigation concept where a panel slides out from the side, containing tabs for Entries, Albums, and Tags, each showing a `CardGrid` with mock data.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

### File: `src/components/view/ViewLayout.tsx` *ok*
*   **Imports:**
    *   `next/navigation`
    *   `@/components/common/Navigation`
    *   `@/components/common/TagTree`
    *   `@/components/admin/AdminSidebar`
    *   `@/lib/contexts/FilterContext`
*   **Imported By:**
    *   `@/app/admin/layout.tsx`
    *   `@/app/view/layout.tsx`
*   **Purpose:**
    *   The primary layout for the entire application (except the home page). It includes the top `Navigation` and a collapsible sidebar that conditionally renders either the `TagTree` (for the view section) or the `AdminSidebar` (for the admin section).
*   **Initial Assessment:**
    *   `Live Path`

---

### Directory: `src/components/view/album` *Both components/view/album/ and components/view/album-view/ contain pages as a result of AI assitants not following strucutre and creating whatever they want. Find the most recent/most correct and leave/move to album-view. Delete components/view/album/*

#### File: `src/components/view/album/AlbumLayout.tsx` 
*   **Imports:**
    *   `react-photo-album`, `@/lib/types/album`
*   **Imported By:**
    *   `@/app/view/album-view/[id]/page.tsx`
*   **Purpose:**
    *   The primary component for displaying a single album. It uses `react-photo-album` to create a responsive photo grid and includes a simple lightbox feature for viewing full-size images.
*   **Initial Assessment:**
    *   `Live Path`

---

### Directory: `src/components/view/entry`*Both components/view/entry/ and components/view/entry-view/ contain pages as a result of AI assitants not following strucutre and creating whatever they want. Find the most recent/most correct and leave/move to entry-view. Delete components/view/entry/*

#### File: `src/components/view/entry/EntryLayout.tsx` 
*   **Imports:**
    *   `next/navigation`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-blockquote`
    *   `@/lib/tiptap/extensions/FigureWithImage`
    *   `@/lib/types/entry`
*   **Imported By:**
    *   `@/app/view/entry-view/[id]/page.tsx`
*   **Purpose:**
    *   The layout for displaying a single entry. It uses a non-editable Tiptap editor instance to render the rich text content, and also displays the entry's title and cover photo. It includes a back button for navigation.
*   **Initial Assessment:**
    *   `Live Path`


## Directory: `src/lib`

Contains shared libraries, hooks, services, and type definitions.

## Directory: `src/lib/contexts`

Contains React Contexts for sharing state across the application.

### File: `src/lib/contexts/FilterContext.tsx` *Ok*
*   **Imports:**
    *   `react`
*   **Imported By:**
    *   `@/app/view/layout.tsx`
    *   `@/components/view/ContentTypeFilter.tsx`
    *   `@/components/view/ViewLayout.tsx`
    *   `@/lib/hooks/useContent.ts`
*   **Purpose:**
    *   Manages the state for all content filtering, including selected tags, content type (all/entries/albums), and entry subtype. It provides functions for updating this state to consumers.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/lib/contexts/TagContext.tsx` *Needed? Refactor*
*   **Imports:**
    *   `@/lib/services/tagService` (Incorrectly)
    *   `@/lib/types/tag`
*   **Imported By:**
    *   `@/app/layout.tsx`
*   **Purpose:**
    *   Provides global access to the full list of tags.
    *   **Architectural Issue:** This is a client-side context that directly imports and calls a server-side service (`tagService`). This will fail the build and violates the client-server architecture. It should fetch data from the `/api/tags` route.
*   **Initial Assessment:**
    *   `Live Path (but needs immediate refactoring)`

## Directory: `src/lib/hooks`

Contains custom React Hooks for fetching data and managing component logic.

### File: `src/lib/hooks/useContent.ts` *ok*
*   **Imports:**
    *   `@/lib/contexts/FilterContext`, `@/lib/types/entry`, `@/lib/types/album`
*   **Imported By:**
    *   `@/app/view/page.tsx`
*   **Purpose:**
    *   The primary hook for fetching and managing the content for the main view page. It handles fetching paginated entries and albums from `/api/content`, maintains a master list of all fetched content, and applies client-side filtering based on the `FilterContext`.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/lib/hooks/useEntry.ts` *ok*
*   **Imports:**
    *   `@/lib/types/entry`
*   **Imported By:**
    *   `@/app/view/entry-view/[id]/page.tsx`
    *   `@/app/admin/entry-admin/[id]/edit/page.tsx`
*   **Purpose:**
    *   Fetches a single entry by its ID from the `/api/entries/[id]` endpoint.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/lib/hooks/useStory.ts` & `useStories.ts` *Both deleted.*
*   **Imports:**
    *   A non-existent `../journal` module.
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   These hooks appear to be from a much earlier version of the application. They reference a non-existent `Story` type and try to fetch from a non-existent `/api/stories` endpoint.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

### File: `src/lib/hooks/useEntries.ts`  *Deleted*
*   **Imports:**
    *   `@/lib/services/entryService` (Incorrectly)
    *   `@/lib/types/entry`
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   A hook for fetching a paginated list of entries.
    *   **Architectural Issue:** This is a client-side hook that directly calls the `entryService`, violating the client-server architecture. Its functionality is also superseded by `useContent`.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

## Directory: `src/lib/services`

Contains the core business logic for the application, acting as the bridge between the API routes and the database. All files in this directory should be server-only.

### File: `src/lib/services/albumService.ts` *ok*
*   **Imports:**
    *   `@/lib/config/firebase/admin` (Correct)
    *   `@/lib/types/album`, `@/lib/types/services`
*   **Imported By:**
    *   `@/app/api/albums/route.ts`
    *   `@/app/api/albums/[id]/route.ts`
    *   `@/app/api/content/route.ts`
*   **Purpose:**
    *   Provides all the core CRUD (Create, Read, Update, Delete) and list operations for albums. It correctly uses the Firebase Admin SDK to interact with the Firestore `albums` collection.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/lib/services/backupService.ts` *Deleted*
*   **Imports:**
    *   `@/lib/config/firebase` (Incorrectly)
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   A service intended to back up entries to a separate Firestore collection.
    *   **Architectural Issue:** This service incorrectly uses the **client-side** Firestore SDK, making it non-functional on the server where backups should occur.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

### File: `src/lib/services/cacheService.ts` *- Is something else needed?*
*   **Imports:**
    *   `@/lib/types/entry`, `@/lib/types/tag`
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   A generic, in-memory cache class with a time-to-live (TTL) and max size. It's a simple implementation and not a persistent or shared cache.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

### File: `src/lib/services/entryService.ts` *ok, Refactor*
*   **Imports:**
    *   `@/lib/config/firebase/admin` (Correct)
    *   `./cacheService`, `./backupService` (Obsolete dependencies)
    *   `./mockData` (Incorrect dependency for production service)
*   **Imported By:**
    *   `@/app/api/content/route.ts`
*   **Purpose:**
    *   Provides all the core CRUD and list operations for entries. It correctly uses the Firebase Admin SDK.
    *   **Architectural Issue:** It has several incorrect dependencies on obsolete services (`cacheService`, `backupService`) and mock data. The caching logic that exists is flawed and inefficient.
*   **Initial Assessment:**
    *   `Live Path (but needs refactoring)`

### File: `src/lib/services/localPhotoService.ts` *ok*
*   **Imports:**
    *   `fs`, `path`, `sharp` (Correct server-only modules)
    *   `@/lib/types/photo`
*   **Imported By:**
    *   `@/app/api/photos/folder-contents/route.ts`
    *   `@/app/api/photos/folder-tree/route.ts`
*   **Purpose:**
    *   A server-side service that interacts with the local file system to provide a folder tree and the contents of a specific folder. This powers the `PhotoPicker` for the local photo source.
*   **Initial Assessment:**
    *   `Live Path`

### File: `src/lib/services/tagService.ts` *ok, Rewrite*
*   **Imports:**
    *   Client-side firebase SDK (Incorrectly)
    *   `./cacheService` (Obsolete dependency)
*   **Imported By:**
    *   `@/app/admin/album-admin/page.tsx`
    *   `@/app/admin/entry-admin/page.tsx`
    *   `@/app/admin/tag-admin/page.tsx`
    *   `@/lib/contexts/TagContext.tsx`
*   **Purpose:**
    *   This file is intended to provide CRUD and list operations for tags.
    *   **Architectural Issue:** This file is a severe violation of the client-server architecture. It mixes client-side functions (like `getTags` which fetches from an API) and server-side logic (like `deleteTag` which has no business being called from the client), and it uses the client-side Firestore SDK throughout. It also contains bizarre, non-functional client-side code for tracking read counts. It needs to be completely split and rewritten.
*   **Initial Assessment:**
    *   `Needs complete rewrite`

---

## Directory: `src/lib/tiptap`

Contains the configuration and custom extensions for the Tiptap rich text editor.

### File: `src/lib/tiptap/extensions/FigureWithImage.ts` *ok*
*   **Imports:**
    *   `@tiptap/core`, `@tiptap/react`
    *   `@/components/common/FigureWithImageView`
*   **Imported By:**
    *   `@/components/common/RichTextEditor.tsx`
*   **Purpose:**
    *   The primary Tiptap extension for handling images. It defines a single `figureWithImage` node that encapsulates an image and its caption. It correctly uses a React `NodeView` (`FigureWithImageView`) to render the component, which is the modern and recommended approach.
*   **Initial Assessment:**
    *   `Live Path`

### Files: `figure.ts`, `figcaption.ts`, `components/Figure.tsx` *Deleted*
*   **Imports:**
    *   Various Tiptap and React imports.
*   **Imported By:**
    *   Not currently imported.
*   **Purpose:**
    *   These files represent an older way of implementing the same functionality. `figure.ts` and `figcaption.ts` define separate nodes, and `Figure.tsx` is a separate NodeView component for just the figure. This approach is more complex and has been replaced by the single, integrated `FigureWithImage.ts`.
*   **Initial Assessment:**
    *   `Potentially Obsolete`

---

</rewritten_file>