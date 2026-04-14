# VISION & ARCHITECTURE

**See also:** `02-Application.md` · `03-Implementation.md` · `04-Theme-Design-Contract.md` (theme semantics, presets, reader shell & responsive layout §9)

Legend:
✅`Implemented`
⭕`Planned (1/2)`
❓`Open`
📐`Decision`
📘`Resource`

---

## Document Governance

- **Three-Document Model** - Core project documentation is split across three files in `docs/`:
  - `01-Vision-Architecture.md` — Product vision, principles, technical stack, data models, decisions. Stable; changes rarely.
  - `02-Application.md` — Each app area: *Features* grouped under `✅ Complete`, `⭕1 Planned`, `⭕2 Future`, `❓ Open` (plus standalone 📐 / 📘). Changes when features ship or are planned.
  - `03-Implementation.md` — Execution plan and phased sequencing (`⭕1` only). Changes when priorities shift. Each listed item must repeat the **same bold title and trailing text** as its source line in `02-Application.md` or (for Backend items) in this file—verbatim, including punctuation and counts. Only **phase assignment and ordering** may differ.
- **Supplementary specs** - Focused references (e.g. `04-Theme-Design-Contract.md` for semantic tokens, presets, reader responsive/nav contract §9, and design-led reconciliation) extend the core trio; they do not replace `02`/`03` for feature inventory or phased backlog.
- **AI Behavior** - AI process, approval, and execution rules live in `.cursor/rules/# AI_InteractionRules.mdc`.
- **Author** - Provides direction, constraints, and priorities--not implementation details.
- **AI/Engineering** - Proposes how to build, designs flows, and recommends technical approaches.

### Document Structure
- **Heading Lock** - All ATX headings are fixed. Do not add new headings.
- **Subheading Lock** - Subheadings are *Intent*, *Principles*, and *Features*. Do not add new subheadings.
- **Formatting**
    - Headings are **bold**. Subheadings are *italic*.
    - Intent/Principles bullets start with a **bold** 1–2 word subject, then short descriptive text.
    - Under each *Features* block, organize status items into these buckets in order as plain status headings (no list bullet): `✅ Complete`, `⭕1 Planned`, `⭕2 Future`, `❓ Open`.
    - Items under each status heading are plain bullets (`-`) beginning with a **bold** 1–2 word title + " - " + short descriptive text.
    - Keep `📐` and `📘` as standalone feature bullets outside status buckets.

### Content Placement
- **Placement Discipline** - Record each subject in its owning section. Everything about Story cards belongs under Story card features, not mentioned in Tags or Navigation. Everything about tags belongs under Tag Management, not mentioned in Navigation. Centralizes subjects for clarity and prevents drift.
- **One Fact, One Home** - Each fact lives in exactly one document. `02-Application.md` describes *what exists today* and *what's planned per area*. `03-Implementation.md` describes *when to do it* (sequencing). When a planned item ships, update its status in `02-Application.md` and remove it from `03-Implementation.md`.
- **Implementation wording** - Do not paraphrase `⭕1` bullets when copying them into `03-Implementation.md`. Paste the **bold label** and the description after ` - ` exactly as in the source doc (`02-Application.md` or, for Backend planned work, `01-Vision-Architecture.md`). If the product text changes, change it in the source doc first, then mirror the update in `03-Implementation.md`.

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
✅ **Complete**
  - **Next.js 15** - App Router, all API routes secured at the edge.
  - **React 19**
  - **TypeScript**
  - **`firebase-admin`** - SDK for server-side operations.
  - **Zod** - Schema validation.
  - **Directory Structure**
    - `src/app/` Next.js App Router
      - `api/` API route handlers
      - `admin/` content management interface
      - `view/` content consumption interface
      - `layout.tsx` root layout with global providers
    - `src/components/` reusable React components
      - `common/` generic shared components
      - `view/` content-view components
      - `admin/` admin components
    - `src/lib/` core logic, types, and utilities
      - `services/` business logic
      - `types/` Zod schemas and TypeScript definitions
      - `hooks/` reusable client hooks
      - `utils/` general utilities (date formatting, tag manipulation)
  - **Data Models** - `src/lib/types/` (read directly; fully commented).
  - **Typesense** - Full-text search for cards/media with CRUD sync and Firestore fallback.
  - **Auth.js** - Firebase adapter, role-based access control, session persistence, app wrapper `AuthProvider`.
⭕1 **Planned**
  - **Code** - Comment code.
  - **Directory** - Cleanup directory.
  - **ESLint** - Address ESLint violations.
  - **Quality** - QA app.
⭕2 **Future**
  - **Performance** - Possibilities captured from engineering review.
  - **Tenant ID** - Not implemented for v1. If multi-tenancy is needed for commercial SaaS (Model C), add `tenantId` to cards, media, tags, questions, and journal_users; apply tenant filters to all queries/rules.
  - **Storage Abstraction** - Wrap storage operations in `storageService.ts` (upload/delete/getUrl) to reduce migration scope and enable cache-busting on replaced images.
  - **Testing**
  - **Error Monitoring / Observability**
  - **Caching Strategy**
  - **Sharing**
  - **Content Versioning / History**
  - **Hosting**
  - **Commercial Model** - Self-hosted, single tenant, multi-tenant:
    - **Tenant ID**
    - **Auth Upgrade**
    - **Source Adapters**
    - **Web vs. Mobile** - PWA, React Native, Capacitor; camera capture is important.
