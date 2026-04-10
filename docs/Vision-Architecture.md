# VISION & ARCHITECTURE

**See also:** `Application.md` · `Implementation.md`

Legend:
✅`Implemented`
⭕`Planned (1/2/3)`
🔵`Parked`
❓`Open`
📐`Decision`
📘`Resource`

---

## Document Governance

- **Three-Document Model** - Project documentation is split across three files in `docs/`:
  - `Vision-Architecture.md` — Product vision, principles, technical stack, data models, decisions. Stable; changes rarely.
  - `Application.md` — Each app area with ✅, ⭕, ❓, 🔵 all together per section. Changes when features ship or are planned.
  - `Implementation.md` — Execution plan and phased sequencing. Changes when priorities shift.
- **AI Behavior** - AI process, approval, and execution rules live in `.cursor/rules/# AI_InteractionRules.mdc`.
- **Author** - Provides direction, constraints, and priorities--not implementation details.
- **AI/Engineering** - Proposes how to build, designs flows, and recommends technical approaches.

### Document Structure
- **Heading Lock** - All ATX headings are fixed. Do not add new headings.
- **Subheading Lock** - Subheadings are *Intent*, *Principles*, and *Features*. Do not add new subheadings.
- **Formatting**
    - Headings are **bold**. Subheadings are *italic*.
    - Intent/Principles bullets start with a **bold** 1–2 word subject, then short descriptive text.
    - Features are preceded by ✅, ⭕, 📐, ❓, 📘, or 🔵, followed by a **bold** 1–2 word title + " - " + short descriptive text.

### Content Placement
- **Placement Discipline** - Record each subject in its owning section. Everything about Story cards belongs under Story card features, not mentioned in Tags or Navigation. Everything about tags belongs under Tag Management, not mentioned in Navigation. Centralizes subjects for clarity and prevents drift.
- **One Fact, One Home** - Each fact lives in exactly one document. `Application.md` describes *what exists today* and *what's planned per area*. `Implementation.md` describes *when to do it* (sequencing). When a planned item ships, update its status in `Application.md` and remove it from `Implementation.md`.

---

## **Product Vision**

*Intent*
- **Storytelling** - A private storytelling journal for family archives.
- **Comprehensive** - Media and authored narrative in one coherent experience.

*Principles*
- **Curated & Freeform** - Support both curated and freeform discovery.
- **Relational** - Organic discovery via dimensional, hierarchical tags.
- **Multi-Media** - Interactive text and media experience.
- **Unified Schema** - Flexible card model; one schema, multiple presentation behaviors.
- **Mobile-first** - Mobile and desktop operation, UX with predictable interactions across device sizes.
- **Scalable** - Scale toward large personal archives with operational practicality.
- **Narrative Control** - Curated collections of cards provide directed storytelling.
- **Organic Discovery** - Tag-based filtering, random presentation and suggestions enables exploration.
- **Content Flexibility** - Multiple forms of underlyingly structured content.
- **User Experience Consistency** - Cross-device navigation patterns
- **Scalability** - Performance optimization for large content libraries
- **Practical** - Deliver a coherent content consumption experience plus practical admin tooling.

The product concept is to combine one's photos and stories into an interactive 'journal'-- a storytelling platform that allows author-curated or freeform discovery--combining hardcopy journals and images in a combination journal-album. 

Photo apps like Apple and Google are very efficient interfaces, and they have album creation and freeform tagging capability, but they are limited in integrating text and organizing the images and albums, and can quickly devolve into a disorganization.

This app seeks to leverage multiple photo repositories and provide a story-telling overlay, either curated or freeform, via a card and heirarchical tag system.

The market for this beyond the author's use would be journalers, memory keepers, families. Some import friction may be acceptable for curated storytelling.

The primary users are the author (admin) creating the content and his family consuming it, primarily on mobile, but also on tablet and desktop.

## **TECHNICAL**

### **Backend**

*Intent*
- **Reliable** - Provide reliable core platform capability
- **Efficient** - Operational and cost awareness.
- **Practical** - Practical for solo-author throughput and family consumption.

*Principles*
- **Client/Server** - Clear separation of concerns; client/server boundaries and service-layer.
- **Validation & Authorization** - Server-side validation and authorization for data integrity.
- **Schema** - Type-safe contracts and explicit server-side schema validation.
- **Services** - Use managed services pragmatically (Firebase/Auth.js/Next.js).

*Features*
✅ **Next.js 15** - App Router, All API routes secured at the edge
✅ **React 19**
✅ **TypeScript**
✅ **`firebase-admin`** - SDK for server-side operations
✅ **Zod** - schema validation
📐 **Denormalized Read** - Keep denormalized read patterns where Firestore query limits demand it.
📐 **Script-Heavy** - Keep script-heavy maintenance available while admin UX matures.
⭕ **Code** - Comment code.
⭕ **ESLint** - Address ESLint violations.
⭕ **Quality** - QA app.
🔵 **Performance** - Possibilities captured from engineering review.
✅ **Directory Structure**
 `src/app/`  Next.js App Router
   `api/` API route handlers
   `admin/` content management interface
   `view/` content consumption interface
   `layout.tsx`  root layout, which includes global providers

 `src/components/` Reusable React components
   `common/` Generic components used across the app 
   `view/` Components specific to the content viewing experience
   `admin/` Components specific for the admin interface 

 `src/lib/` Core application logic, types, and utilities
   `services/` business logic
   `types/` Zod schemas and TypeScript type definitions
   `hooks/` Reusable client-side React hooks
   `utils/` General utility functions (e.g., date formatting, tag manipulation)
    ⭕2 **Directory** - Cleanup directory.
