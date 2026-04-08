# Strategic Direction

*Captured from project review session — April 2026*

---

## Gaps Identified After Full Document Review

### Strategic

**1. Print / Export to Book**
A family archive's most valuable output may be a physical or PDF book. No export capability exists — card collections to printable format, photo book layout, or PDF generation.
- *Status:* Post-v1 option. Worth capturing as a product goal.

**2. Reader Journey**
The document describes surfaces (feed, view page, navigation) but never describes the reader experience end-to-end. What does a family member do when they open the app?
- *Direction:* Follow curation or explore on your own. Default landing state, mode switching UX, and first-time reader experience need design attention as part of v1 polish.

**3. Content Lifecycle at Scale**
Cards go from draft → published. With mass import (1000+ cards), the publication workflow at scale needs design: bulk status changes, filtering drafts, prioritizing what to publish next.
- *Direction:* Upload all as drafts, edit as needed, publish as time allows. App should support this workflow well — bulk publish, draft filtering/sorting by date, priority, or completeness.

**4. Data Portability / Exit Strategy**
Everything lives in Firebase. Backup exists but backup ≠ portable export.
- *Direction:* Firebase is fine for now. Preparation for potential migration:
  - Keep data models clean and well-documented
  - Avoid Firebase-specific query patterns that can't translate to other databases
  - Consider a data export script (JSON/CSV) as a near-term utility
  - Storage abstraction (see Architecture section below) reduces future migration scope

### Architectural

**5. Search Architecture**
The single most impactful near-term technical issue. Performance issues already visible at low card counts.

**How search works today:** The app loads cards from Firestore (up to a limit), then filters in JavaScript on the client. Firestore has no full-text search — only exact equality or prefix matches on indexed fields. This works at 50 cards, is sluggish at 500, and will be unusable at 5000 (post mass-import).

**What an external search index does:** Tools like Typesense, Meilisearch, or Algolia maintain a separate, purpose-built search database alongside Firestore. Card data is pushed to the index on create/update/delete. Search queries go to the index (optimized for text matching, fuzzy search, faceted filtering) instead of Firestore. Results return as card IDs, which fetch full cards from Firestore.

- **Typesense** — Open source, self-hostable, free tier on cloud. Closest to "drop in and go."
- **Meilisearch** — Similar to Typesense. Very fast, good developer experience.
- **Algolia** — Commercial, most polished, expensive at scale.

**What it gives you:** Instant search-as-you-type across titles, excerpts, captions, and tags. Fuzzy matching. Faceted results (filter by type + tag + date simultaneously without loading everything). Also fixes the Left Navigation tag filtering bottleneck.

**When to do it:** Before or immediately after mass import. Difference between the app feeling fast and feeling broken at content scale.

**6. Testing**
No formal testing exists. Manual usage has been the testing approach. For an app with complex data relationships (cards ↔ media ↔ tags ↔ collections, with denormalized counts and derived fields), every change is a leap of faith.

- *Direction:* Open to formal testing. Need a plan and approach — see Implementation Considerations below.

**7. Error Monitoring / Observability**
No logging, error tracking, or observability for how the app behaves in production. Complex async flows (import, normalization, tag recalc) can fail silently and corrupt data.

- *Near-term:* Add error boundary components in React for graceful UI failure. Add structured logging to API routes (at minimum, `console.error` with context for server-side errors).
- *Future:* Sentry (free tier covers a solo app) for automatic error capture, stack traces, and alerting. Vercel Analytics for basic performance monitoring.

**8. Caching Strategy**
When the app serves an image, the URL is permanent. If you replace the underlying file (Replace feature), the URL stays the same but the image changes. The browser shows the old cached version.

More broadly, without a deliberate caching strategy: some images cache too aggressively (stale content after replace), while API responses may not cache at all (every page load re-fetches everything).