📐 **Denormalized Read** - Keep denormalized read patterns where Firestore query limits demand it.
📐 **Script-Heavy** - Keep script-heavy maintenance available while admin UX matures.
📐 **Auth in Buildout** - During build/content phase, keep using env-based login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) so work can continue without user provisioning.
📐 **Auth at Rollout** - At go-live prep, run `npm run seed:journal-users` once to create the single admin in Firestore (`journal_users`) when that collection is empty.
📐 **Post Seed** - After seed, manage access in Admin > Users (`/admin/journal-users`): create viewer accounts, set/reset passwords, enable/disable access.
📐 **One Admin** - One admin (author), all other accounts are viewers.

### **Frontend**

*Intent*
- **Consumption** - Mobile-first, responsive content consumption experience.
- **Administration** - Desktop-primary admin interface for content authoring and management.

*Principles*
- **UI Alignment** - Align UI behavior with **validated server contracts** (types/schemas); the client does not override server authority on writes. Clear **presentation and client-state** boundaries; business rules stay in services/API layer.
- **Design surfaces** - The reader (`/view`) UI is the primary **designed** surface—typography, color rhythm, spacing, and tone. Admin may stay denser for workflows but should **reuse the same design tokens** (and previews where it matters) so what the author sees while authoring matches what the family sees when reading.
- **Swappable looks** - Theme Management should move toward **named design packages** (coherent font, color, and spacing choices) selected as a whole, not only isolated slider tweaks. **Tokenization** (CSS variables in `theme.css` driven from persisted theme data) is the practical path to plug-and-play designs.

*Features*
✅ **Complete**
  - **Theme** - CSS modules for styling, global `theme.css` and `fonts.css`.
  - **Rich Text Editing** - `@tiptap/react`.
  - **Media Selection** - PhotoPicker for admin modal picker and simple upload.
  - **Galleries** - GalleryManager and Swiper.
  - **Image Optimization** - `next/image` via `JournalImage`.
  - **Drag and Drop** - `@dnd-kit/core` and `@dnd-kit/sortable`.
  - **Data Fetching** - `SWR` for client-side fetching and caching.
⭕2 **Future**
  - **Unused Dependencies** - Remove unused packages from `package.json`: `react-markdown`, `@uiw/react-md-editor`, `@minoru/react-dnd-treeview`. Evaluate `react-photo-album` and `framer-motion` before removing.

📐 **Visual direction** - The product should feel **journal / archival** and **mobile-native**, while also reading as a **clear, professional** consumer app. Those aims can conflict (for example, a handwriting display face vs neutral UI typography). Prefer resolving tension through **theme presets** and distinct **type roles** (e.g. display vs body) wired to tokens, rather than scattered one-off styles. Iteration on the Theme Management model is expected as presets mature.

### **Scripts**

*Intent*
- **Ex-App Manipulation** - Provide ex-app manipulation of data as needed.

*Principles*
- **Reuse** - Develop and organize for reuse.

*Features*
✅ **Complete**
  - **Syntax** - `npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json`.
  - **Firebase Setup** - Credentials live in `.env`.
  - **.env** - Scripts load `.env` **before** any static import of `admin.ts` (`-r dotenv/config` on the Node/tsx invocation, optionally `DOTENV_CONFIG_PATH=.env`). In-file `dotenv.config()` alone is **not** enough if the same file statically imports Firebase Admin—imports run first. See `docs/NPM-SCRIPTS.md` → **Firebase Admin CLI (dotenv)**.
  - **Maintenance Scripts** - Active scripts: `reconcile:media-cards`, `regenerate:storage-urls`, `cleanup:media`, `backup:database`, `backfill:media-metadata`, `seed:journal-users`.
⭕2 **Future**
  - **Script Cleanup** - 86 script files under `src/lib/scripts/`; many are obsolete migration/debug/test scripts not wired into `package.json`. Review and prune.
📘 **Script Index** - `docs/NPM-SCRIPTS.md`.
📘 **Import Reference** - `docs/IMPORT-REFERENCE.md`.

### **Backup**

*Intent*
- **Protection** - Back up is required for the code repo and the database.

*Principles*
- **Automated** - Backups run without manual intervention.
- **Verified** - Backup integrity is confirmed after each run.

*Features*
✅ **Complete**
  - **Database** - `npm run backup:database` writes under `ONEDRIVE_PATH/Firebase Backups/run-<timestamp>/` (all Firestore root collections, index/rules copies, optional Typesense JSONL). Storage file bytes are not included. Optional Windows task: `src/lib/scripts/setup-database-backup-task.ps1` (uses `tsx -r dotenv/config` and `firebase/backup-firestore.ts`; requires `.env` visible to the task user).
  - **Repo** - GitHub backup on every push for 7 days.
    - Commit directly to **`main`** and push to `origin/main`. Do not use feature branches or PR merge flow unless explicitly requested for a specific task.
⭕2 **Future**
  - **Operational** - Ensure both backups are operational and verified end-to-end.
