# docs/02-Application.md recovery map (2026-05-28)

## Evidence sources

- Earlier full-file snapshot:
  - `C:\Users\alanb\.codex\sessions\2026\05\28\rollout-2026-05-28T08-19-09-019e6ebd-0d58-73b3-98e8-5d71e65e208a.jsonl`
  - full-file output at line 32
- Later streamlined snapshot:
  - `C:\Users\alanb\.codex\sessions\2026\05\28\rollout-2026-05-28T10-59-19-019e6f4f-b244-7ec1-be6d-2e3ba2cff378.jsonl`
  - beginning-of-file output at line 31
  - content-page output at line 199
- Current on-disk file:
  - `C:\Users\alanb\my-journal\docs\02-Application.md`

## Recovery status by section

### Application

- Current state matches the earlier full-file snapshot, not the later streamlined snapshot.
- Lost later changes:
  - `Consumption` -> `Content Consumption`
  - `Administration` -> `Content Administration`
  - broader principle rewrite:
    - `Obvious or intuitive operation.` -> `Core reader and admin flows should feel obvious and low-friction.`
    - `Quick response in content consumption.` -> `Reader and admin surfaces should respond quickly enough to preserve trust and flow.`
    - `On-the-Fly Authoring` -> `Low-friction Editing`
    - add `Mode Clarity`
    - `Commercial quality bar` -> `Quality Bar`
  - feature compression:
    - later snapshot reduces the long hosted/admin verification list to four concise bullets:
      - `Surface Split`
      - `Hosted Reader Baseline`
      - `Role Boundary`
      - `Reader Shell Stability`
  - future/status rewrite:
    - later snapshot keeps only:
      - `Reader-to-Admin Entry Points`
      - `Accessibility Hardening`
      - `Print / Export to Book`
  - decision block rewrite:
    - later snapshot groups these under `📐 Decisions`
    - drops:
      - `Terminology correction`
      - `Creation/consumption parity (canonical)`
      - `Reader/admin quality bar`
    - keeps slimmer forms of:
      - architecture split
      - future editing path
      - mobile v1 scope
      - product shape
      - phone-origin authoring

### Navigation

- Current state matches the earlier full-file snapshot, not the later streamlined snapshot.
- Lost later changes:
  - intent rewrite:
    - `Intuitive` / `Customizable`
    - became `Discovery` / `Control Surface`
  - principle rewrite:
    - `Mobile-First, Desktop-Second`
    - `Seamless Flow`
    - `Single Control Surface`
    - became:
      - `Continuity`
      - `Single Filter Surface`
      - `Platform Clarity`
      - `Responsive Contract`

### Home Page

- Current state is older and the later cleanup was lost.
- Earlier/current state:
  - `Interesting Intro`
  - `Simple login page with app title and a few graphics.`
  - `❓ Open`
  - `Left Upper Image`
- Later streamlined snapshot removes `Left Upper Image` entirely and rewrites the section to:
  - intent:
    - `Entry Point`
    - `Brand Framing`
  - principles:
    - `Simple`
    - `Lightweight`
  - features:
    - `Login Page`
    - `Home Layout`
  - no `❓ Open`

### Top Navigation

- Current state matches the earlier full-file snapshot, not the later streamlined snapshot.
- Lost later changes:
  - intent rewrite:
    - `App Badge`
    - `Settings`
    - `Back Button`
    - became:
      - `Orientation`
      - `Global Controls`
  - principle rewrite:
    - `Simple`
    - `Minimal`
    - became:
      - `Compact`
      - `Clear Actions`
- Current feature and planned bullet set appears otherwise preserved.

### Left Navigation

- Current state appears preserved.
- Confirmed surviving edits:
  - `Include sub-tags behavior`
  - `Reader Order Model`
- No later conflicting rewrite found yet in the inspected logs.

### Content / Content Page

- Current state appears mostly preserved for the substantive morning work.
- Confirmed surviving edits:
  - `Guided discovery policy`
  - `Guided feed behavior`
  - `Reader detail context row`
  - `Guided selection response`
  - `Layout @media hardening`
- Still needs a wider log pass to confirm whether the top `Content` intent/principles were later rewritten beyond the current state.

### Administration

- Current state does not match the later streamlined snapshot.
- Confirmed later streamlined version in logs rewrites the section top to:
  - intent:
    - `Archive Administration`
    - `Desktop-primary Workflow`
  - principles:
    - `Integrity-owned Mutations`
    - `Studio-first Workflow`
    - `Interaction Economy`
    - `Single-author First`
    - `No Operator Traps`
  - concise top `✅ Complete` bullets:
    - `Admin Navigation`
    - `Active Domains`
    - `Studio-first Administration`
    - `Legacy Route Demotion`
    - `Shared Feedback Model`
    - `Compact Studio Shell`
    - `Operator Tooling`
    - `Integrity Gate`
    - `Studio Inline Tags (v1)`
- Current file still contains the heavier older top cluster plus the long shell-history bullets.
- Conclusion:
  - the Administration streamlining was real
  - it is not fully present in the current file

### Specialist admin sections below Administration

- Current file appears to preserve many of the later specialist-section additions.
- Confirmed surviving later additions in current file include:
  - `Shared action button contract (2026-05-24)`
  - `Compact tag editor contract (2026-05-22)`
  - `Questions tree scope toggle (2026-05-24)`
  - `User surface polish`
  - `Theme workspace chrome simplification`
- So the main later-file regression is not "all downstream admin work disappeared."
- The more precise pattern is:
  - section-top streamlining was lost in some places
  - many later detailed feature bullets in the owning subsections survived

## Working conclusion

- The beginning of the file was streamlined further after the earlier full-file snapshot.
- Those later rewrites did not survive in:
  - `Application`
  - `Navigation`
  - `Home Page`
  - `Top Navigation`
- The more substantive reader behavior edits in:
  - `Left Navigation`
  - `Content Page`
  appear to have survived.
- The major confirmed regressions so far are:
  - `Application`
  - `Navigation`
  - `Home Page`
  - `Top Navigation`
  - `Administration` section top rewrite
