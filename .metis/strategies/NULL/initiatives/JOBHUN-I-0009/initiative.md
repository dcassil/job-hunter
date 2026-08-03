---
id: email-based-application-status
level: initiative
title: "Email-based application status tracking"
short_code: "JOBHUN-I-0009"
created_at: 2026-08-03T19:21:15+00:00
updated_at: 2026-08-03T19:26:10.777348+00:00
parent: JOBHUN-V-0001
blocked_by: [JOBHUN-I-0004]
archived: false

tags:
  - "#initiative"
  - "#phase/completed"


exit_criteria_met: false
estimated_complexity: M
strategy_id: NULL
initiative_id: email-based-application-status
---

# Email-based application status tracking Initiative

## Context **[REQUIRED]**

Once the user has applied to jobs, updates arrive by email: application confirmations,
interview / next-step requests, rejections, offers, and recruiter outreach. Today the
plugin has no way to fold those into the pipeline — the user must read their inbox
manually and hand-update the list. We want a skill that reads the inbox (in the user's
logged-in browser), detects genuine status changes, updates `jobs.json` through the
existing single writer, and tells the user what actually matters.

Reality check from surveying the live inbox (last 3 days, 2026-08-03): the only
job-related mail present was **job-recommendation / alert digests** (Indeed "you may be a
good match", ZipRecruiter "jobs recommended for you") — no real application-status
messages yet. So the skill's hard problem is **classification**, not scraping: it must
separate true status changes from recommendation noise and unrelated mail, and it must
scope its search tightly because the inbox is very high volume (110k+). Many of the
user's applications were LinkedIn Easy Apply / recruiter-submitted, which often confirm
*inside LinkedIn* rather than by email, so email coverage is partial and the skill must
say so rather than imply "no email = no progress".

The user's decisions: (1) recommendation/alert emails are **ignored for status** but
**offered to `find-jobs`**; (2) on a real status change the skill **updates the list and
reports**, and **never sends, replies to, or drafts** any email. Browser interaction is
the mechanism "for now"; the read step is structured so a Gmail-API/MCP adapter could
later replace it.

## Goals & Non-Goals **[REQUIRED]**

**Goals:**
- Add a user-facing **`check-email-status`** skill that: gates on a valid working folder
  and a logged-in Gmail tab; builds a tightly scoped Gmail search (tracked companies /
  recruiters + ATS sender domains + status phrases + a time window); reads matching
  messages at human speed; classifies each; matches status messages to a job; updates the
  job via `record-application`; and reports important changes.
- Add a **`references/email-status.md`** reference holding the classification taxonomy,
  the Gmail search-scoping recipe, the job-matching rules, and the status→transition
  mapping — so both the skill and future tuning read one source.
- Treat recommendation/alert emails as **non-status**: summarize them and **offer** to
  feed the postings to `find-jobs` (never auto-add).
- Keep the operation **read-only on the inbox** (never send / reply / draft / open
  attachments / click email links) and **write-only to the list** (only via
  `record-application`). Confirm with the user before any status change on an ambiguous
  match or an unusual transition.

**Non-Goals:**
- No sending, replying to, or drafting email; no acting on links or attachments in mail.
- No automatic list changes on uncertain matches — those are confirmed with the user.
- No Gmail-API / MCP integration yet (browser only for now; keep the read step swappable).
- No calendar scheduling of interviews (report the request; scheduling is future work).

## Requirements **[CONDITIONAL: Requirements-Heavy Initiative]**

### System Requirements

- **Functional Requirements:**
  - REQ-001: `check-email-status` MUST gate on a valid `config.json` and a reachable,
    logged-in Gmail tab; if either is missing, explain and stop (no guessing).
  - REQ-002: It MUST scope its Gmail search tightly (never enumerate the whole inbox):
    combine tracked-job companies/recruiters, ATS/job sender domains, status phrases, and
    a `newer_than` window (default 7 days, user-overridable).
  - REQ-003: It MUST classify each matched message into exactly one of: `confirmation`,
    `interview`, `rejection`, `offer`, `recruiter-outreach`, `recommendation-alert`,
    `unrelated`.
  - REQ-004: It MUST match a status message to a job in `jobs.json` by company/recruiter +
    role + sender domain; on a confident match it applies the mapped transition via
    `record-application` (interview→`interviewing`, rejection→`rejected`, offer→`offer`),
    adding a dated note. On an ambiguous match or a transition the status graph disallows,
    it MUST ask the user before changing anything.
  - REQ-005: Recommendation/alert emails MUST NOT change the list; the skill summarizes
    them and offers to pass the postings to `find-jobs`.
  - REQ-006: The skill MUST NOT send, reply to, or draft any email, open attachments, or
    click links in messages. It only reads.
  - REQ-007: All list writes go through `record-application`; the skill never edits
    `jobs.json` / `jobs.md` directly.
- **Non-Functional Requirements:**
  - NFR-001: Human-speed browser reading; no bulk/api scraping of the mailbox.
  - NFR-002: The read step is isolated behind the `email-status.md` recipe so a future
    Gmail-API/MCP adapter can replace browser reading without touching classification /
    matching logic.
  - NFR-003: `npm run check` stays green; the new skill validates and registers.

## Use Cases **[CONDITIONAL: User-Facing Initiative]**

### Use Case 1: Interview invite arrives
- **Actor:** the job seeker.
- **Scenario:** a recruiter emails "we'd like to schedule a call". The skill classifies it
  `interview`, matches it to the `applied` job, transitions it to `interviewing` via
  `record-application` with a note, and reports it at the top of the summary.
- **Expected Outcome:** the pipeline reflects the interview; the user is told clearly.

### Use Case 2: Recommendation digest
- **Actor:** the job seeker.
- **Scenario:** a ZipRecruiter "jobs recommended for you" digest is in the window.
- **Expected Outcome:** classified `recommendation-alert`; no list change; summarized with
  an offer to feed the postings to `find-jobs`.

### Use Case 3: Ambiguous rejection
- **Actor:** the job seeker.
- **Scenario:** a generic "thank you for your interest, we've moved forward with other
  candidates" from a sender that could map to two applied jobs.
- **Expected Outcome:** the skill does NOT guess; it shows the email and the candidate
  matches and asks the user which job (if any) to mark `rejected`.

## Detailed Design **[REQUIRED]**

Add `skills/check-email-status/SKILL.md` (user-facing orchestrator) and
`references/email-status.md` (the taxonomy + recipes). The skill: gate → open/confirm
Gmail (browser preflight) → build a scoped search from `jobs.json`'s tracked companies
(statuses `applied` / `interviewing` / `needs_human` / `account_required`) plus ATS/job
sender domains and status phrases, over `newer_than:<window>` → read each result at human
speed → classify per `email-status.md` → match to a job → on a confident status change
call `record-application` (mapped transition + dated note), else ask the user →
recommendation-alerts are summarized and offered to `find-jobs` → report, important
changes first, with the "email coverage is partial" caveat. Read-only throughout.

`references/email-status.md` holds: the seven-way classification taxonomy with signal
phrases; the Gmail search-scoping recipe (how to assemble company/domain/phrase/window
terms); the job-matching rules (company/recruiter + role + sender domain; confidence
threshold; what "ambiguous" means); and the status→transition table
(interview→`interviewing`, rejection→`rejected`, offer→`offer`; confirmation of an already
`applied` job → note only). It also states the read-only invariant and the
browser-now/api-later boundary.

## Alternatives Considered **[REQUIRED]**

- **Gmail API / MCP instead of the browser.** Deferred, not chosen now — the user asked
  for browser interaction "for now"; the design keeps the read step swappable so an API
  adapter can drop in later without reworking classification/matching.
- **Auto-apply every detected transition without confirmation.** Rejected — email→job
  matching is fuzzy and status changes are consequential; confident matches update
  automatically, but ambiguous ones are confirmed with the user.
- **Fold recommendation postings straight into `jobs.json`.** Rejected — that conflates
  discovery with status and bypasses `find-jobs`' dedupe/registry; instead they are
  offered to `find-jobs`.
- **Walk the inbox chronologically.** Rejected — 110k+ messages; tight search-scoping by
  company/domain/phrase/window is the only workable approach.
- **Let the skill reply/draft to interview invites.** Rejected per the user — read-only on
  the inbox; the user handles all outbound.

## Implementation Plan **[REQUIRED]**

1. **Skill + reference (JOBHUN-T-0025, opus + high):** author `references/email-status.md`
   (taxonomy, search-scoping, matching rules, transition map, read-only invariant) and
   `skills/check-email-status/SKILL.md` (the browser-driven, read-only orchestrator that
   classifies, matches, updates via `record-application`, and reports).
2. **Wiring, docs, ship (JOBHUN-T-0026, opus + medium):** README/AGENTS/setup mentions,
   the "offer to feed find-jobs" hand-off wording, version bump, `npm run check` green,
   skill registration.

Depends on JOBHUN-I-0004 (application subsystem / `record-application`). T-0025 blocks
T-0026.