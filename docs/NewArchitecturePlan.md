# New Architecture Implementation Plan

## 1. Introduction & Goals

The primary goal of this plan is to fully transition the application from its dual-entity architecture (`Entries` and `Albums`) to the new, unified `Card` model.

This project will deliver a complete administrative interface for `Card` management, enabling full CRUD (Create, Read, Update, Delete) operations. The new system will be built in parallel with the existing one, ensuring no disruption to current functionality until the new architecture is complete and a migration has been performed.

---

## 2. Guiding Principles

- **Leverage Existing Code:** We will not build the admin from scratch. The existing, functional admin components for Entries and Albums will be copied and modified for the `Card` entity. This minimizes development time and risk.
- **Non-Disruptive Development:** The old architecture will remain fully operational. The new admin and consumption pages will be built under a new route (`/admin/card-admin`) and will not interfere with existing user flows.
- **Incremental Rollout:** We will build and validate each piece of functionality phase by phase, ensuring each component is stable before moving to the next.

---

## 3. Development Phases

### Phase 1: Admin Foundation & "Read" Functionality
**Status: 100% COMPLETE**

This phase focused on creating the basic structure for card administration and the ability to view all cards.

1.  **Create Admin Route:**
    -   Duplicate the `src/app/admin/entry-admin` directory and rename it to `src/app/admin/card-admin`.
    -   Update the routing and navigation to include a link to the new "Card Admin" section in the main admin layout.

2.  **Build Card List View:**
    -   Modify the copied `page.tsx` within `card-admin` to fetch and display a list of all `cards` instead of `entries`.
    -   Update the table columns to reflect `Card` properties (`title`, `type`, `displayMode`, `status`, `createdAt`).
    -   Ensure existing search and filter functionality is adapted to work with the `cardService`.

### Phase 2: "Create" & "Update" Functionality
**Status: 100% COMPLETE**

This was the most critical phase, focusing on the form for creating and editing cards.

1.  **Duplicate and Refactor the Form Component:**
    -   Copy the existing `EntryForm` and refactor it into a new, `useReducer`-based `CardForm.tsx`.

2.  **Adapt Form for All Card Properties:**
    -   Modify the form to manage all `Card` fields, including `title`, `subtitle`, `status`, `type`, `displayMode`, `content`, `coverImage`, `tags`, and `excerpt`.

3.  **Implement Child Card Management:**
    -   Build a new `ChildCardManager` component within the `CardForm` to manage `childrenIds`.
    -   **Functionality:** Search for cards, display children, reorder via drag-and-drop, and remove children.

4.  **Implement Gallery Management:**
    -   Build a new `GalleryManager` component within the `CardForm`.
    -   **Functionality:** Select multiple images, reorder them via drag-and-drop, and edit per-image metadata (caption, focal point).

### Phase 3: Admin Workflow & Experience
**Status: IN PROGRESS**

This phase focuses on replicating and improving the core administrative workflow features.

1.  **Stabilization & Hardening:** **COMPLETE**
    -   Conducted a full audit of all `Card` API endpoints (`/api/cards` and `/api/cards/[id]`).
    -   Fixed critical security vulnerabilities by adding admin authentication checks to all `GET` handlers.
    -   Improved server-side validation and error handling in the `createCard` service function.
    -   This audit establishes a baseline for security and stability before proceeding.

2.  **Refactor Floating Action Button (FAB):** **COMPLETE**
    -   We have created a new, dedicated `CardAdminFAB` component for the card admin section.
    -   The main admin layout now conditionally renders the correct FAB, ensuring non-disruptive integration.
    -   The button correctly navigates to the "new card" page and is hidden on create/edit forms.

3.  **Implement Bulk Tag Editing:**
    -   Add checkboxes to the card list view in `/admin/card-admin`.
    -   Create a "Bulk Edit" UI (modal) that appears when cards are selected.
    -   The UI will allow for adding and removing tags from all selected cards at once.
    -   Create the necessary backend service and API endpoint (`/api/cards/bulk-update`) to handle the operation.

4.  **Implement "Delete" Functionality & Safeguards:** **COMPLETE**
    -   The "Delete" button has been added to the `CardForm`.
    -   The `deleteCard` service and API logic are fully implemented.
    -   A critical safeguard now warns the user before deleting a card that is a child of another.

5.  **Implement "View as User" Link:**
    -   Ensure the "View" link for each card in the admin list points to the card's future public-facing consumption page. This will likely be completed in tandem with Phase 5.

### Phase 4: Consumption Experience
**Status: NOT STARTED**

This phase focuses on building the non-admin user experience for consuming the new Card content.

1.  **Build Main Card View:**
    -   Create the primary consumption page (e.g., at `/view`) that displays a filterable grid of all published `Card`s.
    -   Integrate the tag-based filtering system.
2.  **Build Individual Card Page:**
    -   Create the page for viewing a single `Card` and its content (e.g., `/view/[id]`).

### Phase 5: Migration & Finalization
**Status: NOT STARTED**

Once the new `Card` admin and consumption views are fully tested and approved, the final steps can be taken:

1.  **Write Migration Script:** Create a one-time script that reads all documents from the `entries` and `albums` collections and converts them into new documents in the `cards` collection.
2.  **Verify Migration:** Manually review the migrated data to ensure integrity.
3.  **Deprecate Old System:** Once the migration is successful, the old admin routes, services, and view pages can be safely removed from the codebase.

---

## 4. Technical & Coding Standards

- **Async/Await Best Practices:** Per our discussion, all new asynchronous code will be written to be robust and clean. We will be mindful of how Next.js handles props like `params` in async Server Components and ensure we handle all Promises correctly to avoid unnecessary warnings and potential race conditions.
- **Service-Oriented Logic:** All database interactions will be handled exclusively through the `cardService.ts` file, keeping our components clean and our data logic centralized.

---

## 5. Migration & Finalization

Once the new `Card` admin is fully tested and approved, the final steps can be taken:

1.  **Write Migration Script:** Create a one-time script that reads all documents from the `entries` and `albums` collections and converts them into new documents in the `cards` collection.
2.  **Verify Migration:** Manually review the migrated data to ensure integrity.
3.  **Deprecate Old System:** Once the migration is successful, the old admin routes, services, and view pages can be safely removed from the codebase. 