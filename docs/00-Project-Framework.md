# PROJECT FRAMEWORK

**See also:** `01-Vision-Architecture.md` · `02-Application.md` · `03-Implementation.md` · `.cursor/rules/# AI_InteractionRules.mdc`

---

## Purpose

Use a lightweight, repeatable process to move from idea to reliable implementation without heavy ticket bureaucracy.

---

## Core Loop

### 1) Assess
- Define outcome, constraints, and affected product area.
- Ground in reality: read relevant docs and trace current code behavior.
- Identify risks early: architecture fit, UI impact, data integrity, and error-handling concerns.

### 2) Plan
- Propose at most 1-3 substantive items.
- Name exact scope (files/surfaces) and expected behavior change.
- Define completion checks (tests, lint, manual verification).
- Ask for explicit approval of the exact edit set before implementation.

### 3) Execute
- Implement only approved scope.
- Prefer smallest viable change that preserves product invariants.
- Verify behavior and run targeted checks.
- Summarize what changed, what was verified, and any residual risk.

---

## Scope and Quality Rules

- **Author sets what; AI proposes how.**
- **Approved scope is closed.** No adjacent changes unless explicitly approved.
- **Integrity first.** Efficiency improvements must not break counts, derived fields, references, auth, or reader truth.
- **No workaround-only fixes for logic/data mismatches.** Fix root cause and/or run data remediation.
- **Editor-first review.** Diffs should be reviewed in IDE.

---

## Minimal Shared Terms

- **Initiative** - Meaningful product objective.
- **Work item** - One approved execution unit (often one PR-sized change).
- **PR** - Implementation and review container (or equivalent change set).
- **DoD** - Definition of done for a work item.
- **Decision note** - Short rationale for important tradeoff choices.
- **Risk** - Known issue tracked until resolved.

---

## Document Responsibilities

- `00-Project-Framework.md` - How we work (process and operating model).
- `01-Vision-Architecture.md` - Stable technical/product principles and decisions.
- `02-Application.md` - What exists and what is planned by app area.
- `03-Implementation.md` - Sequenced `⭕1` execution plan.

---

## Improvement Intake Rule

When new improvement ideas arise, convert them into short, structured backlog entries in the relevant section (clear title + one-line description + status), rather than long prose notes.

