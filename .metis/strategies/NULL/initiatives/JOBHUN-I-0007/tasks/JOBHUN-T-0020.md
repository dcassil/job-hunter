---
id: apply-to-jobs-custom-external
level: task
title: "apply-to-jobs custom/external batch route with handoff"
short_code: "JOBHUN-T-0020"
created_at: 2026-08-01T17:37:16+00:00
updated_at: 2026-08-01T21:58:59.005100+00:00
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

# apply-to-jobs custom/external batch route with handoff

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0007]]

## Objective **[REQUIRED]**

Extend the `apply-to-jobs` orchestrator so an unattended batch can drive external / ATS
applications (not just LinkedIn Easy Apply): fill what it can via the custom-application
procedure, and on any human-only step or unknown question, save a draft if possible, log a
`handoff`, and keep going — so one blocked application never stalls the run.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [x] `apply-to-jobs` branches per job: Easy Apply → existing flow unchanged; external/ATS
      → follow `references/custom-application.md`.
- [x] For a custom job it fills every field resolvable from `profile.json`/question-log at
      human speed and attaches the rotation resume (rotation pointer advances only on a
      confirmed submit, consistent with `rotation.md`).
- [x] On a human-only step (account/password/email-confirm/CAPTCHA/payment) OR an unknown
      question: it does NOT guess and does NOT submit; it saves a draft if the ATS supports
      it, calls `record-application` to set `needs_human` + write the `handoff`
      (`blocking`, `needs[]`, `application_url`, `draft_saved`, `filled_through`), and
      continues to the next job.
- [x] A site requiring an account before the form is viewable → `record-application` sets
      `account_required` (with URL); the job is skipped, not signed-up-for.
- [x] The end-of-run summary lists a **handoff queue**: each needs-human / account-required
      job with company, role, blocking reason, and URL.
- [x] The skill restates the safety invariant (no account creation / password / email /
      CAPTCHA) and the human-speed-only rule.
- [x] `npm run check` passes; skill validates.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Keep the Easy Apply path byte-for-byte where possible; add the branch and delegate custom
mechanics to `custom-application.md` rather than inlining them. Reuse the existing
defensive per-job boundary ("one failure never aborts the run"). Do not write `jobs.json`
directly — route all state through `record-application`.

**Recommended Agent: opus + medium** — integration across an existing orchestrator plus the
new reference and writer; non-trivial but follows the established apply-loop pattern and
the T-0018 contract.

## Verification **[REQUIRED]**

- [x] Dry-run reasoning walkthrough (or a live run against 1–2 external postings) showing:
      a Greenhouse-style job filled then handed off at the account step with a `handoff`
      recorded; an account-gated site logged `account_required`; the batch continuing past
      both.
- [x] Confirm the run summary renders the handoff queue with URLs.
- [x] `npm run check` passes.