✅ **Data Models** - `src/lib/types/` *read directly - fully commented*
✅ **Typesense** - Full-text search for cards and media. Auto-syncs on CRUD. Falls back to Firestore if unavailable.
✅ **Auth.js** - w/Firebase adapter, role-based access control, session persistence, app wrapper AuthProvider.
    📐 **Auth in Buildout** - During build/content phase, keep using current env-based login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) so work can continue without user provisioning.
    📐 **Auth at Rollout** - At go-live prep, run `npm run seed:journal-users` once to create the single admin in Firestore (`journal_users`) when that collection is empty.
    📐 **Post Seed** - After seed, manage access in Admin > Users (`/admin/journal-users`): create viewer accounts, set/reset passwords, enable/disable access.
    📐 **One Admin** - One admin (author), all other accounts are viewers.

🔵 **Tenant ID** - Not implemented for v1. If multi-tenancy is needed for commercial SaaS (Model C), `tenantId` would be added to cards, media, tags, questions, and journal_users. Every query and security rule would need a tenant filter. Document the scope now; implement only if demand justifies it. See `docs/06-Strategic-Direction.md`.
🔵 **Storage Abstraction** - Firebase Storage APIs are currently called directly in multiple places (`imageImportService.ts`, upload functions, URL generation). Create a single `storageService.ts` module wrapping all storage operations (upload, delete, getUrl). Reduces future migration scope (Cloudflare R2, S3) to one file. Also enables cache-busting for replaced images (append version hash to URL).

### **Frontend**

*Intent*
- **Consumption** - Mobile-first, responsive content consumption experience.
- **Administration** - Desktop-primary admin interface for content authoring and management.

*Principles*
- **UI Alignment** - Align UI behavior with **validated server contracts** (types/schemas); the client does not override server authority on writes. Clear **presentation and client-state** boundaries; business rules stay in services/API layer.

*Features*
✅ **Theme** - CSS modules for styling, global `theme.css` and `fonts.css`
✅ **Rich Text Editing** - `@tiptap/react` rich text editing
✅ **Media Selection** - PhotoPicker for media selection (admin modal picker and simple upload)
✅ **Galleries** - GalleryManager and Swiper for galleries
✅ **Image Optimization** - `next/image` via `JournalImage` wrapper 
✅ **DragnDrop** - `@dnd-kit/core` and `@dnd-kit/sortable`
✅ **Data Fetching** - `SWR` for client-side data fetching and caching 
⭕2 **Unused Dependencies** - Remove unused packages from `package.json`: `react-markdown`, `@uiw/react-md-editor`, `@minoru/react-dnd-treeview`. Evaluate `react-photo-album` (photo grid/mosaic layouts) and `framer-motion` (animation/transitions) for potential use before removing.

### **Scripts**

*Intent*
- **Ex-App Manipulation** - Provide ex-app manipulation of data as needed.

*Principles*
- **Reuse** - Develop and organize for reuse.

*Features*
✅ **Syntax** - `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json`
✅ **Firebase Setup** - Credentials live in `.env`:
✅ **.env** - Scripts must load `.env` before importing Firebase. Use `-r dotenv/config` (and `DOTENV_CONFIG_PATH=.env` if needed) so env vars are available when `admin.ts` initializes
✅ **Maintenance Scripts** - Active operational scripts: `reconcile:media-cards`, `regenerate:storage-urls`, `cleanup:media`, `backup-database`, `backfill:media-metadata`, `seed:journal-users`.
⭕2 **Script Cleanup** - 86 script files under `src/lib/scripts/`; many are obsolete migration, debug, or test scripts not wired into `package.json`. Review and prune.
📘 **Script Index** - `docs/NPM-SCRIPTS.md`.
📘 **Import Reference** - `docs/IMPORT-REFERENCE.md`.

### **Backup**

*Intent*
- **Protection** - Back up is required for the code repo and the database.

*Principles*
- **Automated** - Backups run without manual intervention.
- **Verified** - Backup integrity is confirmed after each run.

*Features*
✅ **Database** - Windows Scheduled Task at 2am daily, auto awake pc, cleared >5 days. Script files exist (`backup-database.ts`, `backup-firestore.ts`) but are not wired into `package.json`.
✅ **Repo** - Github - On every push, for 7 days
    - Commit directly to **`main`** and push to `origin/main`. Do not use feature branches or PR merge flow unless explicitly requested for a specific task.
⭕2 **Operational** - Ensure both backups are operational and verified end-to-end.
