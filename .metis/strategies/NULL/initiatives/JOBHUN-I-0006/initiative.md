---
id: expanded-job-board-coverage-and
level: initiative
title: "Expanded job-board coverage and resume-aware suggestion"
short_code: "JOBHUN-I-0006"
created_at: 2026-07-31T02:34:31.467789+00:00
updated_at: 2026-07-31T02:44:53.951959+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0003]
archived: false

tags:
  - "#initiative"
  - "#phase/completed"


exit_criteria_met: false
estimated_complexity: M
strategy_id: NULL
initiative_id: expanded-job-board-coverage-and
---

# Expanded job-board coverage and resume-aware suggestion Initiative

## Context **[REQUIRED]**

The initial subsystem shipped with LinkedIn, Indeed, Glassdoor, and a generic fallback.
The user wants far broader coverage: general boards (ZipRecruiter, Google Jobs, Monster,
CareerBuilder, Wellfound) and design/creative boards well-suited to an Art Director
(Dribbble, Behance, AIGA, Coroflot, Working Not Working, Authentic Jobs) plus
remote-leaning boards (We Work Remotely, Remote OK). Crucially, design-specific boards
should only be *suggested* once the resume has been added and the resume/job-focus shows
design relevance — otherwise they are noise. Several boards have access quirks
(curated/invite-style membership, third-party-ID login, aggregator behavior) that must be
handled rather than silently failing.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Add a **board registry** as the single source of truth for every supported board:
  id, category (general / design / remote), search-URL template, login URL, and access
  notes (aggregator, curated/invite, third-party login, remote-only).
- Extend the data contract (`source`/`sites` enums + docs) to cover the new boards.
- Make `find-jobs` registry-driven: suggest general boards by default, remote boards when
  the remote preference includes remote, and design boards ONLY when the resume/job-focus
  indicates design/creative relevance; route each board to a dedicated adapter if one
  exists, else to `search-generic-site` seeded with the registry URL template; surface
  access quirks (e.g. invite-only) instead of failing silently.
- Update `job-hunter-setup` site selection and the browser preflight to cover the new
  boards, apply the design-gating rule, and use each board's login URL.

**Non-Goals:**
- No dedicated browser adapter per new board — the generic adapter + registry template
  covers them. Upgrading a high-traffic board to a dedicated adapter is future work.
- No new apply logic — `apply-to-jobs` already works from `jobs.json` regardless of source.
- No auto-creating accounts or bypassing invite/membership gates.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements

- **Functional Requirements:**
  - REQ-001: `source` and `config.sites` enums MUST include every registry board id;
    `generic` remains the catch-all.
  - REQ-002: The registry MUST record, per board, category, search-URL template, login
    URL (or "none"), and access notes.
  - REQ-003: `find-jobs` MUST NOT suggest design boards unless resume/job-focus signals
    design relevance; MUST offer remote boards only when remote preference includes remote.
  - REQ-004: `find-jobs` MUST route to a dedicated `search-<board>` adapter when present,
    else to `search-generic-site` with the registry URL template.
  - REQ-005: Access quirks (invite/curated, third-party login, aggregator) MUST be
    surfaced to the user; boards that cannot be reached are reported/skipped, never
    silently dropped.
  - REQ-006: Setup site selection + browser preflight MUST cover the new boards, apply
    design-gating, and use per-board login URLs.
- **Non-Functional Requirements:**
  - NFR-001: Adding a future board should require only a registry entry (+ enum id), not
    changes across many skills.
  - NFR-002: All changes keep `npm run check` green (schemas + fixtures still valid).

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Art Director runs a search

- **Actor:** the job seeker (Art Director).
- **Scenario:** resume added and job-focus shows design/creative → `find-jobs` suggests
  general boards AND design boards (Dribbble, Behance, AIGA, …) → dispatches each via its
  adapter or the generic adapter with the registry template → results deduped into the list.
- **Expected Outcome:** design-relevant coverage without the user wiring up each board.

### Use Case 2: Non-design user runs a search

- **Actor:** a software engineer.
- **Scenario:** job-focus shows engineering → `find-jobs` suggests general/remote boards
  only; design boards are not offered.
- **Expected Outcome:** no design-board noise.

### Use Case 3: Invite-only board

- **Actor:** any user.
- **Scenario:** a board like Working Not Working requires curated membership → the registry
  flags it; `find-jobs`/preflight inform the user and let them skip or proceed if they have
  access.
- **Expected Outcome:** the quirk is handled explicitly, not a silent failure.

## Detailed Design **[REQUIRED]**

Add `references/job-boards.md` (the registry). Extend `jobs.schema.json.source` and
`config.schema.json.sites` enums with all board ids. Update `references/data-contract.md`
and `references/adapter-contract.md` source lists and document the "dedicated-adapter-else-
generic-with-template" routing and the design-gating rule. `find-jobs` reads the registry
to build its site suggestions (category + remote + design-gating), then dispatches
accordingly. Setup's site-selection and preflight steps read the registry too. Board
categories: general (ziprecruiter, google-jobs, monster, careerbuilder, wellfound),
design (dribbble, behance, aiga, coroflot, working-not-working, authentic-jobs), remote
(we-work-remotely, remoteok); plus existing linkedin/indeed/glassdoor (general) and
generic (catch-all). Design relevance is inferred from the resume analysis / job-focus.

## Alternatives Considered **[REQUIRED]**

- **A dedicated adapter per new board.** Rejected — 13 brittle browser adapters to build
  and maintain; the generic adapter + a URL template per board achieves the same with far
  less surface area. Dedicated adapters remain an option for the highest-traffic boards.
- **Free-form `source` string instead of an enum.** Rejected — the enum gives schema
  validation and a closed, documented set; the registry keeps the list maintainable.
- **Always show all boards.** Rejected — the user explicitly wants design boards gated on
  design relevance to avoid noise.

## Implementation Plan **[REQUIRED]**

1. Foundation: extend schema enums; update data-contract + adapter-contract; author the
   board registry with categories, URL templates, login URLs, and access notes.
2. Update `find-jobs` to be registry-driven (suggestion rules incl. design-gating and
   remote; adapter-else-generic routing; access-quirk surfacing).
3. Update `job-hunter-setup` site selection + browser preflight for the new boards,
   design-gating, and per-board login URLs.

Depends on JOBHUN-I-0003 (search subsystem). Foundation is opus + high; the two updates
are opus + medium and can run in parallel after the foundation lands.