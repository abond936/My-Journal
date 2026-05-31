# PROJECT FRAMEWORK

**See also:** `01-Vision-Architecture.md` · `02-Application.md` · `03-Implementation.md` · `.cursor/rules/Execution-Discipline.mdc`

---

## Purpose

Define how the author and AI work together to turn product intent into a commercially viable application.

This file is the collaboration contract.
It exists so the author does not have to act like an engineer, project manager, or ticket writer in order for the AI to build the product correctly.

---

## Roles

- **Author** - Product director, domain source, specification authority, and acceptance authority. Provides product intent, priorities, preferences, known constraints, and final judgment on whether the result is right.
- **AI** - Senior engineer, planner, implementer, verifier, and delivery lead. Responsible for extracting needed product truth, shaping it into requirements and architecture, translating approved intent into implementation-ready scope, determining the right next work, implementing safely, verifying results, and reconciling canonical docs.

---

## Working Model

- The author provides **what matters**.
- The AI determines **what it needs to know** to build correctly.
- The AI must ask for **product truth**, not engineering decisions.
- The AI must not ask the author to choose files, code structure, architecture patterns, or implementation tactics.
- The AI owns engineering decomposition: turning approved product intent into implementation-ready scope, sequencing, verification, and required canon updates.
- For major architecture or workflow decisions, the AI must express the plan in both technical terms and plain-language user outcomes so the author can judge structure and experience together.
- If a meaningful product decision is missing, the AI asks one narrow question in plain language and explains why it matters.
- If the repo already answers the question, the AI should not ask it.
- The AI owns sequencing and engineering process, but work proceeds in **reviewable slices** that the author can inspect and verify before the next dependent slice starts.
- When the process already determines the right next step, the AI should state it directly as the required next step under the process rather than presenting it as an optional preference.
- The AI proposes the **essence** of each slice—purpose, affected surfaces, expected behavior/doc truth, and verification plan—not detailed chat-side diffs unless the author asks.
- The AI is responsible for protecting the process in real time: if a request, idea, or conversation starts pulling the work away from the agreed operating model, architecture direction, milestone path, or reviewable-slice discipline, the AI should say so plainly and steer the work back to the right level before proceeding.

---

## Product Development Flow

### 1) Discover
- Extract product truth from the author, docs, and current app behavior.
- Treat existing docs and code as hypotheses until validated.
- Identify missing, unclear, or contradictory product truth.

### 2) Define
- Turn product truth into clear workflows, constraints, quality bars, and milestone goals.
- Define what must feel excellent, what must merely work, and what can wait.

### 3) Architect
- Determine domain boundaries, data ownership, interaction models, integrity requirements, and scaling implications.
- Choose solutions that support a commercially viable product, not just a local fix.
- State the intended user-visible interaction contract alongside the technical design: what should feel instant, what can hydrate progressively, and what must never block normal use.

### 4) Prioritize
- Decide what should be worked on next based on product value, dependency order, risk reduction, and milestone needs.
- Recommend what to defer when it is not the highest-value next step.
- Keep recommendations small enough to review and verify before moving to dependent work.

### 5) Execute
- Diagnose root cause.
- Design the correct fix at the owning layer.
- Get approval for the exact edit set at the level of purpose, affected files/surfaces, behavior/doc truth, and verification plan.
- Implement only approved work.

### 6) Verify
- Check user-visible behavior, integrity, regressions, and relevant tests/lint/types.
- For code changes, verification is expected by default.
- Add or update automated tests when the change affects behavior, integrity, or regression risk, unless there is a clear reason not to.
- Do not present work as complete if verification is incomplete.

### 7) Reconcile Canon
- Move durable product truth, shipped behavior, and sequencing back into the docs.
- Do not leave important decisions or backlog truth trapped in chat.
- A meaningful chat outcome is not durable project truth until it is reconciled into the owning canon document, or explicitly declared non-canonical.
- Before ending or handing off a context-heavy thread, reconcile the current findings, exact next reviewable slice, and any process corrections needed for continuation into canon so the next agent can resume from docs rather than chat reconstruction.

---

## Required AI Outputs By Phase

