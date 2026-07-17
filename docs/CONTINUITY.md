# CURRENT CONTINUITY

This file is a concise operational handoff for the next project session. It is not product canon and must not override `01`, `02`, or `03`. Replace its contents at the next deliberate session handoff rather than accumulating history.

## Canon checkpoint

- `01` remains the owner of vision, architecture, technical principles, and stable invariants. No architectural correction was required at this handoff.
- `02` records completed tag identity, Gallery inheritance, messaging, contextual Reader editing, Studio Cards foundations, media identity evidence, and Exact matches review behavior.
- `03` records verified implementation state and remaining work. No capability is currently Active. The next required Definition Gate is Studio Media same-asset reconciliation after author review of the unresolved exact pair.

## Delivered and verified

- The tag and identity system supports stable human and non-human identities, aliases, relationships, groups, archive perspective, focused dimensional assignment, multiple subjects, and author-controlled migrations.
- Gallery-to-card inheritance is complete: existing cards remain protected by per-dimension overrides; configured new-card defaults govern new cards; Unreviewed takes precedence; N/A and Unknown remain intentional assignments; subject presentation follows the agreed single, Multiple, and Subjects+ rules.
- Cross-application feedback uses localized progress, non-reflowing floating messages, shared confirmations, explicit Compose Saving/Saved/Retry state, and user-centered wording.
- Viewing users are read-only. Administrators can perform practical contextual card and visible-media editing from Reader on desktop and mobile, with Studio retaining archive-wide and bulk work.
- Studio Cards and Media share search/filter/tag-assignment and compact density foundations where their jobs overlap.
- Media source-byte identity evidence exists for 3,064 of 3,503 Media records; 3,062 have uncontested identity-registry entries. The paired backup used for the evidence work is `run-2026-07-17T18-25-44-195Z` with 5,875 Firestore documents and 10,639 Storage objects.
- Studio Media now contains an author-only Exact matches queue with Unresolved, Reviewed, and All views. It can record Same asset, Keep both, or Defer. Recording a review does not merge, delete, register identities, or move references.

## Unresolved exact pair

- `HcdSOUeqx3YY3LeedXVa` — `chair-havertys.webp`
- `wpQVDYRH3ExuPrcX1GET` — `sofa1-harvertys.webp`
- The records have identical original bytes but different plausible names for the same composite image. They have no tags, captions, or card references. They remain deliberately unregistered and unresolved.
- The author must review the pair in Studio Media -> Exact matches. Do not infer Same asset or Keep both from byte identity alone.

## Next required sequence

1. Confirm repository status and preserve the unrelated `src/lib/services/questionService.ts` modification and local development logs.
2. Have the author record Same asset, Keep both, or Defer for the unresolved pair through the delivered review queue.
3. If Same asset is selected, prepare the Studio Media same-asset reconciliation Definition Gate. It must specify canonical-record retention, field-level conflict handling, reference movement, identity registration, rollback, and verification before any data mutation.
4. Do not implement reconciliation, delete either record, move references, or register the pair until that gate is approved.
5. If Keep both is selected, verify the decision persists and remove this pair from the reconciliation path. If Defer is selected, leave it unresolved.

## Verification checkpoint

- Exact-match service validation requires two existing Media records with identical SHA-256 source-byte evidence before accepting a decision.
- Admin-route access tests, focused unit tests, the Firestore emulator keep-both integrity test, lint on touched files, production build, and live browser verification passed.
- Browser verification confirmed the three queue views, empty Reviewed state, safe detail opening, canonical selection enabling Same asset, and return to normal Browse mode. No review decision was submitted during verification.

## Workspace hygiene

- The implementation checkpoint before this handoff is commit `a75164fc` (`feat: add exact media match review queue`).
- `src/lib/services/questionService.ts` was already modified outside the Exact matches slice and must not be staged, reverted, or absorbed without separate inspection and approval.
- `.codex-dev-3003.err.log`, `.codex-dev-3003.out.log`, and `firestore-debug.log` are local untracked diagnostic files and must not be committed.
- Development browser state and port occupancy are transient. Verify them rather than relying on this handoff.
