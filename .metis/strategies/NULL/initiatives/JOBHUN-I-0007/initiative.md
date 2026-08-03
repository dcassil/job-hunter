---
id: custom-non-easy-apply-application
level: initiative
title: "Custom / non-Easy-Apply application handling with human handoff"
short_code: "JOBHUN-I-0007"
created_at: 2026-08-01T17:37:16+00:00
updated_at: 2026-08-01T22:02:38.343811+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0004]
archived: false

tags:
  - "#initiative"
  - "#phase/completed"


exit_criteria_met: false
estimated_complexity: L
strategy_id: NULL
initiative_id: custom-non-easy-apply-application
---

# Custom / non-Easy-Apply application handling with human handoff Initiative

## Context **[REQUIRED]**

`apply-to-jobs` today only completes **LinkedIn Easy Apply** postings. Every external /
ATS-hosted application (Greenhouse, Lever, Workday, Ashby, iCIMS, SmartRecruiters, company
career sites, and boards that require an account) is currently **deferred or skipped** —
in the 2026-07-31 run, 8 external postings and several account-gated ones were logged as
un-actionable. The user wants the plugin to actually *drive* those custom applications:
navigate any application site, fill everything it can from the profile, and only stop at
the steps that genuinely require a human.

This work is bounded by a **hard safety constraint** confirmed with the user: the agent
MUST NOT create accounts, enter passwords to authenticate, read the user's email to
retrieve confirmation/OTP codes, or solve CAPTCHAs. These are prohibited actions and no
skill may instruct an agent to perform them. Instead, the custom-application flow performs
everything it *can* and **hands those specific steps to the human**, then resumes. This
"human owns the prohibited + consequential steps" rule is the same principle the existing
apply subsystem uses, extended to arbitrary application sites.

Two usage modes are needed: an **unattended batch** path (fill what's possible, log a
"needs you" handoff, keep going) and an **interactive** path where the user says "let's go
through the ones you couldn't complete together" and the plugin walks them job-by-job.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Add a shared **`references/custom-application.md`** procedure: ATS detection, human-speed
  browser control (real clicks/typing with deliberate pacing — never fetch/DOM-injection
  submits, to avoid anti-bot guards), field mapping via the existing `question-log`
  lookup, rotation-resume upload, **human-only-step detection** (account creation, password
  entry, email/OTP confirmation, CAPTCHA, payment), draft-saving, and a structured
  **handoff record** shape.
- Extend the **data model** so a job can represent "filled up to X, needs a human for Y":
  new statuses `needs_human` and `account_required`, and an optional `handoff` object.
- Extend **`apply-to-jobs`** with a **custom route**: for an external/ATS job, run the
  custom-application procedure, fill what it can, and on any human-only step *or* unknown
  question, save a draft if the ATS supports it, write a `handoff` record, and **keep
  going**; account-gated-before-viewing → `account_required` and skip. End-of-run summary
  includes the consolidated **handoff queue**.
- Add a new user-facing **`interactive-apply`** skill: build the queue of jobs needing
  human help (`needs_human` / `account_required` / deferred / external / saved drafts),
  present the list, then go **one at a time** — show job + company info, ask "apply to this
  one?", and on yes open the application, fill everything possible, and **pause and ask the
  user** to complete each human-only part before resuming; record on submit.
- Keep `record-application` the **sole writer** of job status/handoff state.

**Non-Goals:**
- **No account creation, password entry, email reading, or CAPTCHA solving** — ever, in any
  skill. These are always handed to the human.
- No new job-*search* logic (find-jobs/adapters are unchanged).
- No per-ATS bespoke automation engine — a general human-speed form-fill procedure plus
  ATS-detection hints covers the long tail; deep per-ATS optimization is future work.
- No headless/API form submission — human-speed UI interaction only.

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements

- **Functional Requirements:**
  - REQ-001: A shared `references/custom-application.md` MUST define ATS detection,
    human-speed control, field mapping, resume upload, human-only-step detection,
    draft-save, and the `handoff` record shape; both `apply-to-jobs` (batch) and
    `interactive-apply` reference it rather than duplicating it.
  - REQ-002: `schemas/jobs.schema.json` MUST add statuses `needs_human` and
    `account_required`, and an optional `handoff` object (fields: `ats`,
    `application_url`, `blocking`, `needs` array, `draft_saved`, `filled_through`,
    `logged_at`) with `additionalProperties` set to false. `data-contract.md` MUST
    document them.
  - REQ-003: In batch mode, a human-only step (account / password / email-confirm /
    CAPTCHA) or an unknown question MUST NOT stall the run: save a draft if possible, write
    a `handoff` record, and continue to the next job.
  - REQ-004: A site that requires an account **before** the form is viewable MUST be logged
    `account_required` (with URL) and skipped — never auto-signed-up.
  - REQ-005: `interactive-apply` MUST present, per job, company + role details and the
    blocking reason, ask the user whether to apply, and only then open and co-fill the
    application, pausing for every human-only part.
  - REQ-006: No skill may create accounts, enter passwords, read email, or solve CAPTCHAs;
    each MUST hand these to the human. This MUST be stated as an invariant in every skill
    that touches an application form.
  - REQ-007: `record-application` remains the only writer of `status`, `handoff`,
    `resume_used`, `cover_used`, and `applied_at`.
- **Non-Functional Requirements:**
  - NFR-001: All browser interaction is human-speed real UI (clicks/typing) with pacing;
    fetch/XHR/DOM-injection form submission is forbidden (anti-bot-guard).
  - NFR-002: `npm run check` (schemas + skill validation + fixtures + lint + format) stays
    green.
  - NFR-003: Adding a future ATS should require only a detection hint in
    `custom-application.md`, not changes across multiple skills.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Unattended batch hits an external app
