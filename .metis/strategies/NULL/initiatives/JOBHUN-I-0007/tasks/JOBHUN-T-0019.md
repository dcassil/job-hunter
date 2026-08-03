---
id: record-application-question-log
level: task
title: "record-application + question-log support for handoff/needs-human"
short_code: "JOBHUN-T-0019"
created_at: 2026-08-01T17:37:16+00:00
updated_at: 2026-08-01T21:56:55.179267+00:00
parent: JOBHUN-I-0007
blocked_by: [JOBHUN-T-0018]
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0007
---

# record-application + question-log support for handoff/needs-human

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0007]]

## Objective **[REQUIRED]**

Make `record-application` — the single writer of pipeline state — able to persist the new
`needs_human` / `account_required` statuses and the `handoff` object, and confirm the
`question-log` reference already covers custom (non-Easy-Apply) form fields so no parallel
storage is invented.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [x] `record-application` accepts and validates transitions into `needs_human` and
      `account_required` (from `new`), and writes an accompanying `handoff` object when
      provided, keeping `jobs.json` valid against the extended schema.
- [x] `record-application` remains the ONLY writer of `status`, `handoff`, `resume_used`,
      `cover_used`, `applied_at`; it regenerates `jobs.md` including the new states.
- [x] `jobs.md` mirror renders a distinct, human-scannable section (or column) for
      `needs_human` / `account_required` jobs showing the blocking reason and URL.
- [x] `references/question-log.md` explicitly states it applies to custom/ATS applications
      too (same lookup/append/answer rules), so custom forms reuse it rather than a new
      store. Update wording if needed.
- [x] `npm run check` passes.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Extend the existing `record-application` skill doc and its transition table; do not create
a new writer. Follow the transition-validation pattern already used for `new → applied`.
The `handoff` payload comes from the custom-application procedure (T-0018 shape). Keep the
`jobs.md` generator changes small and consistent with the current format.

**Recommended Agent: opus + medium** — substantive change to the sole state-writer and its
transition rules across a couple of files, but it follows an established pattern from
T-0018's contract.

## Verification **[REQUIRED]**

- [x] Drive `record-application` (per its documented interface) to set a job `needs_human`
      with a `handoff` object; confirm `jobs.json` validates and `jobs.md` shows it.
- [x] Confirm no other skill writes `status`/`handoff` (grep the skills for direct
      `jobs.json` writes; only `record-application` and `add-job-to-list` touch it).
- [x] `npm run check` passes.