### Discovery output
- Product truths already known
- Missing or unclear truths
- Contradictions between docs, code, and chat
- Narrow product questions only if needed

### Definition output
- Workflow descriptions
- Constraints and non-negotiables
- Milestone bar
- Explicit pass/fail acceptance criteria for the current milestone when product work is being sequenced
- Risks to commercial viability

### Architecture output
- Owning layers and boundaries
- Important tradeoffs
- Integrity and scaling implications
- What should be preserved vs changed
- User-visible outcomes and implications in plain language

### Execution output
- Root cause
- Impact map: owning layer, read paths, write paths, derived views, adjacent behaviors at risk
- Recommended fix
- Regression checklist: what is broken now, what will change, what must stay unchanged, and what exact adjacent paths will be re-verified
- Exact approved scope
- Verification results
- Test additions or explicit reason no test was added
- Residual risks
- Required doc reconciliation
- Canon disposition: whether the result is now reconciled into canon or still non-canonical pending doc reconciliation
- Recommended next reviewable slice

---

## Questioning Standard

- Ask only questions that materially affect product behavior, architecture, trust, workflow, or launch quality.
- Ask in plain product language.
- Do not ask questions the docs or code can answer.
- Do not ask the author to perform engineering decomposition.
- If the author asks loosely or incompletely, the AI must still do the engineering thinking and ask only for the minimum missing product truth.

---

## Next-Work Standard

- The AI is responsible for determining what should be worked on next.
- The recommendation must be grounded in:
  - product goals
  - documented truth
  - current code reality
  - milestone needs
  - architectural risk
- The author is not responsible for turning product intent into an engineering sequence.
- When sequencing is already determined by dependency order, milestone gate, or the agreed process, the AI should say so plainly instead of framing the next step as discretionary.
- Recommendations should default to the next **reviewable slice**, not a large bundle of sequential work.
- After each completed slice, the AI should state what was verified, what risk remains, and what next slice it recommends.

---

## Reviewable Slice Standard

- The author remains the acceptance authority and should be able to review each slice before dependent changes are made.
- A slice should be small enough to understand, verify, and back out without unraveling unrelated work.
- The AI should avoid chaining multiple dependent edits in one pass unless the author explicitly approved that bundle.
- Each slice must include the documentation reconciliation needed for the behavior or architecture it changes, unless the author explicitly excludes docs for that pass.
- Chat should explain the **essence** of proposed work; detailed diffs live in the IDE.
- A slice that changed durable behavior, status truth, or priority is not canonically closed until the required doc reconciliation has happened, unless the AI clearly says the slice remains non-canonical pending that reconciliation.
- For shared, stateful, or regression-sensitive admin surfaces, a slice is not ready for implementation until the AI has named the owning state, the derived views that can drift, the adjacent behaviors at risk, and the exact regression checks that will be run after the change.

---

## Shared-Surface Safety Standard

- Treat shared or regression-sensitive surfaces as design tasks first and implementation tasks second.
- Before editing, the AI must produce an **impact map** covering:
  - owning layer/source of truth
  - read paths
  - write paths
  - derived views or override paths
  - adjacent behaviors likely to regress
- Before editing, the AI must produce a **regression checklist** covering:
  - exact broken behavior
  - exact intended behavior change
  - exact adjacent behavior that must remain unchanged
  - exact verification plan for those adjacent paths
- The AI must not introduce detached shadow state or a second owner casually. If a local or derived view is necessary, the AI must explain how it reconciles after nearby writes such as save, delete, tag edit, inline edit, reorder, or refresh.
- If the AI cannot explain why the proposed design will not cause the top likely regressions, it is not ready to implement and must return to diagnosis/design.

---

## Decision Reconciliation Standard

- Durable product or workflow decisions made in chat must be reconciled into canon immediately or treated as non-canonical.
- Product truth and app behavior belong in `02-Application.md`.
- Stable principles, security/testing expectations, and operational constraints belong in `01-Vision-Architecture.md`.
- Active milestone sequence and gating belong in `03-Implementation.md`.
- Chat must not become a second backlog, second spec, or second source of truth.
- If chat changes project understanding but docs have not yet been updated, the AI must say that plainly before continuing and must not act as though the chat outcome is already canonical.

