---
id: foundation-handoff-data-model
level: task
title: "Foundation: handoff data model + custom-application reference"
short_code: "JOBHUN-T-0018"
created_at: 2026-08-01T17:37:16+00:00
updated_at: 2026-08-01T21:54:14.586103+00:00
parent: JOBHUN-I-0007
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0007
---

# Foundation: handoff data model + custom-application reference

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0007]]

## Objective **[REQUIRED]**

Lay the load-bearing substrate every other task consumes: extend the jobs data model to
represent "filled up to X, needs a human for Y", and author the shared
`references/custom-application.md` procedure that both the batch route and
`interactive-apply` will follow. Owned by the orchestrator because it touches guarded
schema files and defines the contract downstream skills depend on.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [x] `schemas/jobs.schema.json` `status` enum adds `needs_human` and `account_required`
      (keeping existing values), and adds an optional `handoff` object (with
      `additionalProperties` set to false) whose fields are: `ats` (string or null),
      `application_url` (string), `blocking` (string), `needs` (array of enum values
      `account`/`password`/`email-confirm`/`captcha`/`question`/`payment`), `draft_saved`
      (boolean), `filled_through` (string or null), and `logged_at` (string).
- [x] `references/data-contract.md` documents the two new statuses and the `handoff`
      object (fields, meanings, who writes it).
- [x] `references/custom-application.md` created with these sections, each concrete and
      actionable: (1) ATS detection (Greenhouse/Lever/Workday/Ashby/iCIMS/SmartRecruiters/
      generic markers); (2) Human-speed browser control — real `computer` clicks/typing
      with deliberate pacing; native-setter allowed for value entry only; **fetch/XHR/
      DOM-injection submission forbidden**; (3) Field mapping via the `question-log`
      lookup order + rotation-resume upload + default-cover handling; (4) Human-only-step
      detection (account/password/email-OTP/CAPTCHA/payment) → STOP + handoff;
      (5) Draft-save detection/fallback; (6) `handoff` record shape (matching the schema).
- [x] The file states the safety invariant verbatim: never create accounts, enter
      passwords, read email, or solve CAPTCHAs — always hand off to the human.
- [x] Existing example fixtures still validate; `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Mirror the style of `references/adapter-contract.md` and `references/question-log.md`.
Reuse — do not re-specify — the `question-log` lookup order for field resolution. The
`handoff.needs` enum is the join point interactive-apply reads to know what to ask the
user for. Keep the schema change minimal and backward-compatible (all new fields optional;
new statuses additive).

**Recommended Agent: opus + high** — core architecture and schema substrate that all
downstream tasks depend on; a wrong contract here compounds across every other task.

## Verification **[REQUIRED]**

- [x] `npm run check` passes (schema validity, fixtures, lint, format).
- [x] Hand-author a throwaway `jobs.json` fixture with a `needs_human` job carrying a
      `handoff` object and confirm it validates against `jobs.schema.json`; then remove it.
- [x] Re-read `custom-application.md` for the placeholder/ambiguity check: every section
      has concrete instructions, the safety invariant is present, and no "TBD" remains.