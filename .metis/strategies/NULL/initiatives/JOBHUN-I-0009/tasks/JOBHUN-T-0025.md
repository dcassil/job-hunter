---
id: check-email-status-skill-email
level: task
title: "check-email-status skill + email-status reference"
short_code: "JOBHUN-T-0025"
created_at: 2026-08-03T19:21:15+00:00
updated_at: 2026-08-03T19:25:02.098100+00:00
parent: JOBHUN-I-0009
blocked_by: []
archived: false

tags:
  - "#task"
  - "#phase/completed"


exit_criteria_met: false
strategy_id: NULL
initiative_id: JOBHUN-I-0009
---

# check-email-status skill + email-status reference

## Parent Initiative **[CONDITIONAL: Assigned Task]**

[[JOBHUN-I-0009]]

## Objective **[REQUIRED]**

Author the core of the feature: the `references/email-status.md` reference (classification
taxonomy, Gmail search-scoping recipe, job-matching rules, status→transition map,
read-only invariant) and the user-facing `check-email-status` skill that reads the inbox
in the browser, classifies mail, matches status messages to jobs, updates them through
`record-application`, and reports.

## Acceptance Criteria

## Acceptance Criteria

## Acceptance Criteria **[REQUIRED]**

- [x] `references/email-status.md` created with: (1) a seven-way classification taxonomy
      (`confirmation`, `interview`, `rejection`, `offer`, `recruiter-outreach`,
      `recommendation-alert`, `unrelated`) each with signal phrases/sender cues; (2) the
      Gmail search-scoping recipe (assemble tracked companies/recruiters from `jobs.json`
      + ATS/job sender domains + status phrases + a `newer_than` window, default 7 days);
      (3) job-matching rules (company/recruiter + role + sender domain; a confidence
      notion; what counts as ambiguous); (4) the status→transition table
      (interview→`interviewing`, rejection→`rejected`, offer→`offer`; confirmation of an
      already-`applied` job → note only, no transition); (5) the read-only invariant and
      the browser-now / API-later boundary.
- [x] `skills/check-email-status/SKILL.md` created (frontmatter `name` + `description`
      with triggers like "check my email for job status", "any updates from applications",
      "check application status emails"), a valid description under the length limit.
- [x] Skill gates on a valid `config.json` and a reachable, logged-in Gmail tab (reuse the
      browser-preflight approach); if either is missing, it explains and stops.
- [x] Skill builds a tightly scoped Gmail search per `email-status.md` (never enumerates
      the whole inbox), reads matches at human speed, and classifies each.
- [x] On a confident status match it calls `record-application` with the mapped transition
      and a dated note; on an ambiguous match or a disallowed transition it asks the user
      before changing anything; it never edits `jobs.json` directly.
- [x] Recommendation-alert emails change nothing; they are summarized with an offer to feed
      the postings to `find-jobs`.
- [x] Skill states the read-only invariant (never send/reply/draft/open-attachments/click-
      links) and reports important changes first, with the "email coverage is partial
      (LinkedIn/recruiter apps often confirm in-app)" caveat.
- [x] `npm run check` passes; the skill validates and appears in validation output.

## Implementation Notes **[CONDITIONAL: Technical Task]**

Model the orchestration on `interactive-apply` / `apply-to-jobs` (gates, browser preflight,
`record-application` as the sole writer). Keep classification/matching logic in the skill
but the taxonomy/recipes in `email-status.md` so they are tunable in one place. Isolate the
"read the inbox" step conceptually so a future Gmail-API/MCP adapter can replace browser
reading. Reading the user's own inbox here is user-invoked and read-only — state that
boundary explicitly. Use Gmail search-URL navigation (`#search/<query>`) and structured
page reads; do not walk the inbox.

**Recommended Agent: opus + high** — a new user-facing skill with non-trivial
classification, fuzzy job-matching, consequential status transitions, and a read-only
safety boundary; the reference it defines is load-bearing for correctness.

## Verification **[REQUIRED]**

- [x] Walk the skill against the real inbox state observed on 2026-08-03 (only Indeed/
      ZipRecruiter recommendation digests present): confirm it classifies them
      `recommendation-alert`, changes no job status, and offers them to `find-jobs`.
- [x] Reason through an interview-invite example: confirm it matches the applied job,
      transitions to `interviewing` via `record-application`, and reports it; and an
      ambiguous rejection: confirm it asks the user instead of guessing.
- [x] `npm run check` passes; `check-email-status` appears in `validate:skills` output.