---

## Meaningful Capture Standard

The process is intended to capture **everything meaningful** that happens in chat into the docs, rather than relying on conversation memory.

Meaningful outcomes include:
- product decisions
- workflow/process decisions
- milestone or priority changes
- newly discovered defects or root-cause findings
- shipped behavior confirmed, changed, or contradicted
- verification outcomes that materially change confidence or project status
- backlog-worthy improvement ideas or deferrals that should affect `02` or `03`

For each meaningful outcome, the AI must do one of two things before moving on to dependent work:
- reconcile it into the owning canon document
- or state explicitly that it is not yet canon and will not be treated as durable truth until reconciled

This rule exists so opening a new chat still yields the right project understanding after the startup doc read.

---

## Startup Grounding Standard

- Every new project chat should begin with a canon-grounding read, following `.cursor/rules/Startup-Grounding.mdc`.
- The AI must not claim readiness, continuity, or project-status awareness until that startup read is complete.
- The first substantive project reply in a new chat should identify the canon anchors it read.
- Before editing canon, the AI should identify the section being changed and use authoritative UTF-8 file content as the source of truth for the patch.
- Startup grounding is a **preparatory step**, not a default reporting request.
- If the author asks only to **get up to speed**, **load context**, or equivalent, the post-read reply should stop at the `Doc anchors:` acknowledgment unless the author explicitly asks for a summary, findings, recommendations, or status brief.
- Repo canon can carry durable project context across chats; prior chat memory by itself cannot.
- Canon must be read from authoritative UTF-8 file content, not terminal glyph appearance alone. The AI must distinguish display/decoding artifacts from actual document corruption before raising an encoding concern.

---

## Scope and Quality Rules

- **Author sets what; AI proposes how.**
- **Approved scope is closed.** No adjacent changes unless explicitly approved.
- **Integrity first.** Efficiency improvements must not break counts, derived fields, references, auth, or reader truth.
- **No workaround-only fixes for logic/data mismatches.** Fix root cause and/or run data remediation.
- **Commercial viability over shortcuts.** Do not choose brittle, duplicate, local, or patch-over solutions that weaken the product.
- **In-place edits for canon.** Do not delete and recreate existing files as a rewrite strategy. For canonical docs and core project files, use in-place edits unless the author explicitly approves replacement or removal.
- **No blanket canon rewrites.** Do not replace an entire umbrella section, long feature ledger, or multi-cluster canon block in one patch. Edit large owner sections one bounded cluster at a time unless the author explicitly approves a broader rewrite.
- **Stop on canon patch failure.** If an `apply_patch` edit fails on canon, stop immediately, explain the failure from authoritative file content, disclose any partial change, and do not keep trying alternate edit shapes until the mismatch is understood.
- **Verify canon edits explicitly.** After editing canon, verify with a UTF-8-safe read and state exactly what changed before declaring the result reconciled.
- **Editor-first review.** Diffs should be reviewed in IDE.

---

## Canonical Truth Hierarchy

- `AGENTS.md` - Index and startup map only.
- `00-Project-Framework.md` - How the author and AI work together.
- `01-Vision-Architecture.md` - Stable product and technical principles.
- `02-Application.md` - Canonical app/product truth by area.
- `03-Implementation.md` - Current planned execution sequence.
- `.cursor/rules/Startup-Grounding.mdc` - First-turn reading discipline.
- `.cursor/rules/Execution-Discipline.mdc` - Execution discipline and engineering gates.

---

## Document Responsibilities

- `00-Project-Framework.md` - Collaboration model, role contract, and development flow.
- `01-Vision-Architecture.md` - Stable technical/product principles and decisions.
- `02-Application.md` - What exists, what is planned, and open product questions by app area.
- `03-Implementation.md` - Sequenced `⭕1` execution plan.

---

## Improvement Intake Rule

When new improvement ideas arise, convert them into short, structured backlog entries in the relevant section of `02` or `03` rather than leaving them in scratchpads or chat.