- **Actor:** the job seeker (unattended).
- **Scenario:** `apply-to-jobs` reaches a Greenhouse posting. It fills contact, work-auth,
  years-of-X, uploads the rotation resume, then reaches a "create an account to submit"
  step. It saves the draft, records a `handoff` (`needs:[account]`, the URL, filled_through
  = "all fields except final account+submit"), and moves to the next job.
- **Expected Outcome:** no stall; the job is queued for the interactive pass with a clear
  blocking reason.

### Use Case 2: Account required before viewing
- **Actor:** any user.
- **Scenario:** a board/site demands signup before the application form is even visible.
- **Expected Outcome:** job logged `account_required` with URL; skipped; surfaced in the
  end-of-run report and the interactive queue.

### Use Case 3: "Let's go through them together"
- **Actor:** the job seeker (present, interactive).
- **Scenario:** user runs `interactive-apply`. The skill lists the handoff queue, then for
  each job shows role + company details and what's blocking, asks "apply to this one?" On
  yes it opens the application, fills everything it can at human speed, and pauses to ask
  the user to create the account / enter the password / paste the email code / answer an
  unknown question, resuming after each, then submits and records.
- **Expected Outcome:** the user clears their backlog collaboratively, doing only the parts
  that must be human.

## Detailed Design **[REQUIRED]**

**Shared reference (`references/custom-application.md`).** The heart of the feature. Sections:
(1) ATS detection — recognize Greenhouse/Lever/Workday/Ashby/iCIMS/SmartRecruiters/generic
from URL/DOM markers; (2) Human-speed control — use the claude-in-chrome `computer`
tool for real clicks/typing with deliberate inter-action pacing; the React-input native-
setter trick is allowed only for reliable *value entry*, never for submitting; explicitly
forbid fetch/XHR submit; (3) Field mapping — resolve each field via the `question-log`
lookup order (demographics/contact → logged answers); upload the rotation resume; skip
cover letters unless a plain-text field wants the default prose cover; (4) Human-only-step
detection — signup/login, password fields, email-verification/OTP prompts, CAPTCHA,
payment → STOP and produce a handoff; (5) Draft-save — detect and use the ATS "save"
affordance; else capture entered answers as resume instructions; (6) Handoff record shape.

**Data model.** `jobs.schema.json`: add `needs_human`, `account_required` to the `status`
enum; add optional `handoff` object with fields ats, application_url, blocking, needs
(array), draft_saved, filled_through, and logged_at. `data-contract.md` documents both.
`record-application` learns to write these.

**Batch route (`apply-to-jobs`).** Branch on application type: Easy Apply → existing flow;
external/ATS → run `custom-application`. On a human-only step or unknown question, save
draft + write handoff via `record-application` and continue. Account-gated-before-view →
`account_required`. Run summary lists the handoff queue.

**Interactive skill (`interactive-apply`).** Reads the handoff queue from `jobs.json`
(statuses `needs_human`/`account_required` + deferred/external + drafts). Presents the list;
per job shows details + blocking reason; asks to proceed; opens + co-fills; pauses for
human-only parts; records on submit. Shares `custom-application.md` with the batch route.

**Wiring.** `job-hunter-setup` mentions the capability; `browser-preflight.md` gains the
human-speed + handoff note; README/AGENTS updated; plugin/package version bumped;
`npm run check` green; skills validate/register.

## Alternatives Considered **[REQUIRED]**

- **Autonomously create accounts / read email for OTP (what the user first asked).**
  Rejected — prohibited actions; no skill may do this. The hand-off design delivers the
  same end goal (applications completed) while keeping the human on the irreversible/
  credentialed steps. This is a hard constraint, not a preference.
- **A dedicated per-ATS automation engine.** Rejected (for now) — high build/maintenance
  cost across many ATSes; a general human-speed form-fill procedure plus lightweight
  ATS-detection hints covers the long tail. Per-ATS optimization can be added later behind
  the same reference.
- **Headless/API submission for speed.** Rejected — trips anti-bot guards and violates the
  human-speed requirement the user set; also removes the human from consequential steps.
- **Overload existing `status` values instead of adding a `handoff` object.** Rejected —
  a structured `handoff` object cleanly captures ats/url/blocking/needs/draft without
  conflating pipeline status; `needs_human`/`account_required` give at-a-glance filtering.

## Implementation Plan **[REQUIRED]**

1. **Foundation (JOBHUN-T-0018, opus + high):** extend `jobs.schema.json` statuses +
   `handoff` object; update `data-contract.md`; author `references/custom-application.md`.
   Load-bearing substrate for everything else.
2. **Writer support (JOBHUN-T-0019, opus + medium):** teach `record-application` to write
   the new statuses + `handoff`; confirm `question-log` reuse covers custom forms.
3. **Batch route (JOBHUN-T-0020, opus + medium):** add the custom/external route to
   `apply-to-jobs` with save-draft + handoff + keep-going and `account_required` handling.
4. **Interactive skill (JOBHUN-T-0021, opus + high):** author the new `interactive-apply`
   user-facing skill (queue → per-job details → ask → co-fill → pause/handoff → record).
5. **Wiring, docs, validation (JOBHUN-T-0022, sonnet + medium):** setup mention,
   browser-preflight note, README/AGENTS, version bump, `npm run check` green, skill
   registration.

Depends on JOBHUN-I-0004 (application subsystem). T-0018 (foundation) blocks T-0019/0020/
0021; T-0022 lands after 0020 and 0021.