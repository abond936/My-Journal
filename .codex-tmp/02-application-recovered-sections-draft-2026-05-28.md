## Recovered later wording for regressed sections

This draft captures the later streamlined wording found in the 2026-05-28 session logs for the top regressed sections of `docs/02-Application.md`.

### Application

*Intent*

- **Content Consumption** - Private, read-oriented browsing of stories, images, and related content; optimized primarily for mobile, with tablet and desktop support.
- **Content Administration** - Authoring and organization of cards, media, tags, and relationships; optimized primarily for desktop, with only minor or supporting mobile edits.

*Principles*

- **Ease of Use** - Core reader and admin flows should feel obvious and low-friction.
- **Responsiveness** - Reader and admin surfaces should respond quickly enough to preserve trust and flow.
- **Bulk Authoring** - Administration should support efficient high-volume organization and editing.
- **Low-friction Editing** - Small corrective edits should be possible without forcing a full workflow transition.
- **Few Primitives** - The product centers on cards, media, tags, and relationships rather than multiplying surface types.
- **Mode Clarity** - Consumption and administration should stay distinct even when linked by quick-edit affordances.
- **Trust by Default** - Privacy, data ownership, recoverability, and author control are product behavior.
- **Quality Bar** - Reader and admin surfaces should feel deliberate, stable, and credible in real use.

*Features*
✅ **Complete**

- **Surface Split** - The application has distinct reader and admin surfaces with separate routes and explicit editing context.
- **Hosted Reader Baseline** - The hosted deployment currently supports private authenticated reader use on desktop and mobile.
- **Role Boundary** - Reader use and admin authoring stay separated by session and route boundaries; admin-only operational routes remain restricted to administrators.
- **Reader Shell Stability** - Protected reader routes keep their shell chrome and navigation context stable during client session hydration.

⭕2 **Future**

- **Reader-to-Admin Entry Points** - Add admin-only quick-edit or deep-link affordances from reader surfaces.
- **Accessibility Hardening** - Strengthen typography, contrast, tap-target, keyboard, alt-text, and reduced-motion support for the family-reader audience.
- **Print / Export to Book**

📐 **Decisions**

- **Architecture Split** - Keep content consumption and content administration as separate top-level surfaces to preserve reader performance, reduce accidental edits, and keep role boundaries clear.
- **Future Editing Path** - Keep the top-level split, but add admin-only on-the-fly editing affordances from reader surfaces as a later optimization.
- **Mobile v1 Scope** - Mobile first launch is reader-only; Studio/admin are not a mobile target in v1.
- **Product Shape** - v1 is a private hosted journal focused on turning large personal photo libraries into smoother structured story consumption for family readers.
- **Phone-origin Authoring** - Phone-origin imports may arrive pre-seeded for `When` / `Where` and sometimes `Who`; the core admin flow is to group images, assign them to a card, then flesh out the story and `What` tagging.

### Navigation

*Intent*

- **Discovery** - Help readers move through content, collections, and filters without losing context.
- **Control Surface** - Keep primary navigation and filtering reachable across mobile and desktop.

*Principles*

- **Continuity** - Navigation should preserve reading flow rather than interrupt it.
- **Single Filter Surface** - Filtering and discovery controls should live in one canonical left-side surface.
- **Platform Clarity** - Mobile and desktop may differ in presentation, but the task model should stay recognizable.
- **Responsive Contract** - Desktop vs narrow layout, breakpoints, sidebar toggle behavior, and main feed column rules are defined in `docs/04-Theme-Design-Contract.md` Section 9; implementation must match that section.

### Home Page

*Intent*

- **Entry Point** - Provide the authenticated entry into the application.
- **Brand Framing** - Introduce the journal visually without competing with login.

*Principles*

- **Simple** - Keep login obvious and low-friction.
- **Lightweight** - Preserve branding without turning the page into a dense landing experience.

*Features*
✅ **Complete**

- **Login Page** - Application opens to home page with login form and SVG logo.
- **Home Layout**  - Login splash with the current `Title-light2` / `Title-dark2` artwork, added spacing between logo and form, and no nav bar. Redirects to /view after login.

### Top Navigation

*Intent*

- **Orientation** - Keep the current app context visible without dominating the reading surface.
- **Global Controls** - Provide access to navigation, theme, account actions, and contextual return.

*Principles*

- **Compact** - Preserve vertical space for reader and admin content.
- **Clear Actions** - Back, menu, and theme controls should be immediately legible.

### Administration

*Intent*

- **Archive Administration** - Author, organize, and maintain cards, media, tags, relationships, and supporting admin settings.
- **Desktop-primary Workflow** - Optimize administration for desktop use, with mobile limited to narrow supporting actions where explicitly allowed.

*Principles*

- **Bulk & Individual** - Support both high-volume batch operations and individual edits.
- **Efficiency** - Keep admin workflows efficient under large import/edit workloads.
- **Integrity-owned Mutations** - Data-integrity and mutation rules should be enforced at the service/API layer rather than entrusted to UI behavior alone.
- **Studio-first Workflow** - Day-to-day content administration should converge on Studio as the primary shell rather than parallel legacy routes.
- **Interaction Economy** - Prefer one strong interaction model per job over parallel table/grid/modal variants when capability can be preserved.
- **Single-author First** - v1 administration is optimized for one primary author/operator rather than collaborative authoring.
- **No Operator Traps** - Routine admin actions should preserve data integrity and make destructive or irreversible actions explicit.

*Features*
✅ **Complete**

- **Admin Navigation** - The shared hamburger keeps reader destinations for all authenticated users, while admin-only entries appear only for admin sessions; viewers do not see admin navigation affordances on reader surfaces.
- **Active Domains** - Cards, Media, Tags, Questions, Users, Themes, and Collections are active administration domains, with detailed behavior owned by the subsections below.
- **Studio-first Administration** - `**/admin/studio`** is the primary day-to-day content-admin workspace for structure, cards, compose, questions, and embedded media.
- **Legacy Route Demotion** - Standalone `**/admin/collections`**, `**/admin/media-triage`**, `**/admin/card-admin`**, `**/admin/media-admin`**, and `**/admin/tag-admin`** are no longer the intended primary workflow surfaces; day-to-day administration converges on Studio plus the surviving specialist routes where still needed.
- **Shared Feedback Model** - Migrated admin surfaces use the shared dialog/loading/toast contract rather than browser-native `alert` / `confirm`.
- **Compact Studio Shell** - Studio now favors a denser, workspace-oriented shell with persisted pane sizing, preview-first handoff, and local reconciliation where integrity allows.
- **Operator Tooling** - Scripts, backup, and recovery helpers remain part of the administration lifecycle while first-class admin UX continues to mature. Canonical operational detail lives in `01-Vision-Architecture.md` and `docs/NPM-SCRIPTS.md`.
- **Integrity Gate** - Integrity-sensitive admin changes are guarded by project-level verification for card-media edges, denormalized references, and derived tag/count correctness.
- **Studio Inline Tags (v1)** - Studio Compose uses compact inline tag editing, while fuller tag-management surfaces remain available where broader editing depth is still needed.