- *Near-term:* Cache-busting for replaced images (append a version hash or timestamp to the URL).
- *Future:* CDN layer for media (Cloudflare, Vercel's built-in) so images load from edge servers near the user. Cache headers on API responses.
- *Impact:* Not urgent for personal use. Becomes noticeable when family members on slower connections load 50+ images per page.

### Functional

**9. Sharing**
How does a reader share a specific card or collection externally? "Look at this story about Grandpa" is a core use case. Deep linking likely works by URL, but there's no concept of share permissions, preview cards, or external links.
- *Status:* Post-v1.

**10. Drafts / Preview at Scale**
With mass import creating hundreds of draft cards, the process of "imported 200 cards from digiKam, now what?" needs design: triage, preview, batch-publish.
- *Direction:* Same workflow as item 3. Enhance admin grid with draft-specific views, bulk publish, and completeness indicators (has cover? has tags? has content?).

**11. Content Versioning / History**
If you edit a card's text/gallery and hit Save, the previous version is gone. Firestore overwrites the document. There is no "previous version" to revert to. For a family archive where content is carefully crafted narrative with selected photos, an accidental destructive edit + save = permanent data loss.

Options (not all needed now):
- **Soft delete** — Deleted cards go to trash, recoverable for 30 days.
- **Version history** — Save previous versions as subcollection documents; show a "history" panel.
- **Pre-save snapshot** — Before every save, write the previous state to a `card_versions` collection.
- **Near-term mitigation:** Increase backup frequency during heavy editing sessions, or add a "duplicate card" action so you can copy before making risky edits.

**12. Accessibility**
Elderly family members are a known audience. Practical steps that matter most:
- **Font size** — Body text at least 16px, prefer 18px for narrative. Theme system can support this.
- **Contrast ratios** — Test light/dark modes against WCAG AA (4.5:1 for text). Use Lighthouse audit or axe browser extension.
- **Tap targets** — Buttons and links need minimum 44x44px touch area on mobile.
- **Alt text** — Wire media `caption` into `alt` attributes on `JournalImage`.
- **Keyboard navigation** — All interactive elements reachable via Tab, operable via Enter/Space.
- **Reduce motion** — Respect `prefers-reduced-motion` for animations (Swiper transitions, etc.)

Most of this is CSS and HTML attribute work, not architectural change.

---

## Commercialization

### Hosting for Family (Near-term)

Deploy to **Vercel** (natural home for Next.js). Firebase backend doesn't change. Main work:
- **Domain** — Custom domain or Vercel subdomain.
- **Environment variables** — Move from local `.env` to hosting provider's env config.
- **Auth hardening** — HTTPS-only, secure cookies, rate limiting on login.
- **Folder import blocker** — `ONEDRIVE_ROOT_FOLDER` reads from a local filesystem path. On a hosted server, that path doesn't exist. Options: (a) import locally, hosted app serves from Firebase, or (b) build browser-based upload flow replacing server-side folder read.

This stage is product validation — real family members using the app will surface things the document can't.

### Commercial Models

**Model A: Self-hosted (BYO Firebase)**
Customer downloads/clones the app, sets up their own Firebase project, deploys to Vercel.
- *Pros:* Zero hosting cost. Strong privacy story. One-time sale possible.
- *Cons:* Technical audience only. Firebase setup is non-trivial. High support burden. Hard to charge recurring.
- *Think:* Ghost self-hosted, Plausible Analytics self-hosted.

**Model B: Managed single-tenant (host instances)**
Separate deployment + Firebase project per customer.
- *Pros:* Clean data isolation. Customers don't need to be technical. You control the experience.
- *Cons:* Operational overhead scales linearly. Manual unless automated (Terraform/Pulumi). Firebase project limits.
- *Think:* Managed WordPress hosting (WP Engine model).

**Model C: Multi-tenant SaaS**
One deployment, one Firebase project, all customers share infrastructure with tenant isolation at data layer.
- *Pros:* Scales efficiently. One codebase, one deployment. Recurring subscription. Best unit economics.
- *Cons:* Significant architecture rework (tenantId on every query, storage prefixes, billing, onboarding, superadmin layer).
- *Think:* Notion, Canva, any modern SaaS.

**Recommended path:** Host for family → validate with real users → sell Model B to early adopters → invest Model C only if demand justifies it.

### Architecture Decisions to Keep Options Open

**1. Tenant ID**
Do not implement before v1. It would touch every query, security rule, and service function. Instead, document that `tenantId` would be added to cards, media, tags, questions, and journal_users if multi-tenancy is needed, so the future scope is known.

**2. Auth Upgrade**
Current Firestore-based bcrypt credentials work for personal use. Firebase Authentication (the auth product) gives Google/Apple/email login, magic links, and token-based security rules. Switching after a few family users is manageable — write a one-time migration script. Easier to do early than with 500 paying customers.

**3. Storage Abstraction**
Currently, Firebase Storage APIs are called directly in multiple places. Create a single `storageService.ts` module wrapping all storage operations (upload, delete, getUrl). Every other file calls `storageService` instead of Firebase directly. If switching to Cloudflare R2 or S3 later, change one file instead of hunting through the codebase.

**4. Import Source Adapters**
Current approach (local filesystem / hard drives) serves the immediate use case. The existing architecture (service layer that imports, processes, returns mediaId) is the right shape for adding cloud source adapters (Google Photos API, OneDrive Graph API) alongside the local drive one. Apple iCloud is the most restricted. Worth capturing as a planned direction.

---

## Web vs. Mobile

### Current State
The app is web-based (Next.js). Responsive CSS targets mobile browsers.

### Options

**PWA (Progressive Web App)** — Add manifest, service worker, meta tags. "Install" to home screen on iOS/Android. Leverages existing responsive CSS. Weeks of work.

**React Native** — Separate codebase, different component library, different navigation. With AI assistance, initial build could be 4-8 weeks. However, every future feature is built twice, every bug fixed twice, UI/UX diverges over time. Ongoing maintenance doubles.

**Capacitor** — Wraps web app in native shell for app store presence. Awkward fit with Next.js server architecture.

### Camera Capture Consideration
For a media-focused app, the "take photo → upload → complete card → publish" workflow is genuinely better as a native experience. PWA camera access works via web APIs but is less polished than native.

### Recommended Path
1. **Build PWA first** (weeks of work). See how family members use the app on phones.
2. If "capture and post from phone" becomes the dominant workflow, build a focused **companion mobile app** — not the full app, but a capture-and-upload tool that pushes to the same Firebase backend. That's a much smaller React Native project than porting the entire app.

---

## Implementation Considerations

### Testing Strategy (Item 6)
Practical approach for a solo developer:
- **Start with service-layer tests** — `cardService`, `tagService`, `imageImportService` contain the most complex business logic (denormalized updates, tag derivation, import flows). Unit tests here catch the most damaging bugs.
- **API route tests** — Verify that API endpoints return correct data and handle errors. Lightweight integration tests.
- **Manual + automated smoke tests** — For UI, continue manual testing but add a simple Playwright or Cypress test for critical paths (login, create card, import, view feed).
- **Test on save** — Wire tests into a pre-commit hook or CI so they run automatically.

### Search Implementation (Item 5)
Recommended approach:
1. Choose Typesense or Meilisearch (both open source, free self-hosted).
2. Create a `searchService.ts` that indexes card data on create/update/delete.
3. Replace client-side filtering with search index queries for title search, tag filtering, and feed rendering.
4. Firestore remains the source of truth; search index is a read-optimized replica.
5. Run a one-time backfill script to index existing cards.

### Accessibility Audit (Item 12)
1. Run Lighthouse accessibility audit on current app.
2. Fix high-impact items (contrast, font size, tap targets, alt text).
3. Test with keyboard-only navigation.
4. Test with a screen reader (VoiceOver on Mac/iOS, NVDA on Windows).
